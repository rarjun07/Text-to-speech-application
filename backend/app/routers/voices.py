from fastapi import APIRouter

from app.schemas.voice import VoiceResponse
from app.services.voice_catalog import get_voice_catalog

router = APIRouter(tags=["voices"])


@router.get("/voices", response_model=VoiceResponse)
def list_voices() -> VoiceResponse:
    return VoiceResponse(voices=get_voice_catalog())

