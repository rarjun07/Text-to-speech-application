import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import Depends, Header, HTTPException, status

from app.config import settings
from app.db import get_connection


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt_hex, digest_hex = stored_hash.split("$", 1)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 120_000)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_token(user_id: int, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": int(time.time()) + settings.auth_token_minutes * 60}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(settings.auth_secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    try:
        encoded, signature = authorization[7:].split(".", 1)
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from error
    expected = hmac.new(settings.auth_secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    try:
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if payload["exp"] < time.time():
            raise ValueError
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
    with get_connection() as connection:
        user = connection.execute("SELECT id, email, full_name, mobile_number, profile_image_url FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="User account no longer exists.")
    return dict(user)


def optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    return current_user(authorization)