"""
Authentication service: register, login, refresh, logout, social auth.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models import User, RefreshToken, UserRole, AuthProvider, NotificationPreference, utcnow
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token_raw,
    hash_token, get_token_expiry_refresh,
    decode_access_token,
)
from app.core.config import settings
from app.auth.schemas import RegisterRequest, LoginRequest, TokenResponse

logger = logging.getLogger(__name__)


class AuthService:

    async def register(self, db: AsyncSession, payload: RegisterRequest) -> TokenResponse:
        # Check duplicate email
        existing = await db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        user = User(
            name=payload.name.strip(),
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            role=UserRole.CUSTOMER,
            auth_provider=AuthProvider.LOCAL,
            is_verified=False,
            is_active=True,
        )
        db.add(user)
        await db.flush()  # Get user.id before creating preferences

        # Create default notification preferences
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)

        await db.commit()
        await db.refresh(user)

        logger.info(f"New user registered: {user.email}")
        return await self._create_token_pair(db, user)

    async def login(self, db: AsyncSession, payload: LoginRequest) -> TokenResponse:
        result = await db.execute(select(User).where(User.email == payload.email.lower()))
        user = result.scalar_one_or_none()

        if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        # Update last login
        user.last_login_at = utcnow()
        await db.commit()

        logger.info(f"User logged in: {user.email}")
        return await self._create_token_pair(db, user)

    async def refresh(self, db: AsyncSession, refresh_token: str) -> TokenResponse:
        token_hash = hash_token(refresh_token)
        result = await db.execute(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .where(RefreshToken.revoked == False)
        )
        db_token = result.scalar_one_or_none()

        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        if db_token.expires_at < utcnow():
            db_token.revoked = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        # Rotate: revoke old token
        db_token.revoked = True
        await db.flush()

        user_result = await db.execute(select(User).where(User.id == db_token.user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        tokens = await self._create_token_pair(db, user)
        await db.commit()
        return tokens

    async def logout(self, db: AsyncSession, user: User, refresh_token: Optional[str] = None):
        if refresh_token:
            token_hash = hash_token(refresh_token)
            await db.execute(
                delete(RefreshToken)
                .where(RefreshToken.user_id == user.id)
                .where(RefreshToken.token_hash == token_hash)
            )
        else:
            # Revoke all refresh tokens for this user
            await db.execute(
                delete(RefreshToken).where(RefreshToken.user_id == user.id)
            )
        await db.commit()
        logger.info(f"User logged out: {user.email}")

    async def social_login(self, db: AsyncSession, auth0_token: str) -> TokenResponse:
        """Exchange an Auth0 access token for our JWT."""
        # Introspect the Auth0 token
        userinfo_url = f"https://{settings.AUTH0_DOMAIN}/userinfo"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {auth0_token}"},
            )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Auth0 token",
            )

        info = resp.json()
        email = info.get("email", "").lower()
        name = info.get("name") or info.get("nickname") or email.split("@")[0]
        provider_id = info.get("sub", "")
        provider = AuthProvider.GOOGLE if "google" in provider_id else (
            AuthProvider.FACEBOOK if "facebook" in provider_id else AuthProvider.AUTH0
        )

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email returned from Auth0",
            )

        # Find or create user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                name=name,
                email=email,
                auth_provider=provider,
                provider_user_id=provider_id,
                is_active=True,
                is_verified=True,
                role=UserRole.CUSTOMER,
            )
            db.add(user)
            await db.flush()
            db.add(NotificationPreference(user_id=user.id))
        else:
            # Update provider info if signing in with social for first time
            if user.auth_provider == AuthProvider.LOCAL:
                user.provider_user_id = provider_id
            user.last_login_at = utcnow()

        await db.commit()
        await db.refresh(user)
        logger.info(f"Social login: {user.email} via {provider.value}")
        return await self._create_token_pair(db, user)

    async def _create_token_pair(self, db: AsyncSession, user: User) -> TokenResponse:
        """Create access + refresh tokens, store refresh hash in DB."""
        access_token = create_access_token(subject=user.id, role=user.role.value)
        raw_refresh = create_refresh_token_raw()
        expires = get_token_expiry_refresh()

        db_refresh = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=expires.replace(tzinfo=None),
        )
        db.add(db_refresh)
        await db.flush()

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


auth_service = AuthService()
