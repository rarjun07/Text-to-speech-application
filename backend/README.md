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
- `POST /api/tts` is reserved for the provider integration on Day 9 and Day 10.

Provider credentials belong in a local `.env` file and must never be committed.

