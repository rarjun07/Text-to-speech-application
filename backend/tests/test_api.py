from fastapi.testclient import TestClient

from app.main import app
from app.schemas.tts import TTSResponse
from app.services import local_tts
from app.services.exceptions import TTSProviderUnavailable


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_tts_rejects_whitespace_only_text() -> None:
    response = client.post(
        "/api/tts",
        json={"text": "   ", "language": "en-US", "voice": "en-female"},
    )
    assert response.status_code == 422


def test_tts_rejects_text_over_limit() -> None:
    response = client.post(
        "/api/tts",
        json={"text": "a" * 5001, "language": "en-US", "voice": "en-female"},
    )
    assert response.status_code == 422


def test_tts_rejects_missing_fields() -> None:
    response = client.post("/api/tts", json={"text": "Hello"})
    assert response.status_code == 422


def test_tts_rejects_voice_for_wrong_language() -> None:
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "language": "hi-IN", "voice": "en-female"},
    )
    assert response.status_code == 404


def test_tts_reports_provider_unavailable(monkeypatch) -> None:
    def fake_synthesize(text: str, language: str, voice_id: str) -> TTSResponse:
        raise TTSProviderUnavailable("local engine unavailable")

    monkeypatch.setattr(local_tts, "synthesize_speech", fake_synthesize)
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "language": "en-US", "voice": "en-female"},
    )
    assert response.status_code == 503


def test_tts_returns_audio_url_when_provider_succeeds(monkeypatch) -> None:
    def fake_synthesize(text: str, language: str, voice_id: str) -> TTSResponse:
        assert text == "Hello"
        assert language == "en-US"
        assert voice_id == "en-female"
        return TTSResponse(success=True, audio_url="/audio/example.mp3")

    monkeypatch.setattr(local_tts, "synthesize_speech", fake_synthesize)
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "language": "en-US", "voice": "en-female"},
    )
    assert response.status_code == 200
    assert response.json() == {"success": True, "audio_url": "/audio/example.mp3"}
