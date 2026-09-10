from fastapi import APIRouter, HTTPException, status

from app.schemas.tts import TTSRequest, TTSResponse
from app.services.tts_service import (
    TTSProviderUnavailable,
    VoiceNotFound,
    generate_speech,
)

router = APIRouter(tags=["text-to-speech"])


@router.post("/tts", response_model=TTSResponse, status_code=status.HTTP_200_OK)
def create_speech(request: TTSRequest) -> TTSResponse:
    try:
        return generate_speech(request)
    except VoiceNotFound as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except TTSProviderUnavailable as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
