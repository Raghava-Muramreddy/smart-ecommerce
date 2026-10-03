"""
Authentication router: /api/v1/auth/*
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import success_response
from app.auth.schemas import (
    RegisterRequest, LoginRequest, RefreshRequest,
    TokenResponse, UserResponse, SocialTokenRequest,
)
from app.auth.service import auth_service
from app.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED,
             summary="Register a new customer account")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.register(db, payload)
    return success_response(data=tokens.model_dump(), message="Registration successful", status_code=201)


@router.post("/login", response_model=dict, summary="Login with email and password")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.login(db, payload)
    return success_response(data=tokens.model_dump(), message="Login successful")


@router.post("/refresh", response_model=dict, summary="Refresh access token")
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.refresh(db, payload.refresh_token)
    return success_response(data=tokens.model_dump(), message="Token refreshed")


@router.post("/logout", response_model=dict, summary="Logout (revoke refresh token)")
async def logout(
    payload: Optional[RefreshRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    refresh_token = payload.refresh_token if payload else None
    await auth_service.logout(db, current_user, refresh_token)
    return success_response(message="Logged out successfully")


@router.get("/me", response_model=dict, summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_user)):
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="User profile retrieved",
    )


@router.post("/social/token", response_model=dict,
             summary="Exchange Auth0 token for platform JWT")
async def social_login(payload: SocialTokenRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.social_login(db, payload.auth0_token)
    return success_response(data=tokens.model_dump(), message="Social login successful")
