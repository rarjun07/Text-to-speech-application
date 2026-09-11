import uuid
from pathlib import Path
import subprocess

from app.schemas.tts import TTSResponse
from app.services.exceptions import TTSProviderUnavailable


VOICE_NAMES = {
    "en-female": "Samantha",
    "en-male": "Alex",
    "hi-female": "Lekha",
    "es-female": "Monica",
}


def synthesize_speech(text: str, language: str, voice_id: str) -> TTSResponse:
    del language
    audio_directory = Path(__file__).resolve().parents[1] / "generated_audio"
    audio_directory.mkdir(exist_ok=True)
    filename = f"{uuid.uuid4().hex}.wav"
    output_path = audio_directory / filename
    source_path = audio_directory / f"{uuid.uuid4().hex}.aiff"
    voice_name = VOICE_NAMES.get(voice_id, "Samantha")

    try:
        subprocess.run(
            ["say", "-v", voice_name, "-o", str(source_path), text],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16", str(source_path), str(output_path)],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as error:
        raise TTSProviderUnavailable(
            "The local macOS TTS engine could not generate audio."
        ) from error
    finally:
        source_path.unlink(missing_ok=True)

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise TTSProviderUnavailable("The local macOS TTS engine returned no audio data.")

    return TTSResponse(success=True, audio_url=f"/audio/{filename}")
