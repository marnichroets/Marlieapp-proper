"""Isolated bird SOUND-ID microservice.

Runs on its OWN Railway service/container, completely separate from the main
backend that holds Pooks' live state-sync and photo ID. If BirdNET runs out of
memory or crashes here, it can only affect THIS service — her working features
are in a different container and are never in the blast radius.

Exposes only:
  GET  /health, /api/health         — liveness
  POST /api/identify-bird-audio     — same {uncertain, topMatches} contract as
                                       the photo identifier, so the frontend's
                                       existing flow handles it unchanged.
"""

import asyncio
import os
import tempfile
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from birdnet_audio import map_detections_to_matches

AUDIO_MAX_UPLOAD_BYTES = 16 * 1024 * 1024

ALLOWED_ORIGINS = [
    "https://pooksbooks.co.za",
    "https://www.pooksbooks.co.za",
    "https://marlieapp-proper.vercel.app",
    "http://localhost:5173",
    "http://localhost:4173",
]

app = FastAPI(title="Marlie Sound ID")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# The BirdNET analyzer is heavy to construct, so build it once on first use and
# reuse it. Constructed lazily (not at import) so the process always starts fast
# and a model-load failure surfaces as a graceful per-request "not sure" rather
# than crashing startup.
_analyzer = None
_analyzer_error: str | None = None


def _get_analyzer():
    global _analyzer, _analyzer_error
    if _analyzer is None and _analyzer_error is None:
        try:
            from birdnetlib.analyzer import Analyzer

            _analyzer = Analyzer()
        except Exception as exc:  # noqa: BLE001 - never crash; degrade gracefully
            _analyzer_error = str(exc)
            print(f"[sound-id] analyzer load failed: {exc}", flush=True)
    return _analyzer


def _run_birdnet(audio_path: str, lat, lon, week) -> list[dict[str, Any]]:
    from birdnetlib import Recording

    analyzer = _get_analyzer()
    if analyzer is None:
        raise RuntimeError(_analyzer_error or "analyzer unavailable")
    kwargs: dict[str, Any] = {"min_conf": 0.25}
    if lat is not None and lon is not None:
        kwargs["lat"] = lat
        kwargs["lon"] = lon
        if week:
            kwargs["week_48"] = week
    recording = Recording(analyzer, audio_path, **kwargs)
    recording.analyze()
    return list(recording.detections or [])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "sound-id"}


@app.get("/api/health")
async def api_health() -> dict[str, str]:
    return {"status": "ok", "service": "sound-id"}


@app.post("/api/identify-bird-audio")
async def identify_bird_audio(
    file: UploadFile = File(...),
    lat: float | None = Form(None),
    lon: float | None = Form(None),
    week: int | None = Form(None),
) -> dict[str, Any]:
    content_type = file.content_type or ""
    if not (content_type.startswith("audio/") or content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="Please upload an audio or video recording.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="The recording is empty.")
    if len(audio_bytes) > AUDIO_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too large. Keep it short (around 10-15 seconds).")

    suffix = os.path.splitext(file.filename or "")[1] or ".audio"
    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            detections = await asyncio.to_thread(_run_birdnet, tmp_path, lat, lon, week)
        except Exception as exc:  # noqa: BLE001 - degrade gracefully, never 500
            print(f"[sound-id] inference failed/unavailable: {exc}", flush=True)
            return {"uncertain": True, "topMatches": [], "soundIdUnavailable": True}
    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    return map_detections_to_matches(detections)
