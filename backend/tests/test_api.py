from fastapi.testclient import TestClient

from app.main import app


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


def test_tts_rejects_voice_for_wrong_language() -> None:
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "language": "hi-IN", "voice": "en-female"},
    )
    assert response.status_code == 404


def test_tts_reports_provider_unavailable() -> None:
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "language": "en-US", "voice": "en-female"},
    )
    assert response.status_code == 503

