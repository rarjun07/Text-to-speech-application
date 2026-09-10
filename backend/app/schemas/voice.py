from pydantic import BaseModel


class Voice(BaseModel):
    id: str
    name: str
    language: str
    gender: str
    style: str


class VoiceResponse(BaseModel):
    voices: list[Voice]

