import base64
import json
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.config import settings
from app.schemas.tts import TTSResponse
from app.services.exceptions import TTSProviderUnavailable

GOOGLE_VOICE_NAMES = {
    "en-female": "en-US-Neural2-F",
    "en-male": "en-US-Neural2-D",
    "hi-female": "hi-IN-Neural2-A",
    "es-female": "es-ES-Neural2-A",
}


def synthesize_speech(text: str, language: str, voice_id: str) -> TTSResponse:
    if not settings.tts_api_key:
        raise TTSProviderUnavailable("The Google Cloud TTS provider is not configured yet.")

    provider_voice = GOOGLE_VOICE_NAMES.get(voice_id)
    if provider_voice is None:
        raise TTSProviderUnavailable("The selected voice is not configured for the TTS provider.")

    payload = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": language, "name": provider_voice},
        "audioConfig": {"audioEncoding": "MP3"},
    }).encode("utf-8")
    endpoint = f"{settings.tts_endpoint}?{urlencode({'key': settings.tts_api_key})}"
    request = Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise TTSProviderUnavailable("The Google Cloud TTS provider could not generate audio.") from error

    encoded_audio = result.get("audioContent")
    if not encoded_audio:
        raise TTSProviderUnavailable("The TTS provider returned no audio data.")

    try:
        audio_bytes = base64.b64decode(encoded_audio, validate=True)
    except (ValueError, base64.binascii.Error) as error:
        raise TTSProviderUnavailable("The TTS provider returned invalid audio data.") from error

    audio_directory = Path(__file__).resolve().parents[1] / "generated_audio"
    audio_directory.mkdir(exist_ok=True)
    filename = f"{uuid.uuid4().hex}.mp3"
    (audio_directory / filename).write_bytes(audio_bytes)
    return TTSResponse(success=True, audio_url=f"/audio/{filename}")
