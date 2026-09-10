from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
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

app.include_router(health.router, prefix="/api")
app.include_router(voices.router, prefix="/api")
app.include_router(tts.router, prefix="/api")

