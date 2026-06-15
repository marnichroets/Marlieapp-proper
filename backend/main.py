import asyncio
import base64
import json
import os
import sqlite3
import threading
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI, OpenAIError


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DEFAULT_MODEL = "gpt-4o-mini"

MATCH_TEMPLATE: dict[str, Any] = {
    "commonName": "",
    "afrikaansName": "",
    "scientificName": "",
    "confidence": 0,
    "whyThisBird": "",
    "colours": "",
    "size": "",
    "habitat": "",
    "diet": "",
    "whereFoundInSouthAfrica": "",
    "funFacts": [],
    "cutePersonalityLine": "",
    "soundDescription": "",
    "similarBirds": [],
}


app = FastAPI(title="Marlie Bird API")


# Known production + dev origins, allowed even if FRONTEND_URL is unset or
# incomplete. This prevents the frontend silently falling back to the demo
# result because of a CORS block.
DEFAULT_ALLOWED_ORIGINS = [
    "https://pooksbooks.co.za",
    "https://www.pooksbooks.co.za",
    "https://marlieapp-proper.vercel.app",
    "http://localhost:5173",
    "http://localhost:4173",
]


def get_allowed_origins() -> list[str]:
    frontend_url = os.getenv("FRONTEND_URL", "")
    origins = list(DEFAULT_ALLOWED_ORIGINS)

    for origin in frontend_url.split(","):
        cleaned_origin = origin.strip().rstrip("/")
        if cleaned_origin and cleaned_origin not in origins:
            origins.append(cleaned_origin)

    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    # Also allow any Vercel preview/production deploy URL.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---- Bird Battles: shared game sessions + all-time leaderboard ---------------
# Pooks and Marnich play on different devices, so scores and the leaderboard
# must live on the server, keyed by the 4-digit session code they both enter.
# A tiny SQLite database keeps it persistent across reloads. Point GAMES_DB_PATH
# at a Railway volume to keep it across redeploys too.
GAMES_DB_PATH = os.getenv(
    "GAMES_DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "marlie_games.db"),
)
_db_lock = threading.Lock()

VALID_PLAYERS = {"pooks", "marnich"}
VALID_GAMES = {"quiz", "snap", "bluff"}

# ---- Cross-device player state ----------------------------------------------
# Each account's full app state (coins, collection, Tweety, inbox, intro-seen,
# egg choice — everything) is saved here as a JSON blob keyed by account name, so
# logging in on any device restores the exact same state. localStorage on the
# client is just an offline cache; this table is the source of truth.
VALID_ACCOUNTS = {"pooks", "marnich"}
# Safety valve. Sighting photos are downscaled client-side to a few hundred KB,
# so a full state stays well under this; anything larger is rejected rather than
# bloating the database.
MAX_STATE_BYTES = 9 * 1024 * 1024


