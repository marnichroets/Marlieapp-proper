import asyncio
import base64
import json
import os
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
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


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


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
