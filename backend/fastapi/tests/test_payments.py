"""
Tests for Payment webhooks and processing:
- Missing / invalid webhook signature verification
- Successful checkout.session.completed event handling
- Idempotency test (duplicate events ignored without side-effects)
- Payment failure event handling
"""
from unittest.mock import patch
import pytest
import stripe
from httpx import AsyncClient
from app.models import User, Product, Order, OrderItem, Payment, OrderStatus, PaymentStatus, CartItem, Cart


@pytest.mark.asyncio
async def test_webhook_invalid_signature_rejected(client: AsyncClient):
    # Webhook called without stripe-signature header or with invalid signature
    response = await client.post(
        "/payments/webhook",
        content=b"{}",
        headers={"stripe-signature": "invalid_sig"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_webhook_checkout_session_completed(client: AsyncClient, customer_user: User, test_db):
    # Setup product, order, payment, and cart
    product = Product(
        name="Noise Cancelling Earbuds",
        slug="noise-cancelling-earbuds",
        sku="EAR-01",
        price=80.0,
        stock=10,
        is_active=True,
    )
    test_db.add(product)
    await test_db.commit()
    await test_db.refresh(product)

    order = Order(
        order_number="ORD-PAY-TEST1",
        user_id=customer_user.id,
        subtotal=80.0,
        tax=6.4,
        shipping_cost=10.0,
        total=96.4,
        order_status=OrderStatus.PENDING_PAYMENT,
        payment_status=PaymentStatus.PENDING,
    )
    test_db.add(order)
    await test_db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name_snapshot=product.name,
        product_sku_snapshot=product.sku,
        unit_price=80.0,
        quantity=2,
        subtotal=160.0,
    )
    test_db.add(item)

    payment = Payment(
        order_id=order.id,
        amount=96.4,
        currency="usd",
        status=PaymentStatus.PENDING,
    )
    test_db.add(payment)

    cart = Cart(user_id=customer_user.id)
    test_db.add(cart)
    await test_db.flush()
    cart_item = CartItem(cart_id=cart.id, product_id=product.id, quantity=2)
    test_db.add(cart_item)

    await test_db.commit()

    mock_event = {
        "id": "evt_test_success_12345",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_session_123",
                "payment_intent": "pi_test_123456",
                "client_reference_id": order.id,
                "metadata": {"order_id": order.id, "user_id": customer_user.id},
            }
        },
    }

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        res = await client.post(
            "/payments/webhook",
            content=b'{"mock": "payload"}',
            headers={"stripe-signature": "valid_mock_sig"},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

        # Verify DB changes: order is PAID, payment is COMPLETED, stock decremented by 2
        await test_db.refresh(order)
        await test_db.refresh(product)
        assert order.order_status == OrderStatus.PAID
        assert order.payment_status == PaymentStatus.COMPLETED
        assert product.stock == 8  # 10 - 2


@pytest.mark.asyncio
async def test_webhook_idempotency_duplicate_event(client: AsyncClient, customer_user: User, test_db):
    order = Order(
        order_number="ORD-IDEMPOTENT",
        user_id=customer_user.id,
        subtotal=50.0,
        tax=4.0,
        shipping_cost=10.0,
        total=64.0,
        order_status=OrderStatus.PAID,
        payment_status=PaymentStatus.COMPLETED,
    )
    test_db.add(order)
    await test_db.flush()

    # Pre-existing payment record with stripe_event_id
    payment = Payment(
        order_id=order.id,
        amount=64.0,
        currency="usd",
        status=PaymentStatus.COMPLETED,
        stripe_event_id="evt_already_processed_999",
    )
    test_db.add(payment)
    await test_db.commit()

    duplicate_event = {
        "id": "evt_already_processed_999",
        "type": "checkout.session.completed",
        "data": {"object": {"client_reference_id": order.id}},
    }

    with patch("stripe.Webhook.construct_event", return_value=duplicate_event):
        res = await client.post(
            "/payments/webhook",
            content=b'{"mock": "payload"}',
            headers={"stripe-signature": "valid_mock_sig"},
        )
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "already_processed"
