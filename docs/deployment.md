# Deployment Checklist

## Frontend

The React app can be deployed to Vercel or Netlify.

Build command:

```bash
npm run build
```

Set this environment variable in the hosting provider:

```env
VITE_API_BASE_URL=https://your-backend-domain.example.com
```

## Backend

The FastAPI app can be deployed to Render, Railway, AWS, or Azure.

Install command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set these backend environment variables in the hosting provider:

```env
APP_NAME=Text-to-Speech API
CORS_ORIGINS=https://your-frontend-domain.example.com
MAX_TEXT_LENGTH=5000
RATE_LIMIT_PER_MINUTE=60
TTS_API_KEY=your_provider_key
TTS_ENDPOINT=https://texttospeech.googleapis.com/v1/text:synthesize
TTS_PROVIDER=google
DATABASE_PATH=/var/data/tts.db
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TOKEN_MINUTES=1440
```

Never commit `.env` or provider credentials. The local `say` provider is macOS-only; production hosting should use `TTS_PROVIDER=google` or another cloud adapter. SQLite needs a persistent disk such as `/var/data/tts.db`; PostgreSQL is recommended when running multiple backend instances. The generated audio directory also needs persistent storage or object storage if history links must survive restarts.

## Final Verification

```bash
cd backend
PYTHONPATH=. python3 -m pytest -q
python3 -m compileall -q app

cd ../frontend
npm run build
```

Before deployment, verify:

- Frontend points to the deployed backend URL.
- Backend CORS allows only the deployed frontend origin.
- The provider key is configured only in the backend.
- `/api/health` returns `{ "status": "ok" }`.
- `/docs` is reachable for API review.
- Account registration, login, history, and favorites work with the deployed database.
- Generated audio playback and download work in the deployed environment.
