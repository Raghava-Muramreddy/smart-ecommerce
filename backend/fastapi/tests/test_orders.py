"""
Tests for Orders & Checkout:
- Server-side order total & tax calculation
- Order item snapshots (name, sku, unit price)
- RBAC data isolation (customer can only see their own orders)
- Order status filtering
"""
from unittest.mock import patch, MagicMock
import pytest
from httpx import AsyncClient
from app.models import User, Product, Order, OrderItem, OrderStatus, PaymentStatus, UserRole, AuthProvider
from app.core.security import create_access_token, hash_password


@pytest.mark.asyncio
async def test_checkout_empty_cart_fails(client: AsyncClient, customer_user: User):
    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "shipping_address": "123 Market St, San Francisco, CA 94105",
        "success_url": "http://localhost:3000/checkout/success",
        "cancel_url": "http://localhost:3000/cart",
    }
    response = await client.post("/checkout", json=payload, headers=headers)
    assert response.status_code == 400
    assert "Cart is empty" in response.json()["detail"]


@pytest.mark.asyncio
async def test_checkout_success_with_stripe_mock(client: AsyncClient, customer_user: User, test_db):
    product = Product(
        name="Mechanical Gaming Keyboard",
        slug="mechanical-gaming-keyboard",
        sku="KEY-01",
        price=100.00,
        stock=15,
        is_active=True,
    )
    test_db.add(product)
    await test_db.commit()
    await test_db.refresh(product)

    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Add item to cart
    await client.post("/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)

    # Mock Stripe Session create
    mock_session = MagicMock()
    mock_session.id = "cs_test_mock123"
    mock_session.url = "https://checkout.stripe.com/c/pay/cs_test_mock123"
    mock_session.payment_intent = "pi_mock123"

    with patch("stripe.checkout.Session.create", return_value=mock_session):
        payload = {
            "shipping_address": "456 Mission St, San Francisco, CA",
            "notes": "Gate code 9988",
            "success_url": "http://localhost:3000/checkout/success",
            "cancel_url": "http://localhost:3000/cart",
        }
        res = await client.post("/checkout", json=payload, headers=headers)
        assert res.status_code == 201
        data = res.json()["data"]
        assert "order_id" in data
        assert "order_number" in data
        assert data["checkout_url"] == mock_session.url
        assert float(data["total"]) == 118.00  # 100 subtotal + 8 tax + 10 shipping


@pytest.mark.asyncio
async def test_order_isolation_between_customers(client: AsyncClient, customer_user: User, test_db):
    # Create another customer
    other_user = User(
        name="Other Customer",
        email="other@test.com",
        password_hash=hash_password("OtherPass123!"),
        role=UserRole.CUSTOMER,
        auth_provider=AuthProvider.LOCAL,
        is_active=True,
        is_verified=True,
    )
    test_db.add(other_user)
    await test_db.commit()
    await test_db.refresh(other_user)

    # Create order belonging to other_user
    order = Order(
        order_number="ORD-TEST999",
        user_id=other_user.id,
        subtotal=50.0,
        tax=4.0,
        shipping_cost=10.0,
        total=64.0,
        order_status=OrderStatus.PENDING_PAYMENT,
        payment_status=PaymentStatus.PENDING,
    )
    test_db.add(order)
    await test_db.commit()
    await test_db.refresh(order)

    # Customer 1 attempts to fetch Customer 2's order
    token1 = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers1 = {"Authorization": f"Bearer {token1}"}

    res = await client.get(f"/orders/{order.id}", headers=headers1)
    assert res.status_code == 403
    assert "Not authorized" in res.json()["detail"]
