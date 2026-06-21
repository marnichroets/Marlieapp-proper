"""Pure helpers for the bird *sound* identification endpoint.

Deliberately dependency-free (no BirdNET / TensorFlow / FastAPI imports here) so
this logic can be unit-tested on any Python without the heavy ML stack. The
endpoint in main.py lazily imports BirdNET, runs inference, then hands the raw
detections to map_detections_to_matches() below to shape them into the EXACT
same payload the photo identifier returns ({"uncertain", "topMatches"]}), so the
existing Bird Council flow, warm copy and collection-add work unchanged.
"""

from typing import Any

# Below this BirdNET confidence (0..1) we treat the result as "not sure" and let
# the frontend show the same warm, non-frustrating fallback the photo flow uses.
# Tuned conservatively: sound ID is genuinely uncertain on distant/noisy clips,
# and we would much rather say "I'm not certain" than confidently add the wrong
# bird to her real collection.
DEFAULT_MIN_CONFIDENCE = 0.5
CONFIDENT_THRESHOLD = 0.65

# Shape of one match, matching the photo identifier's MATCH_TEMPLATE so the
# frontend normaliser handles both identically. The client enriches the warm
# fields (funFacts, colours, etc.) from the bundled SA library by name, exactly
# as it already does for photo and manual adds, so we keep the backend lean.
_MATCH_KEYS = (
    "commonName",
    "afrikaansName",
    "scientificName",
    "confidence",
    "whyThisBird",
    "colours",
    "size",
    "habitat",
    "diet",
    "whereFoundInSouthAfrica",
    "funFacts",
    "cutePersonalityLine",
    "soundDescription",
    "similarBirds",
)


def _empty_match() -> dict[str, Any]:
    match = {key: "" for key in _MATCH_KEYS}
    match["confidence"] = 0
    match["funFacts"] = []
    match["similarBirds"] = []
    return match


def _clean_common_name(raw: str) -> str:
    """BirdNET labels look like 'Hadada Ibis_Bostrychia hagedash' or just a
    common name. Take the human common-name part and tidy whitespace."""
    name = str(raw or "").split("_")[0].strip()
    return name


def map_detections_to_matches(
    detections: list[dict[str, Any]],
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
) -> dict[str, Any]:
    """Turn raw BirdNET detections into the {"uncertain", "topMatches"} payload.

    `detections` is a list of dicts as birdnetlib produces, e.g.
        {"common_name": "Hadada Ibis", "scientific_name": "Bostrychia hagedash",
         "confidence": 0.83, "start_time": 0.0, "end_time": 3.0}
    A clip can yield many detections (per 3s window); we keep the single best
    confidence per species, rank species by that, and return the top 3.
    """
    best: dict[str, dict[str, Any]] = {}
    for det in detections or []:
        if not isinstance(det, dict):
            continue
        common = _clean_common_name(det.get("common_name") or det.get("label"))
        scientific = str(det.get("scientific_name") or "").strip()
        key = (scientific or common).lower()
        if not key:
            continue
        try:
            conf = float(det.get("confidence", 0) or 0)
        except (TypeError, ValueError):
            conf = 0.0
        conf = max(0.0, min(1.0, conf))
        if key not in best or conf > best[key]["confidence"]:
            best[key] = {
                "commonName": common,
                "scientificName": scientific,
                "confidence": conf,
            }

    ranked = sorted(best.values(), key=lambda m: m["confidence"], reverse=True)
    ranked = [m for m in ranked if m["confidence"] >= min_confidence][:3]

    top_matches: list[dict[str, Any]] = []
    for m in ranked:
        match = _empty_match()
        pct = max(0, min(100, round(m["confidence"] * 100)))
        match["commonName"] = m["commonName"]
        match["scientificName"] = m["scientificName"]
        match["confidence"] = pct
        match["whyThisBird"] = (
            f"The Council matched this one by its call 🎶 (about {pct}% sure)."
        )
        match["soundDescription"] = "Identified from its call or song."
        top_matches.append(match)

    top_conf = ranked[0]["confidence"] if ranked else 0.0
    uncertain = (not top_matches) or top_conf < CONFIDENT_THRESHOLD

    return {"uncertain": bool(uncertain), "topMatches": top_matches}
