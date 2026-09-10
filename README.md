# Text-to-Speech Application

Full-stack internship project based on the mentor-provided project brief.

## Selected Stack

- Frontend: React.js, JavaScript, HTML5, CSS3, and Tailwind CSS where useful
- Backend: Python FastAPI
- Database: PostgreSQL
- API style: REST
- Text-to-speech provider: to be selected during backend integration

## Product Goal

Users can enter text, choose a supported language and voice, generate natural-sounding speech, play the result in the browser, and download the generated audio. The application must validate user input, handle service and network failures, and keep provider credentials on the backend.

## Scope Decision

The mentor brief defines three implementation levels. This project will use the intermediate path as the target because it includes the requested PostgreSQL database:

- Level 1 checkpoint: text input, language and voice selection, speech generation, and audio playback.
- Level 2 target: Level 1 plus PostgreSQL-backed speech history, authentication, downloads, favorites, and multiple voices.
- Level 3 features such as AI enhancement, document upload, cloud audio storage, analytics, and an admin dashboard are deferred until the core project is stable.

## Core API Contract

The backend will expose the following endpoints, following the mentor brief:

- `POST /api/tts` - validate text, language, and voice; generate speech; return audio information.
- `GET /api/voices` - return available voices grouped or filterable by language.
- `GET /api/health` - return `{ "status": "ok" }` when the backend is available.

The backend will use appropriate HTTP status codes for validation failures, authentication failures, missing resources, rate limits, internal failures, and unavailable TTS providers.

## Requirements Baseline

The application must provide:

- Text entry with character count, word count, maximum length, clear/edit behavior, and validation.
- Language and voice selection, with voice compatibility checked against the selected language.
- Speech generation with a loading state.
- Browser audio playback with play/pause, seeking, and volume control.
- Audio download when a generated result is available.
- Clear handling for empty or oversized text, invalid selections, API-key failures, network failures, server errors, and unavailable providers.
- Correct CORS configuration, backend-only provider credentials, rate limiting, and temporary audio storage unless persistence is required.
- Responsive UI and API documentation through FastAPI's generated docs.

## 14-Day Working Schedule

Each day will be completed, verified, committed, and pushed before starting the next day.

| Day | Deliverable |
| --- | --- |
| 1 | Understand and document requirements; choose stack and scope |
| 2 | Design the UI |
| 3 | Create the React frontend shell |
| 4 | Implement text input and validation |
| 5 | Implement language and voice selection |
| 6 | Learn and define REST API communication |
| 7 | Connect the frontend with the backend |
| 8 | Create the FastAPI backend project |
| 9 | Create `POST /api/tts` |
| 10 | Integrate the selected TTS provider |
| 11 | Return generated audio |
| 12 | Implement audio playback |
| 13 | Implement download functionality |
| 14 | Test, improve error handling, and deploy |

## Day 1 Status

Completed: the mentor brief was reviewed page by page, the requirements were consolidated, and the implementation scope and stack were selected. No application code is intentionally included in Day 1; the next commit will begin the UI design work for Day 2.

## Day 2 Status

Completed: the UI structure, responsive behavior, component boundaries, accessibility requirements, visual tokens, and interaction states are documented in `docs/ui-design.md`. Day 3 will implement the React frontend shell from this design.

## Day 3 Status

Completed: the React frontend shell is implemented in `frontend/`. It includes the designed workspace, text editor, character and word counts, language and voice controls, validation feedback, loading state, and an empty audio-result state. Backend communication is intentionally deferred to later days.

## Day 4 Status

Completed: text input validation now handles empty or whitespace-only text, the 5,000-character limit, live character and word counts, inline accessible errors, and consistent validation feedback before generation.

## Day 5 Status

Completed: language and voice selection now use supported voice metadata, filter voices by language, preserve a valid voice when the language changes, show availability and voice-style hints, and handle a language with no available voices.

## Day 6 Status

Completed: REST communication is defined in `docs/api-communication.md`, and `frontend/src/api/client.js` provides shared helpers for health checks, voice loading, speech generation, configurable API URLs, and normalized network/HTTP errors. The frontend will connect these helpers to the UI on Day 7.

## Day 7 Status

Completed: the React UI now calls the shared API client for backend health, provider voices, and speech generation. It displays backend connectivity status, uses provider voices when available, keeps local development fallback voices, and reports network/API failures without breaking the workspace. FastAPI implementation begins on Day 8.

## Day 8 Status

Completed: the FastAPI backend foundation is implemented in `backend/`. It includes application setup, CORS configuration, environment settings, health and voices routes, Pydantic schemas, a voice catalog service, a TTS route placeholder, requirements, and backend setup documentation. The provider-backed `/api/tts` implementation begins on Day 9.

## Day 9 Status

Completed: `POST /api/tts` now validates non-whitespace text, maximum length, language, and voice compatibility. It returns structured responses and appropriate `422`, `404`, and `503` errors. The TTS provider adapter remains intentionally unavailable until Day 10.

## Day 10 Status

Completed: Google Cloud Text-to-Speech REST integration is implemented behind `backend/app/services/google_tts.py`. Provider credentials remain backend-only, voice IDs map to Google voice names, generated MP3 files receive random filenames, and audio is served through the backend `/audio` route. Without `TTS_API_KEY`, the API returns a controlled `503` response.

## Day 11 Status

Completed: successful speech generation now returns a stable `{ "success": true, "audio_url": "/audio/..." }` response, the backend serves generated audio through the `/audio` route, and the success contract is covered by a provider-mocked API test.

## Day 12 Status

Completed: the React result panel now loads generated audio through a native accessible audio player with play, pause, seeking, and volume controls. It tracks audio readiness and reports playback-load failures in the shared error region.

## Day 13 Status

Completed: generated audio can now be downloaded from the React result panel. The frontend fetches the backend audio URL as a blob, uses a stable `generated-speech.mp3` filename, shows download progress, and reports failed downloads through the shared error region.

## Day 14 Status

Completed: final backend validation tests, a lightweight per-client rate limit, deployment configuration guidance, environment-variable documentation, and the final verification checklist are in place. Deployment remains a hosting-account step requiring the project owner’s credentials.

## Development Rules

- Never commit `.env` files or provider credentials.
- Keep frontend and backend responsibilities separate.
- Validate requests at the backend even when the frontend already validates them.
- Use focused commits named by day, for example `Day 1: document project requirements`.
- Run relevant checks before each commit and record any limitations in the README.
