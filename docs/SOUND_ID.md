# Bird Sound ID — status (branch `sound-id`)

A working version of identifying a bird from a **recording** (audio or video),
built as an alternative to photo ID in the *Spot a Bird* flow.

> **Status update (2026-06-22): LIVE.** Sound ID runs on its own isolated Railway
> service (`sound-service/`, separate container from the main backend) and is
> enabled (`SOUND_ID_ENABLED` defaults ON). Two hardening additions this date:
> 1. **Explicit ffmpeg extraction** — every upload/recording is transcoded to a
>    mono 48 kHz WAV via the `ffmpeg` binary *before* BirdNET, so iPhone `.m4a`
>    and any `.mp4`/video decode reliably (not just WAV/mp3). Verified end-to-end
>    with real m4a + mp4 clips (`sound-service/test_ffmpeg_extract.py`).
> 2. **In-app microphone recording** — a "Record now" button (MediaRecorder /
>    getUserMedia) records live in the browser on mobile and desktop, with a
>    timer + pulsing indicator, then auto-submits to the Council. No need to leave
>    the app for the phone's native recorder.

## How it works

- **Recognizer:** BirdNET (Cornell) — the open model that does what Merlin's
  Sound ID does. It runs server-side in the existing FastAPI backend.
- **Frontend** (`src/App.jsx`, gated by `SOUND_ID_ENABLED`): two options in the
  Spot-a-Bird actions —
  - 🎙️ **Record now**: live in-browser recording via MediaRecorder/getUserMedia
    (timer + pulsing dot, auto-stops at 15s, auto-submits on Stop). Picks a
    browser-supported mime (webm/opus, or mp4 on iOS Safari).
  - 📁 **Upload a recording**: a file picker accepting `audio/*,video/*`.
  Either way it previews the clip and posts it to the sound service. Results flow
  into the **same** results UI, warm Council copy, loading lines, and
  confirm-to-collection path as photo ID. Low confidence or failure shows a warm,
  specific fallback (not photo demo birds).
- **Backend** (`sound-service/app.py` and mirrored in `backend/main.py` →
  `POST /api/identify-bird-audio`): validates the upload, **transcodes it to a
  mono 48 kHz WAV with ffmpeg** (`extract_audio_to_wav`), runs BirdNET (optionally
  location/week-filtered for SA accuracy), and returns the **identical**
  `{uncertain, topMatches[]}` payload the photo identifier returns, so nothing
  downstream changes. The live frontend calls the isolated `sound-service`.
- **Mapping + decode** (`birdnet_audio.py`, mirrored in both services): pure,
  dependency-free (stdlib only). Holds `extract_audio_to_wav` (the ffmpeg step)
  and `map_detections_to_matches` — turns raw BirdNET detections into the match
  shape, keeps the best confidence per species, returns the top 3, and flags
  `uncertain` below the confident threshold.

## Safety posture (why this is safe to have on a branch)

- The feature flag `SOUND_ID_ENABLED` defaults **OFF** (no env var, no localStorage
  flag), so even if this branch were merged, the UI stays dark in production.
- The BirdNET deps in `backend/requirements.txt` are **commented out**, so the
  live backend's dependencies are unchanged and its existing endpoints (state
  sync, photo ID, games) are untouched.
- The endpoint imports BirdNET **lazily inside the handler**, wrapped in
  try/except → if the model is missing or fails, it returns a graceful
  "not sure" instead of erroring; it can never take down the other endpoints.

## What IS verified

- ✅ Frontend builds and lints clean with the feature wired in.
- ✅ Backend files compile; the pure mapping (`birdnet_audio.py`) passes 13 unit
  tests (dedupe, ranking, confidence→%, uncertain thresholds, garbage-input
  safety, BirdNET label parsing, top-3 cap).
- ✅ Response-shape contract matches the photo flow (same normaliser handles both).

## Local accuracy test — DONE (2026-06-21), zero production risk

Ran BirdNET locally in a Python 3.12 venv (TensorFlow CPU) against **labeled SA
recordings** sourced keylessly from Wikimedia Commons (re-hosted xeno-canto
clips), with SA location filtering. Result over the clips Commons had coverage
for (genus-filtered to real recordings of the target species):

| Species (clips) | BirdNET top-1 |
|---|---|
| Hadeda Ibis (2) | ✅ ✅  (1.00, 1.00) |
| Cape Turtle Dove (2) | ✅ ✅  (1.00, 1.00) |
| Cape Robin-Chat (2) | ✅ ✅  (0.94, 0.85) |
| Speckled Mousebird (1) | ✅  (0.98) |
| Fork-tailed Drongo (2) | ✅ (0.98) / ❌ no detection on one clip |
| Cape White-eye (2) | ✅ (0.83) / ❌ confident wrong → Collared Sunbird (0.97) |

**Top-1 = 9/11 (81%), top-3 = 9/11 (81%).** Correct hits were high-confidence
(0.83–1.00). This validates the approach: BirdNET genuinely identifies common
vocal SA species well.

**Honest caveats on that number:**
- Small sample (11 clips, 6 species). Commons lacked clips for many targets
  (Bokmakierie, Cape Sugarbird, weavers, prinia, fiscal…), so they're untested.
- Commons clips are clean/curated → this is closer to **best-case** than a real
  phone recording in wind/traffic/distance, where accuracy will be lower.
- One **confident-wrong** result (Cape White-eye → Collared Sunbird @ 0.97). The
  confirm-to-collection step (she taps to accept a match) mitigates auto-adding
  the wrong bird, but confident-wrong suggestions are the key risk to watch.

A broader, field-realistic accuracy pass (more species, real phone clips) is
worth doing with a free xeno-canto API key before wide use; tune
`CONFIDENT_THRESHOLD` accordingly.

## What is STILL NOT verified (must happen before going live)

- ❌ **The endpoint running on a real server.** Local proof ≠ deployed proof:
  the live backend needs the BirdNET deps + ffmpeg installed and **enough memory
  to load the model without OOM-ing the shared container** (state-sync + photo
  ID). This must NOT be done on the production backend before the Cape Town trip
  / while unmonitored — deploy after the trip, or to a separate isolated service.

## To enable on the live backend (after the trip)

1. Uncomment the BirdNET deps in `backend/requirements.txt` (prefer
   `tflite-runtime` over full `tensorflow` for memory).
2. Ensure **ffmpeg** is in the Railway image (nixpacks `aptPkgs`/`nixpacks.toml`)
   so phone `m4a`/`webm`/`mp4` clips decode.
3. Confirm the Railway service has enough **memory** to load the model without
   OOM-ing the shared container (it loads lazily on first audio request).
4. Run a **real accuracy pass**: record/collect clips of known common SA species
   (Hadeda, Cape Robin-Chat, Bokmakierie, doves, bulbuls) and confirm top-1 is
   right often enough to ship. Tune `CONFIDENT_THRESHOLD` in `birdnet_audio.py`.
5. Flip the flag on (`VITE_SOUND_ID=1`) and deploy.

## Realistic accuracy expectation

Good for clear, close, single-bird recordings of common vocal species (better
with SA location filtering); genuinely uncertain on distant/noisy/overlapping or
rare-species clips — which is exactly why low confidence routes to the warm
"I'm not certain" fallback rather than guessing onto her real collection.

## Known v1 limitations / later work

- The recording itself isn't stored on the sighting (the bird is still added with
  full data); storing a short clip is a later enhancement.
- In-app recording is record-then-identify (stop → identify), not a continuous
  live "listening" stream like Merlin. Good enough and far simpler/robust.
