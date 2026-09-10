from app.schemas.tts import TTSRequest, TTSResponse
from app.services.voice_catalog import get_voice_catalog


class VoiceNotFound(Exception):
    """Raised when the requested voice is not supported for its language."""


class TTSProviderUnavailable(Exception):
    """Raised until a real third-party TTS provider is configured."""


def _validate_voice(request: TTSRequest) -> None:
    matching_voice = next(
        (voice for voice in get_voice_catalog() if voice.id == request.voice),
        None,
    )
    if matching_voice is None or matching_voice.language != request.language:
        raise VoiceNotFound("The selected voice is not available for the selected language.")


def generate_speech(request: TTSRequest) -> TTSResponse:
    _validate_voice(request)
    raise TTSProviderUnavailable("The text-to-speech provider is not configured yet.")

