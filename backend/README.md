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
- `POST /api/tts` validates the request, calls Google Cloud Text-to-Speech when `TTS_API_KEY` is configured, saves the returned MP3 under `generated_audio/`, and returns its `/audio/...` URL.

Successful response:

```json
{
  "success": true,
  "audio_url": "/audio/36f2...mp3"
}
```

The `/audio` route serves generated files from the backend so the frontend can use the URL in a native audio player.

Google Cloud Text-to-Speech credentials belong in a local `.env` file and must never be committed. The frontend never receives the provider key.
