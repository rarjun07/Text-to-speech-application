from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import health, tts, voices

app = FastAPI(
    title="Text-to-Speech API",
    description="Backend API for the Text-to-Speech internship project.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, limit=settings.rate_limit_per_minute)

app.include_router(health.router, prefix="/api")
app.include_router(voices.router, prefix="/api")
app.include_router(tts.router, prefix="/api")

audio_directory = Path(__file__).resolve().parents[1] / "generated_audio"
audio_directory.mkdir(exist_ok=True)
app.mount("/audio", StaticFiles(directory=audio_directory), name="audio")
