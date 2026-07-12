"""Real-clip test for the ffmpeg audio-extraction step (Sound ID hardening).

Synthesises genuine `.m4a` (AAC — what iPhones record) and `.mp4` (video with an
audio track — what a phone video upload is) clips with ffmpeg, then runs them
through the SAME `extract_audio_to_wav()` the endpoints use and verifies the
result is a real mono 48 kHz WAV with audio in it. Dependency-free: validates the
output with the stdlib `wave` module, so it runs on any Python without BirdNET.

Run: `python sound-service/test_ffmpeg_extract.py`  (needs the ffmpeg binary).
"""

import os
import shutil
import subprocess
import sys
import tempfile
import wave

# Import the production helper directly (dependency-free module).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from birdnet_audio import FFMPEG_TARGET_SAMPLE_RATE, extract_audio_to_wav


def _ffmpeg() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("SKIP: ffmpeg not on PATH (it IS present in the sound-service image).")
        sys.exit(0)
    return ffmpeg


def _make_m4a(ffmpeg: str, path: str) -> None:
    # 3s 1kHz tone encoded as AAC in an .m4a container — an iPhone voice memo.
    subprocess.run(
        [ffmpeg, "-nostdin", "-y", "-loglevel", "error",
         "-f", "lavfi", "-i", "sine=frequency=1000:duration=3",
         "-c:a", "aac", path],
        check=True,
    )


def _make_mp4(ffmpeg: str, path: str) -> None:
    # 3s video (test pattern) WITH an audio tone — a phone video upload.
    subprocess.run(
        [ffmpeg, "-nostdin", "-y", "-loglevel", "error",
         "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=15",
         "-f", "lavfi", "-i", "sine=frequency=800:duration=3",
         "-c:v", "libx264", "-c:a", "aac", "-shortest", path],
        check=True,
    )


def _assert_valid_wav(wav_path: str, label: str) -> None:
    with wave.open(wav_path, "rb") as w:
        channels = w.getnchannels()
        rate = w.getframerate()
        frames = w.getnframes()
    assert channels == 1, f"{label}: expected mono, got {channels} channels"
    assert rate == FFMPEG_TARGET_SAMPLE_RATE, f"{label}: expected {FFMPEG_TARGET_SAMPLE_RATE} Hz, got {rate}"
    assert frames > 0, f"{label}: WAV has no audio frames"
    seconds = frames / rate
    print(f"  PASS {label}: mono {rate} Hz, {seconds:.1f}s of audio -> BirdNET-ready WAV")


def main() -> None:
    ffmpeg = _ffmpeg()
    with tempfile.TemporaryDirectory() as d:
        cases = [
            ("m4a (iPhone recording)", os.path.join(d, "clip.m4a"), _make_m4a),
            ("mp4 (phone video)", os.path.join(d, "clip.mp4"), _make_mp4),
        ]
        for label, src, make in cases:
            make(ffmpeg, src)
            wav = extract_audio_to_wav(src)
            try:
                _assert_valid_wav(wav, label)
            finally:
                if os.path.exists(wav):
                    os.remove(wav)

        # And the failure path: a non-media file must raise (caught upstream as a
        # graceful "couldn't be sure"), never crash the endpoint.
        junk = os.path.join(d, "notes.txt")
        with open(junk, "w", encoding="utf-8") as f:
            f.write("this is not a recording")
        try:
            extract_audio_to_wav(junk)
        except RuntimeError:
            print("  PASS non-media file: raised RuntimeError (graceful fallback upstream)")
        else:
            raise AssertionError("expected RuntimeError on a non-media file")

    print("\nAll ffmpeg extraction checks passed.")


if __name__ == "__main__":
    main()
