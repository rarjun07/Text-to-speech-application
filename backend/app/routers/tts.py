from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import optional_user
from app.db import get_connection
from app.schemas.tts import TTSRequest, TTSResponse
from app.services.exceptions import TTSProviderUnavailable, VoiceNotFound
from app.services.tts_service import generate_speech

router = APIRouter(tags=["text-to-speech"])


@router.post("/tts", response_model=TTSResponse, status_code=status.HTTP_200_OK)
def create_speech(request: TTSRequest, user: dict | None = Depends(optional_user)) -> TTSResponse:
    try:
        response = generate_speech(request)
        if user:
            with get_connection() as connection:
                connection.execute(
                    "INSERT INTO speeches (user_id, text, language, voice, title, audio_url) VALUES (?, ?, ?, ?, ?, ?)",
                    (user["id"], request.text, request.language, request.voice, request.text[:60], response.audio_url),
                )
        return response
    except VoiceNotFound as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except TTSProviderUnavailable as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
