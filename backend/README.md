# Marlie Bird API

FastAPI backend for the Marlie Bird App. This service is intended to run on Railway as the private backend API while the React frontend remains deployable from the repo root on Vercel.

## Railway deployment

Railway must deploy this service from the `backend/` root directory, not from the repository root.

In Railway:

1. Create or update the Railway service for the backend.
2. Set the service root directory to `backend`.
3. Set the start command to:

```bash
python main.py
```

Railway provides the `PORT` environment variable. The app reads `PORT` automatically and defaults to `8080` for local development.

## Environment variables

Set these variables on Railway:

```text
OPENAI_API_KEY=your_server_side_openai_key
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Do not put `OPENAI_API_KEY` in the React frontend or in Vercel public environment variables. The frontend should call this Railway API, and only the backend should call OpenAI.

`FRONTEND_URL` is used for CORS. For multiple frontend origins, separate them with commas:

```text
FRONTEND_URL=https://your-vercel-app.vercel.app,http://localhost:5173
```

Optional:

```text
OPENAI_VISION_MODEL=gpt-4o-mini
```

### Bird ID second opinion (iNaturalist)

```text
INATURALIST_API_TOKEN=your_approved_partner_token
```

iNaturalist's computer-vision species ID (`score_image`) is **not** a public,
self-serve API — iNaturalist staff only grant it to a small number of
approved research/citizen-science partners on request (contact
carrie@inaturalist.org); a personal 24-hour token from
`/users/api_token` is not sufficient. Until `INATURALIST_API_TOKEN` is set to
an approved partner token, `/api/identify-bird` silently runs on GPT-4o alone
and `secondOpinion` in the response is always `null` — nothing breaks, it's
simply inert until (if) that access is granted.

### Email notifications (Postmark)

The `POST /api/notify` endpoint emails Marnich warm updates via Postmark. Set:

```text
POSTMARK_SERVER_TOKEN=your_postmark_server_token
NOTIFY_FROM_EMAIL=a_verified_postmark_sender@yourdomain.com
NOTIFY_TO_EMAIL=marnichr@gmail.com        # optional, this is the default
POSTMARK_MESSAGE_STREAM=outbound          # optional, default "outbound"
```

If the token or from-address is missing, the endpoint returns
`{"sent": false, "reason": "email not configured"}` and never errors, so the
app keeps working without email configured.

## Local development

From this folder:

```bash
pip install -r requirements.txt
python main.py
```

Health check:

```bash
curl http://localhost:8080/api/health
```

Bird identification:

```bash
curl -X POST http://localhost:8080/api/identify-bird \
  -F "file=@bird.jpg"
```

## API

### `GET /api/health`

Returns:

```json
{"status":"ok"}
```

### `POST /api/notify`

Accepts JSON. Either send a prebuilt `subject` + `body`, or an `event` the
server turns into a warm message:

```json
{ "event": "spotted", "birdName": "Cape Robin-Chat" }
{ "event": "challenge" }
{ "event": "gift", "giftName": "Hidden note" }
{ "event": "milestone", "count": 5 }
```

Returns `{"sent": true}` on success, or `{"sent": false, "reason": "..."}`.

### `POST /api/identify-bird`

Accepts a multipart form upload:

- `file` (required) — the photo.
- `location` (optional) — `"potchefstroom"` (default) or `"capetown"`; weights
  GPT-4o (and iNaturalist, once enabled) toward species realistic for that area.
- `month` (optional) — e.g. `"July"`, for seasonal/migratory filtering.
- `season` (optional) — `"summer"` / `"autumn"` / `"winter"` / `"spring"`.

Returns:

```json
{
  "uncertain": false,
  "topMatches": [
    {
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
      "similarBirds": []
    }
  ],
  "secondOpinion": {
    "source": "iNaturalist",
    "commonName": "",
    "scientificName": "",
    "score": 0,
    "agreesWithTopMatch": true
  }
}
```

`secondOpinion` is `null` whenever `INATURALIST_API_TOKEN` isn't configured
(the default). When it agrees with `topMatches[0]`, `uncertain` is forced
`false` (a confirmed, high-confidence result); when it disagrees, `uncertain`
is forced `true` so the frontend shows both candidates and lets her choose.
