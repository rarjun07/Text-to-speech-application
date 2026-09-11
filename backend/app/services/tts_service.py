from app.schemas.tts import TTSRequest, TTSResponse
from app.config import settings
from app.services.exceptions import TTSProviderUnavailable, VoiceNotFound
from app.services.voice_catalog import get_voice_catalog
from app.services import google_tts, local_tts


def _validate_voice(request: TTSRequest):
    matching_voice = next(
        (voice for voice in get_voice_catalog() if voice.id == request.voice),
        None,
    )
    if matching_voice is None or matching_voice.language != request.language:
        raise VoiceNotFound("The selected voice is not available for the selected language.")
    return matching_voice


def generate_speech(request: TTSRequest) -> TTSResponse:
    selected_voice = _validate_voice(request)
    if settings.tts_provider == "google":
        return google_tts.synthesize_speech(request.text, request.language, selected_voice.id)
    if settings.tts_provider == "local":
        return local_tts.synthesize_speech(request.text, request.language, selected_voice.id)
    raise TTSProviderUnavailable(f"Unsupported TTS provider: {settings.tts_provider}")
