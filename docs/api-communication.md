# Day 6 REST API Communication

## Request Flow

The browser communicates with FastAPI over HTTP. The React application sends JSON requests to the backend, and the backend returns JSON metadata or an audio response reference.

```text
React component
    -> frontend/src/api/client.js
    -> HTTP request
    -> FastAPI endpoint
    -> JSON response or HTTP error
    -> React state update
```

## Client Configuration

The API base URL is read from `VITE_API_BASE_URL`. Local development defaults to `http://127.0.0.1:8000`. Production deployments must provide their own environment value; provider secrets must never be placed in this frontend variable.

## Endpoints

### `GET /api/health`

Expected response:

```json
{
  "status": "ok"
}
```

### `GET /api/voices`

Returns the voices supported by the backend TTS provider. The frontend will use the response to populate language and voice selectors after the backend is available.

### `POST /api/tts`

Request body:

```json
{
  "text": "Welcome to our application.",
  "language": "en-US",
  "voice": "voice-name"
}
```

Expected success response:

```json
{
  "success": true,
  "audio_url": "/audio/generated-file.mp3"
}
```

## Error Handling

The client converts network failures and non-2xx HTTP responses into `ApiError` instances. Each error preserves the HTTP status when available and exposes the backend detail for the UI to display. The UI will map validation, authentication, rate-limit, provider, and server failures to user-facing messages during the integration stages.

## Day 6 Acceptance Criteria

- API requests use one shared fetch client.
- The API base URL is configurable through a Vite environment variable.
- JSON request and response handling is centralized.
- Network failures and non-2xx responses are normalized.
- Health, voices, and speech-generation helpers match the mentor brief.

