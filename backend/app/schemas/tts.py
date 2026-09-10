from pydantic import BaseModel, Field

from app.config import settings


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=settings.max_text_length)
    language: str = Field(min_length=2, max_length=20)
    voice: str = Field(min_length=1, max_length=100)

