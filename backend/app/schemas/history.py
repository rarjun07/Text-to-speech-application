from datetime import datetime

from pydantic import BaseModel


class SpeechHistoryItem(BaseModel):
    id: int
    text: str
    language: str
    voice: str
    audio_url: str
    created_at: datetime
    is_favorite: bool
    title: str

class SpeechRenameRequest(BaseModel):
    title: str