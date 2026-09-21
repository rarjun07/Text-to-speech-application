import uuid

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
    def fake_synthesize(text: str, language: str, voice_id: str, speaking_rate: float = 1.0) -> TTSResponse:
        raise TTSProviderUnavailable("local engine unavailable")

    monkeypatch.setattr(local_tts, "synthesize_speech", fake_synthesize)
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "language": "en-US", "voice": "en-female"},
    )
    assert response.status_code == 503


def test_tts_returns_audio_url_when_provider_succeeds(monkeypatch) -> None:
    def fake_synthesize(text: str, language: str, voice_id: str, speaking_rate: float = 1.0) -> TTSResponse:
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


def test_authenticated_history_and_favorites(monkeypatch) -> None:
    email = f"history-{uuid.uuid4().hex}@example.com"
    register = client.post(
        "/api/auth/register",
        json={
            "full_name": "History Tester",
            "mobile_number": "+15551234567",
            "email": email,
            "password": "password123",
        },
    )
    assert register.status_code == 201
    assert register.json()["full_name"] == "History Tester"
    assert register.json()["mobile_number"] == "+15551234567"
    token = register.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    def fake_synthesize(text: str, language: str, voice_id: str, speaking_rate: float = 1.0) -> TTSResponse:
        return TTSResponse(success=True, audio_url="/audio/history-test.wav")

    monkeypatch.setattr(local_tts, "synthesize_speech", fake_synthesize)
    generated = client.post(
        "/api/tts",
        headers=headers,
        json={"text": "Saved speech", "language": "en-US", "voice": "en-female"},
    )
    assert generated.status_code == 200

    history = client.get("/api/history", headers=headers)
    assert history.status_code == 200
    speech_id = history.json()[0]["id"]
    assert history.json()[0]["is_favorite"] is False

    favorite = client.post(f"/api/history/{speech_id}/favorite", headers=headers)
    assert favorite.status_code == 204
    favorites = client.get("/api/favorites", headers=headers)
    assert favorites.status_code == 200
    assert favorites.json()[0]["id"] == speech_id

    unfavorite = client.delete(f"/api/history/{speech_id}/favorite", headers=headers)
    assert unfavorite.status_code == 204
    assert client.get("/api/favorites", headers=headers).json() == []

    deleted = client.delete(f"/api/history/{speech_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/history", headers=headers).json() == []


def test_extracts_text_document() -> None:
    response = client.post(
        "/api/documents/extract",
        files={"file": ("notes.txt", b"Imported notes for speech.", "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["text"] == "Imported notes for speech."


def test_updates_profile_and_uploads_avatar() -> None:
    email = f"profile-{uuid.uuid4().hex}@example.com"
    register = client.post(
        "/api/auth/register",
        json={
            "full_name": "Profile Tester",
            "mobile_number": "+15550001111",
            "email": email,
            "password": "password123",
        },
    )
    assert register.status_code == 201
    headers = {"Authorization": f"Bearer {register.json()['token']}"}

    updated = client.patch(
        "/api/auth/me",
        headers=headers,
        json={
            "full_name": "Updated Tester",
            "email": email,
            "mobile_number": "+15550002222",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Updated Tester"
    assert updated.json()["mobile_number"] == "+15550002222"

    avatar = client.post(
        "/api/auth/me/avatar",
        headers=headers,
        files={"file": ("avatar.png", b"png-bytes", "image/png")},
    )
    assert avatar.status_code == 200
    assert avatar.json()["profile_image_url"].startswith("/profile-images/")
