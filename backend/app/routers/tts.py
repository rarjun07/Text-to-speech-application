from fastapi import APIRouter, HTTPException, status

from app.schemas.tts import TTSRequest

router = APIRouter(tags=["text-to-speech"])


@router.post("/tts", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def generate_speech(_: TTSRequest) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Text-to-speech provider integration is not configured yet.",
    )

