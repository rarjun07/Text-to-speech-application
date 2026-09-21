import uuid
from pathlib import Path

import pyttsx3

from app.schemas.tts import TTSResponse
from app.services.exceptions import TTSProviderUnavailable


VOICE_NAMES = {
    "en-female": "female",
    "en-male": "male",
    "hi-female": "hindi",
    "es-female": "spanish",
}


def synthesize_speech(
    text: str,
    language: str,
    voice_id: str,
    speaking_rate: float = 1.0,
) -> TTSResponse:
    audio_directory = Path(__file__).resolve().parents[2] / "generated_audio"
    audio_directory.mkdir(exist_ok=True)

    filename = f"{uuid.uuid4().hex}.wav"
    output_path = audio_directory / filename

    try:
        engine = pyttsx3.init()

        engine.setProperty(
            "rate",
            round(200 * speaking_rate),
        )

        voices = engine.getProperty("voices")

        selected_voice = None
        requested_voice = VOICE_NAMES.get(voice_id)

        for voice in voices:
            voice_text = f"{voice.id} {voice.name}".lower()

            if requested_voice and requested_voice in voice_text:
                selected_voice = voice.id
                break

        if selected_voice:
            engine.setProperty("voice", selected_voice)

        engine.save_to_file(text, str(output_path))
        engine.runAndWait()
        engine.stop()

    except Exception as error:
        raise TTSProviderUnavailable(
            "The Linux TTS engine could not generate audio."
        ) from error

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise TTSProviderUnavailable(
            "The Linux TTS engine returned no audio data."
        )

    return TTSResponse(
        success=True,
        audio_url=f"/audio/{filename}",
    )