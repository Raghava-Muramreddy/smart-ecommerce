"""
Pydantic schemas for Authentication.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.models import UserRole, AuthProvider
import re


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("name")
    @classmethod
    def name_clean(cls, v: str) -> str:
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    is_verified: bool
    auth_provider: AuthProvider

    model_config = {"from_attributes": True}


class Auth0CallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class SocialTokenRequest(BaseModel):
    """Exchange Auth0 access token for our local JWT."""
    auth0_token: str
