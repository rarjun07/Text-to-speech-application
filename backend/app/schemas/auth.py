from pydantic import BaseModel, Field


class AuthRequest(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=8, max_length=200)


class RegisterRequest(AuthRequest):
    full_name: str = Field(min_length=2, max_length=100)
    mobile_number: str = Field(min_length=7, max_length=20, pattern=r"^[0-9+()\- ]+$")


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=200)
    mobile_number: str = Field(min_length=7, max_length=20, pattern=r"^[0-9+()\- ]+$")


class AuthResponse(BaseModel):
    token: str
    email: str
    full_name: str = ""
    mobile_number: str = ""
    profile_image_url: str = ""


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str = ""
    mobile_number: str = ""
    profile_image_url: str = ""