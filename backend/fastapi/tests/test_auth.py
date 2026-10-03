"""
Unit and integration tests for authentication.
"""
import pytest
from httpx import AsyncClient

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models import User, UserRole


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "SecurePass123!"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert not verify_password("wrong", hashed)

    def test_hash_is_unique(self):
        pw = "SamePassword123!"
        assert hash_password(pw) != hash_password(pw)


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token("user-123", "customer")
        payload = decode_access_token(token)
        assert payload["sub"] == "user-123"
        assert payload["role"] == "customer"
        assert payload["type"] == "access"

    def test_invalid_token_raises(self):
        from jose import JWTError
        with pytest.raises(JWTError):
            decode_access_token("invalid.token.here")


@pytest.mark.asyncio
class TestAuthAPI:
    async def test_register_success(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "name": "New User",
            "email": "newuser@test.com",
            "password": "NewPass123!",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]

    async def test_register_weak_password_fails(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "name": "Test User",
            "email": "test2@test.com",
            "password": "weak",
        })
        assert response.status_code == 422

    async def test_register_duplicate_email_fails(self, client: AsyncClient, customer_user):
        response = await client.post("/api/v1/auth/register", json={
            "name": "Duplicate",
            "email": "testcustomer@test.com",
            "password": "DupPass123!",
        })
        assert response.status_code == 409

    async def test_login_success(self, client: AsyncClient, customer_user):
        response = await client.post("/api/v1/auth/login", json={
            "email": "testcustomer@test.com",
            "password": "TestPass123!",
        })
        assert response.status_code == 200
        assert response.json()["data"]["access_token"]

    async def test_login_wrong_password(self, client: AsyncClient, customer_user):
        response = await client.post("/api/v1/auth/login", json={
            "email": "testcustomer@test.com",
            "password": "WrongPassword!",
        })
        assert response.status_code == 401

    async def test_get_me_authenticated(self, client: AsyncClient, customer_user):
        # Login first
        login = await client.post("/api/v1/auth/login", json={
            "email": "testcustomer@test.com",
            "password": "TestPass123!",
        })
        token = login.json()["data"]["access_token"]

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["email"] == "testcustomer@test.com"
        assert data["role"] == "customer"

    async def test_get_me_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_rbac_customer_cannot_access_admin(self, client: AsyncClient, customer_user):
        login = await client.post("/api/v1/auth/login", json={
            "email": "testcustomer@test.com",
            "password": "TestPass123!",
        })
        token = login.json()["data"]["access_token"]

        # Customer should not access admin analytics
        response = await client.get(
            "/api/v1/analytics/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
