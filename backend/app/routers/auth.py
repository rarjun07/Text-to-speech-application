import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth import create_token, current_user, hash_password, verify_password
from app.db import get_connection
from app.schemas.auth import AuthRequest, AuthResponse, ProfileUpdateRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])
PROFILE_IMAGE_DIRECTORY = Path(__file__).resolve().parents[1] / "profile_images"
PROFILE_IMAGE_DIRECTORY.mkdir(exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest) -> AuthResponse:
    email = request.email.strip().lower()
    full_name = request.full_name.strip()
    mobile_number = request.mobile_number.strip()
    with get_connection() as connection:
        try:
            cursor = connection.execute(
                "INSERT INTO users (email, password_hash, full_name, mobile_number, profile_image_url) VALUES (?, ?, ?, ?, ?)",
                (email, hash_password(request.password), full_name, mobile_number, ""),
            )
        except Exception as error:
            if "UNIQUE" in str(error).upper():
                raise HTTPException(status_code=409, detail="An account with this email already exists.") from error
            raise
    return AuthResponse(token=create_token(cursor.lastrowid, email), email=email, full_name=full_name, mobile_number=mobile_number, profile_image_url="")


@router.post("/login", response_model=AuthResponse)
def login(request: AuthRequest) -> AuthResponse:
    email = request.email.strip().lower()
    with get_connection() as connection:
        user = connection.execute("SELECT id, email, password_hash, full_name, mobile_number, profile_image_url FROM users WHERE email = ?", (email,)).fetchone()
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return AuthResponse(token=create_token(user["id"], user["email"]), email=user["email"], full_name=user["full_name"], mobile_number=user["mobile_number"], profile_image_url=user["profile_image_url"])


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(current_user)) -> UserResponse:
    return UserResponse(**user)


@router.patch("/me", response_model=UserResponse)
def update_profile(request: ProfileUpdateRequest, user: dict = Depends(current_user)) -> UserResponse:
    email = request.email.strip().lower()
    with get_connection() as connection:
        duplicate = connection.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email, user["id"])).fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        connection.execute(
            "UPDATE users SET full_name = ?, email = ?, mobile_number = ? WHERE id = ?",
            (request.full_name.strip(), email, request.mobile_number.strip(), user["id"]),
        )
        updated = connection.execute("SELECT id, email, full_name, mobile_number, profile_image_url FROM users WHERE id = ?", (user["id"],)).fetchone()
    return UserResponse(**dict(updated))


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(current_user)) -> UserResponse:
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=415, detail="Use a JPG, PNG, or WEBP profile image.")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Profile images must be 5 MB or smaller.")
    filename = f"{uuid.uuid4().hex}{extension}"
    (PROFILE_IMAGE_DIRECTORY / filename).write_bytes(contents)
    image_url = f"/profile-images/{filename}"
    with get_connection() as connection:
        connection.execute("UPDATE users SET profile_image_url = ? WHERE id = ?", (image_url, user["id"]))
        updated = connection.execute("SELECT id, email, full_name, mobile_number, profile_image_url FROM users WHERE id = ?", (user["id"],)).fetchone()
    return UserResponse(**dict(updated))