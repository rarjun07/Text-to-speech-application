class VoiceNotFound(Exception):
    """Raised when the requested voice is not supported for its language."""


class TTSProviderUnavailable(Exception):
    """Raised when the configured TTS provider cannot generate audio."""

