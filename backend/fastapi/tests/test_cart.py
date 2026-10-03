"""
Tests for Cart operations and business rules:
- Getting cart
- Adding product to cart
- Quantity updates and line total calculations
- Removing cart items
- Stock availability verification
"""
import pytest
from httpx import AsyncClient
from app.models import User, Product
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_get_empty_cart(client: AsyncClient, customer_user: User):
    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/cart", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["items"] == []
    assert data["subtotal"] == 0.0


@pytest.mark.asyncio
async def test_add_item_to_cart_and_calculate_subtotal(client: AsyncClient, customer_user: User, test_db):
    product = Product(
        name="Wireless Noise-Canceling Headphones",
        slug="wireless-noise-canceling-headphones",
        sku="AUD-01",
        price=150.00,
        stock=10,
        is_active=True,
    )
    test_db.add(product)
    await test_db.commit()
    await test_db.refresh(product)

    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 items
    payload = {"product_id": product.id, "quantity": 2}
    response = await client.post("/cart/items", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 2
    assert float(data["subtotal"]) == 300.00


@pytest.mark.asyncio
async def test_add_item_insufficient_stock(client: AsyncClient, customer_user: User, test_db):
    product = Product(
        name="Rare Collectible Item",
        slug="rare-collectible-item",
        sku="COL-01",
        price=50.00,
        stock=2,
        is_active=True,
    )
    test_db.add(product)
    await test_db.commit()
    await test_db.refresh(product)

    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Request 5 items when only 2 are in stock
    payload = {"product_id": product.id, "quantity": 5}
    response = await client.post("/cart/items", json=payload, headers=headers)
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


@pytest.mark.asyncio
async def test_update_item_quantity_and_remove(client: AsyncClient, customer_user: User, test_db):
    product = Product(
        name="Smart Watch Series X",
        slug="smart-watch-series-x",
        sku="WAT-01",
        price=200.00,
        stock=20,
        is_active=True,
    )
    test_db.add(product)
    await test_db.commit()
    await test_db.refresh(product)

    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Add 1 item
    res = await client.post("/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    item_id = res.json()["data"]["items"][0]["id"]

    # Update to 3 items
    res_update = await client.patch(f"/cart/items/{item_id}", json={"quantity": 3}, headers=headers)
    assert res_update.status_code == 200
    data_update = res_update.json()["data"]
    assert data_update["items"][0]["quantity"] == 3
    assert float(data_update["subtotal"]) == 600.00

    # Remove item
    res_delete = await client.delete(f"/cart/items/{item_id}", headers=headers)
    assert res_delete.status_code == 200
    assert len(res_delete.json()["data"]["items"]) == 0
