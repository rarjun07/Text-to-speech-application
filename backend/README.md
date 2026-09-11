# FastAPI Backend

## Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Endpoints

- `GET /api/health` returns the backend status.
- `GET /api/voices` returns the current voice catalog.
- `POST /api/tts` validates the request, uses the local macOS `say` engine by default, saves a WAV file under `generated_audio/`, and returns its `/audio/...` URL.

Successful response:

```json
{
  "success": true,
  "audio_url": "/audio/36f2...mp3"
}
```

The `/audio` route serves generated files from the backend so the frontend can use the URL in a native audio player.

The default local provider needs no API key or billing account. To use Google Cloud instead, set `TTS_PROVIDER=google` and configure `TTS_API_KEY` in the local `.env` file. The frontend never receives the provider key.

Requests are limited by `RATE_LIMIT_PER_MINUTE` per client address. The default is 60 requests per minute and rate-limited requests return HTTP `429`.
