from pydantic import BaseModel, Field, field_validator

from app.config import settings


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=settings.max_text_length)
    language: str = Field(min_length=2, max_length=20)
    voice: str = Field(min_length=1, max_length=100)
    speaking_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-20.0, le=20.0)
    volume_gain_db: float = Field(default=0.0, ge=-10.0, le=10.0)

    @field_validator("text")
    @classmethod
    def text_must_contain_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Text must contain at least one non-whitespace character.")
        return cleaned


class TTSResponse(BaseModel):
    success: bool
    audio_url: str
