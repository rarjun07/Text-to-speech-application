import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _cors_origins() -> list[str]:
    value = os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173")
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Text-to-Speech API")
    cors_origins: list[str] = None
    max_text_length: int = int(os.getenv("MAX_TEXT_LENGTH", "5000"))

    def __post_init__(self):
        if self.cors_origins is None:
            object.__setattr__(self, "cors_origins", _cors_origins())


settings = Settings()

