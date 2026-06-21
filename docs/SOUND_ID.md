# Bird Sound ID — status (branch `sound-id`)

A first working version of identifying a bird from a **recording** (audio or
video), built as an alternative to photo ID in the *Spot a Bird* flow. Built on
this branch and **kept OFF on Pooks' live account** until deliberately enabled
after her Cape Town trip (per the agreed "build now, flip live later" plan).

## How it works

- **Recognizer:** BirdNET (Cornell) — the open model that does what Merlin's
  Sound ID does. It runs server-side in the existing FastAPI backend.
- **Frontend** (`src/App.jsx`): a 🎙️ "Record or upload a call" option in the
  Spot-a-Bird actions (gated by `SOUND_ID_ENABLED`). It accepts `audio/*,video/*`
  via the OS recorder/file picker, previews it, and on "Ask the Council" posts it
  to the backend. Results flow into the **same** results UI, warm Council copy,
  loading lines, and confirm-to-collection path as photo ID. Low confidence or
  failure shows a warm, specific fallback (not photo demo birds).
- **Backend** (`backend/main.py` → `POST /api/identify-bird-audio`): validates
  and decodes the clip, runs BirdNET (optionally location/week-filtered for SA
  accuracy), and returns the **identical** `{uncertain, topMatches[]}` payload the
  photo identifier returns, so nothing downstream changes.
- **Mapping** (`backend/birdnet_audio.py`): pure, dependency-free; turns raw
  BirdNET detections into the match shape, keeps the best confidence per species,
  returns the top 3, and flags `uncertain` below the confident threshold.

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

## What is NOT yet verified (must happen before going live)

- ❌ **Real model accuracy on SA recordings.** It could not be run in the build
  environment (Python 3.14 has no TensorFlow wheel; no ffmpeg; a branch's Python
  backend doesn't deploy to a hittable preview). The recognizer's real-world
  correctness is therefore **unproven by us** and must be tested on actual clips.

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
- No live "listening" UI like Merlin yet; this is upload/record-then-identify.