def _db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(GAMES_DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_games_db() -> None:
    with _db_lock, _db_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                pooks_wins INTEGER NOT NULL DEFAULT 0,
                marnich_wins INTEGER NOT NULL DEFAULT 0,
                draws INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.execute(
            "INSERT OR IGNORE INTO leaderboard (id, pooks_wins, marnich_wins, draws)"
            " VALUES (1, 0, 0, 0)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS game_submissions (
                code TEXT NOT NULL,
                game TEXT NOT NULL,
                player TEXT NOT NULL,
                score INTEGER NOT NULL,
                time_ms INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (code, game, player)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS game_results (
                code TEXT NOT NULL,
                game TEXT NOT NULL,
                winner TEXT NOT NULL,
                resolved_at TEXT NOT NULL,
                PRIMARY KEY (code, game)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS player_state (
                account TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                version INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_leaderboard(conn: sqlite3.Connection) -> dict[str, int]:
    row = conn.execute(
        "SELECT pooks_wins, marnich_wins, draws FROM leaderboard WHERE id = 1"
    ).fetchone()
    if not row:
        return {"pooksWins": 0, "marnichWins": 0, "draws": 0}
    return {
        "pooksWins": row["pooks_wins"],
        "marnichWins": row["marnich_wins"],
        "draws": row["draws"],
    }


def _decide_winner(pooks: sqlite3.Row, marnich: sqlite3.Row) -> str:
    """Higher score wins; ties broken by the faster total time; else a draw."""
    if pooks["score"] > marnich["score"]:
        return "pooks"
    if marnich["score"] > pooks["score"]:
        return "marnich"
    if pooks["time_ms"] < marnich["time_ms"]:
        return "pooks"
    if marnich["time_ms"] < pooks["time_ms"]:
        return "marnich"
    return "draw"


def _player_payload(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {"score": row["score"], "timeMs": row["time_ms"]}


def _session_state(conn: sqlite3.Connection, code: str, game: str) -> dict[str, Any]:
    """Current state of one (code, game): waiting or done, plus the leaderboard.

    Resolution is idempotent — the winner is computed and the leaderboard bumped
    exactly once, the first time both players have submitted.
    """
    subs = {
        row["player"]: row
        for row in conn.execute(
            "SELECT player, score, time_ms FROM game_submissions"
            " WHERE code = ? AND game = ?",
            (code, game),
        ).fetchall()
    }
    pooks = subs.get("pooks")
    marnich = subs.get("marnich")

    result = conn.execute(
        "SELECT winner FROM game_results WHERE code = ? AND game = ?",
        (code, game),
    ).fetchone()

    if result is None and pooks is not None and marnich is not None:
        winner = _decide_winner(pooks, marnich)
        # Insert the result first; only bump the leaderboard if THIS call is the
        # one that actually created it (guards against a double-count race).
        cursor = conn.execute(
            "INSERT OR IGNORE INTO game_results (code, game, winner, resolved_at)"
            " VALUES (?, ?, ?, ?)",
            (code, game, winner, _now_iso()),
        )
        if cursor.rowcount == 1:
            column = {
                "pooks": "pooks_wins",
                "marnich": "marnich_wins",
                "draws": "draws",
            }["draws" if winner == "draw" else winner]
            conn.execute(
                f"UPDATE leaderboard SET {column} = {column} + 1 WHERE id = 1"
            )
        conn.commit()
        result = conn.execute(
            "SELECT winner FROM game_results WHERE code = ? AND game = ?",
            (code, game),
        ).fetchone()

    leaderboard = _read_leaderboard(conn)
    if result is not None:
        return {
            "status": "done",
            "code": code,
            "game": game,
            "winner": result["winner"],
            "pooks": _player_payload(pooks),
            "marnich": _player_payload(marnich),
            "leaderboard": leaderboard,
        }
    return {
        "status": "waiting",
        "code": code,
        "game": game,
        "pooks": _player_payload(pooks),
        "marnich": _player_payload(marnich),
        "leaderboard": leaderboard,
    }


class GameSubmission(BaseModel):
    code: str = ""
    game: str = ""
    player: str = ""
    score: int = 0
    timeMs: int = 0


def _normalize_code(code: str) -> str:
    cleaned = "".join(ch for ch in str(code or "") if ch.isdigit())[:4]
    if len(cleaned) != 4:
        raise HTTPException(status_code=400, detail="A 4-digit session code is required.")
    return cleaned


def _submit_game(payload: GameSubmission) -> dict[str, Any]:
    code = _normalize_code(payload.code)
    game = str(payload.game or "").strip().lower()
    player = str(payload.player or "").strip().lower()
    if game not in VALID_GAMES:
        raise HTTPException(status_code=400, detail="Unknown game.")
    if player not in VALID_PLAYERS:
        raise HTTPException(status_code=400, detail="Unknown player.")

    score = max(0, int(payload.score or 0))
    time_ms = max(0, int(payload.timeMs or 0))

    with _db_lock, _db_connect() as conn:
        # First submission for this (code, game, player) wins — never overwrite,
        # so a replayed request can't change a locked-in score.
        conn.execute(
            "INSERT OR IGNORE INTO game_submissions"
            " (code, game, player, score, time_ms, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (code, game, player, score, time_ms, _now_iso()),
        )
        conn.commit()
        return _session_state(conn, code, game)


def _get_state(code: str, game: str) -> dict[str, Any]:
    norm_code = _normalize_code(code)
    norm_game = str(game or "").strip().lower()
    if norm_game not in VALID_GAMES:
        raise HTTPException(status_code=400, detail="Unknown game.")
    with _db_lock, _db_connect() as conn:
        return _session_state(conn, norm_code, norm_game)


def _get_leaderboard() -> dict[str, int]:
    with _db_lock, _db_connect() as conn:
        return _read_leaderboard(conn)


# ---- Player state load / save ------------------------------------------------
class StateSave(BaseModel):
    account: str = ""
    state: dict[str, Any] = {}
    version: int = 0


def _normalize_account(account: str) -> str:
    cleaned = str(account or "").strip().lower()
    if cleaned not in VALID_ACCOUNTS:
        raise HTTPException(status_code=400, detail="Unknown account.")
    return cleaned


def _load_player_state(account: str) -> dict[str, Any]:
    acct = _normalize_account(account)
    with _db_lock, _db_connect() as conn:
        row = conn.execute(
            "SELECT state, version, updated_at FROM player_state WHERE account = ?",
            (acct,),
        ).fetchone()
    if row is None:
        return {"account": acct, "state": None, "version": 0, "updatedAt": None}
    try:
        state = json.loads(row["state"])
    except (json.JSONDecodeError, TypeError):
        state = None
    return {
        "account": acct,
        "state": state,
        "version": row["version"],
        "updatedAt": row["updated_at"],
    }


def _save_player_state(payload: StateSave) -> dict[str, Any]:
    acct = _normalize_account(payload.account)
    if not isinstance(payload.state, dict):
        raise HTTPException(status_code=400, detail="State must be an object.")

    serialized = json.dumps(payload.state, separators=(",", ":"))
    if len(serialized.encode("utf-8")) > MAX_STATE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Saved state is too large. Try removing a few old photos.",
        )

    now = _now_iso()
    with _db_lock, _db_connect() as conn:
        row = conn.execute(
            "SELECT version FROM player_state WHERE account = ?", (acct,)
        ).fetchone()
        # Last-write-wins: bump the version monotonically so other devices can
        # tell their cached copy is stale on their next load.
        new_version = (row["version"] if row else 0) + 1
        conn.execute(
            "INSERT INTO player_state (account, state, version, updated_at)"
            " VALUES (?, ?, ?, ?)"
            " ON CONFLICT(account) DO UPDATE SET"
            " state = excluded.state, version = excluded.version,"
            " updated_at = excluded.updated_at",
            (acct, serialized, new_version, now),
        )
        conn.commit()
    return {"ok": True, "version": new_version, "updatedAt": now}


def _delete_player_state(account: str) -> dict[str, Any]:
    """Remove an account's saved state entirely so GET /api/state returns a null
    state again (not an empty object). Needed to undo a bad/test save before a
    real first sync, since clients treat any present state as authoritative."""
    acct = _normalize_account(account)
    with _db_lock, _db_connect() as conn:
        cur = conn.execute("DELETE FROM player_state WHERE account = ?", (acct,))
        conn.commit()
        removed = cur.rowcount
    return {"ok": True, "account": acct, "removed": removed}


class StateImport(BaseModel):
    accounts: dict[str, Any] = {}


def _export_all_states() -> dict[str, Any]:
    """Dump every account's stored state in a single payload. Grab this (and save
    the JSON somewhere) before risky changes — e.g. switching the database over to
    a Railway volume — then restore it later via POST /api/state/import."""
    accounts = {acct: _load_player_state(acct) for acct in sorted(VALID_ACCOUNTS)}
    return {"exportedAt": _now_iso(), "accounts": accounts}


def _import_all_states(payload: StateImport) -> dict[str, Any]:
    """Restore accounts from an /api/state/export dump. Accepts either the export
    shape ({account: {state: {...}}}) or a bare {account: {...state}} map; unknown
    accounts and empty (never-saved) states are skipped. Each restore is a normal
    save, so versions bump rather than being forced backwards."""
    restored = []
    for acct, entry in (payload.accounts or {}).items():
        cleaned = str(acct or "").strip().lower()
        if cleaned not in VALID_ACCOUNTS:
            continue
        state = entry.get("state") if isinstance(entry, dict) and "state" in entry else entry
        if not isinstance(state, dict):
            continue
        result = _save_player_state(StateSave(account=cleaned, state=state, version=0))
        restored.append({"account": cleaned, "version": result["version"]})
    return {"ok": True, "restored": restored}


# Create the tables at import time so the database is ready before the first
# request, regardless of startup-event handling.
init_games_db()

# Surface the resolved database location at startup so the Railway deploy logs
# make it obvious whether we're writing to the persistent volume (e.g. a path
# under /data) or the ephemeral container filesystem that resets on redeploy.
print(f"[marlie] GAMES_DB_PATH resolved to: {os.path.abspath(GAMES_DB_PATH)}", flush=True)


@app.post("/api/games/submit")
async def games_submit(payload: GameSubmission) -> dict[str, Any]:
    return await asyncio.to_thread(_submit_game, payload)


@app.get("/api/games/state")
async def games_state(code: str, game: str) -> dict[str, Any]:
    return await asyncio.to_thread(_get_state, code, game)


@app.get("/api/games/leaderboard")
async def games_leaderboard() -> dict[str, int]:
    return await asyncio.to_thread(_get_leaderboard)


@app.get("/api/state")
async def get_state(account: str) -> dict[str, Any]:
    return await asyncio.to_thread(_load_player_state, account)


@app.post("/api/state")
async def post_state(payload: StateSave) -> dict[str, Any]:
    return await asyncio.to_thread(_save_player_state, payload)


@app.delete("/api/state")
async def delete_state(account: str) -> dict[str, Any]:
    return await asyncio.to_thread(_delete_player_state, account)


@app.get("/api/state/export")
async def export_state() -> dict[str, Any]:
    return await asyncio.to_thread(_export_all_states)


@app.post("/api/state/import")
async def import_state(payload: StateImport) -> dict[str, Any]:
    return await asyncio.to_thread(_import_all_states, payload)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# ---- Email notifications to Marnich -----------------------------------------
class NotifyPayload(BaseModel):
    event: str = ""
    birdName: str = ""
    giftName: str = ""
    challenge: str = ""
    count: int = 0
    subject: str = ""
    body: str = ""


def build_notification(payload: NotifyPayload) -> tuple[str, str]:
    """Turn an event into a warm, simple subject + body."""
    if payload.subject and payload.body:
        return payload.subject, payload.body

    event = (payload.event or "").strip().lower()
    bird = (payload.birdName or "a bird").strip()
    gift = (payload.giftName or "a surprise").strip()

    if event == "spotted":
        return (
            f"Pooks spotted a {bird}! 🐦",
            f"Your Pooks just spotted and logged a {bird} in her Bird Journey. 💛",
        )
    if event == "challenge":
        return (
            "Pooks completed today's challenge! ✅",
            "Your Pooks completed today's daily bird challenge. So proud of her. 💛",
        )
    if event == "gift":
        return (
            f"Pooks unlocked: {gift} 🎁",
            f"Your Pooks just unlocked a gift: {gift}. Time for a little surprise! 💛",
        )
    if event == "milestone":
        n = payload.count or 5
        return (
            f"Pooks found her {n}th bird! 🎉",
            f"Big moment — your Pooks has now spotted {n} birds on her journey. 💛",
        )

    return (
        "A little update from Pooks' Bird Journey 🐦",
        "Something sweet just happened in Pooks' bird app. 💛",
    )


def send_email(subject: str, body: str) -> dict[str, Any]:
    token = os.getenv("POSTMARK_SERVER_TOKEN", "").strip()
    to_email = os.getenv("NOTIFY_TO_EMAIL", "marnichr@gmail.com").strip()
    from_email = os.getenv("NOTIFY_FROM_EMAIL", "").strip()

    # Never error the app if email isn't configured — just report it.
    if not token or not from_email:
        return {"sent": False, "reason": "email not configured"}

    data = json.dumps(
        {
            "From": from_email,
            "To": to_email,
            "Subject": subject,
            "TextBody": body,
            "MessageStream": os.getenv("POSTMARK_MESSAGE_STREAM", "outbound"),
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        "https://api.postmarkapp.com/email",
        data=data,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": token,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
        return {"sent": True}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:300]
        return {"sent": False, "reason": f"postmark {exc.code}: {detail}"}
    except Exception as exc:  # noqa: BLE001 - best effort, never crash the app
        return {"sent": False, "reason": str(exc)}


@app.post("/api/notify")
async def notify(payload: NotifyPayload) -> dict[str, Any]:
    subject, body = build_notification(payload)
    return await asyncio.to_thread(send_email, subject, body)


@app.post("/api/identify-bird")
async def identify_bird(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured on the server.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Uploaded image is too large. Maximum size is 10 MB.",
        )

    image_data_url = build_image_data_url(image_bytes, file.content_type)
    return await asyncio.to_thread(identify_bird_with_openai, api_key, image_data_url)


@app.post("/api/validate-challenge")
async def validate_challenge(
    challenge: str = Form(...),
    description: str = Form(""),
    file: UploadFile | None = File(None),
) -> dict[str, Any]:
    challenge_text = challenge.strip()
    if not challenge_text:
        raise HTTPException(status_code=400, detail="A challenge is required.")

    description_text = (description or "").strip()
    has_photo = file is not None and bool(file.content_type)

    if not has_photo and not description_text:
        raise HTTPException(
            status_code=400,
            detail="Provide a photo or a written description.",
        )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured on the server.",
        )

    image_data_url = ""
    if has_photo:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Please upload an image file.")
        image_bytes = await file.read()
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Uploaded image is too large. Maximum size is 10 MB.",
            )
        if image_bytes:
            image_data_url = build_image_data_url(image_bytes, file.content_type)

    return await asyncio.to_thread(
        validate_challenge_with_openai,
        api_key,
        challenge_text,
        description_text,
        image_data_url,
    )


def validate_challenge_with_openai(
    api_key: str,
    challenge_text: str,
    description_text: str,
    image_data_url: str,
) -> dict[str, Any]:
    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_VISION_MODEL", DEFAULT_MODEL)

    instruction = (
        "You are the warm, encouraging 'Bird Council' for a cute birdwatching app. "
        "Decide whether the submission reasonably matches the challenge. Be generous "
        "and kind — this is meant to be fun, not strict — but the submission must be a "
        "genuine attempt that plausibly relates to the challenge. "
        f'Challenge: "{challenge_text}". '
        "Reply with ONLY valid JSON of the form "
        '{"verdict": "YES" or "NO", "reason": "one short friendly sentence"}.'
    )

    user_content: list[dict[str, Any]] = [{"type": "text", "text": instruction}]
    if description_text:
        user_content.append(
            {"type": "text", "text": f"Her description: {description_text}"}
        )
    if image_data_url:
        user_content.append(
            {
                "type": "image_url",
                "image_url": {"url": image_data_url, "detail": "low"},
            }
        )

    try:
        response = client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": user_content}],
            max_tokens=200,
        )
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502,
            detail="Challenge validation failed. Please try again.",
        ) from exc

    content = response.choices[0].message.content or ""
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {}

    verdict_raw = str(parsed.get("verdict", "")).strip().lower()
    verdict = "YES" if verdict_raw.startswith("y") else "NO"
    reason = str(parsed.get("reason", "")).strip()

    return {"verdict": verdict, "reason": reason}


def build_image_data_url(image_bytes: bytes, content_type: str) -> str:
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{content_type};base64,{encoded_image}"


def identify_bird_with_openai(api_key: str, image_data_url: str) -> dict[str, Any]:
    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_VISION_MODEL", DEFAULT_MODEL)

    try:
        response = client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert South African ornithologist powering the "
                        "bird-identification feature of a South African birding app. "
                        "Only ever suggest bird species that genuinely occur in South "
                        "Africa. Work through the most OBVIOUS physical features FIRST and "
                        "let them rule out impossible matches: overall body size, body "
                        "shape, beak shape and length, leg length, dominant colours and "
                        "markings, and posture. A large brown bird with a long down-curved "
                        "beak and long legs (such as an ibis) cannot be a small upright "
                        "garden songbird (such as a robin-chat) — never confuse birds with "
                        "clearly different body types, sizes or beak shapes. Include "
                        "Afrikaans names where commonly known, and do not invent facts. Be "
                        "genuinely honest about uncertainty: it is far better to admit you "
                        "are unsure than to sound confident and be wrong, and you must "
                        "never overstate confidence.\n\n"
                        "For tricky look-alike groups, focus on the single KEY feature that "
                        "separates them:\n"
                        "- SA doves & pigeons: Laughing Dove has a spotted rufous neck patch "
                        "and pinkish tones with no collar; Cape Turtle (Ring-necked) Dove "
                        "has a neat black half-collar on the hindneck and a pale grey body; "
                        "Red-eyed Dove is larger and darker with a broad black hindneck "
                        "collar, a dark red eye and a pinkish-grey breast; Rock/Feral Pigeon "
                        "has two black wing-bars; Speckled Pigeon has white-speckled wings "
                        "and bare red eye-skin. Use collar, neck-spotting, size and eye to "
                        "decide.\n"
                        "- Sparrows: note crown colour, presence of a black bib (House "
                        "Sparrow male) versus a chestnut head-stripe (Cape Sparrow) versus a "
                        "plain grey head (Southern Grey-headed Sparrow).\n"
                        "- Weavers: note the face-mask shape, eye colour and back colour; "
                        "compare Southern Masked, Village and Cape Weaver.\n"
                        "Always state the one decisive feature you actually saw."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Identify the bird in this photo. Only suggest South "
                                "African bird species. Consider the bird's size, shape, "
                                "beak, colour, and posture carefully before deciding, and "
                                "make sure your top match is physically consistent with "
                                "those features (a large, long-legged, curved-beak bird is "
                                "not a tiny garden robin). Return the top 3 most likely SA "
                                "species, ordered from most to least likely.\n\n"
                                "For EVERY match, the whyThisBird field must name the single "
                                "KEY distinguishing feature you actually see in THIS photo "
                                "that points to that species, in one clear sentence, for "
                                "example: 'The spotted rufous neck patch and pink-grey tones "
                                "match the Laughing Dove' or 'The neat black half-collar on "
                                "the hindneck matches the Cape Turtle Dove'. Never leave "
                                "whyThisBird vague or empty.\n\n"
                                "Be honest about confidence — use a number from 0 to 100 "
                                "that genuinely reflects how sure you are. Keep it low "
                                "(below 60) when the image is unclear, distant, blurry, "
                                "partially hidden, or the key features are not clearly "
                                "visible, and do not force a single confident answer. Set "
                                "uncertain to true whenever the best match is below 70 "
                                "confidence, or the image is unclear, too distant, "
                                "partially obstructed, or not a bird. Use empty strings or "
                                "empty arrays where a field is genuinely unknown.\n\n"
                                "Return only valid JSON with exactly this shape:\n\n"
                                "{\n"
                                '  "uncertain": false,\n'
                                '  "topMatches": [\n'
                                "    {\n"
                                '      "commonName": "",\n'
                                '      "afrikaansName": "",\n'
                                '      "scientificName": "",\n'
                                '      "confidence": 0,\n'
                                '      "whyThisBird": "",\n'
                                '      "colours": "",\n'
                                '      "size": "",\n'
                                '      "habitat": "",\n'
                                '      "diet": "",\n'
                                '      "whereFoundInSouthAfrica": "",\n'
                                '      "funFacts": [],\n'
                                '      "cutePersonalityLine": "",\n'
                                '      "soundDescription": "",\n'
                                '      "similarBirds": []\n'
                                "    }\n"
                                "  ]\n"
                                "}"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_url,
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            max_tokens=1200,
            # Lower temperature for steadier, less speculative identifications.
            temperature=0.2,
        )
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502,
            detail="Bird identification failed. Please try again.",
        ) from exc

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(
            status_code=502,
            detail="Bird identification returned an empty response.",
        )

    try:
        parsed_response = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="Bird identification returned invalid JSON.",
        ) from exc

    if not isinstance(parsed_response, dict):
        raise HTTPException(
            status_code=502,
            detail="Bird identification returned an unexpected JSON shape.",
        )

    return normalize_identification_response(parsed_response)


def normalize_identification_response(data: dict[str, Any]) -> dict[str, Any]:
    matches = data.get("topMatches", [])
    if not isinstance(matches, list):
        matches = []

    normalized_matches = []
    for match in matches[:3]:
        if not isinstance(match, dict):
            continue

        normalized_match = MATCH_TEMPLATE.copy()
        normalized_match.update(
            {
                key: normalize_field(key, match.get(key, default_value))
                for key, default_value in MATCH_TEMPLATE.items()
            }
        )
        normalized_matches.append(normalized_match)

    return {
        "uncertain": bool(data.get("uncertain", not normalized_matches)),
        "topMatches": normalized_matches,
    }


def normalize_field(key: str, value: Any) -> Any:
    if key == "confidence":
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return 0

        return max(0, min(100, round(confidence)))

    if key in {"funFacts", "similarBirds"}:
        if not isinstance(value, list):
            return []

        return [str(item) for item in value if item is not None]

    if value is None:
        return ""

    return str(value)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
