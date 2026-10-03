"""
Tests for Categories and Products API.
- Customer browsing, searching, filtering, and sorting
- RBAC protection (only staff/admin can create/update/delete)
- Pagination and inventory stock checks
"""
import pytest
from httpx import AsyncClient
from app.models import User, Category, Product
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_get_categories_empty(client: AsyncClient):
    response = await client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_create_category_admin(client: AsyncClient, admin_user: User):
    token = create_access_token(subject=admin_user.id, extra_claims={"role": admin_user.role.value, "email": admin_user.email})
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "name": "Electronics",
        "description": "Electronic gadgets and devices",
    }
    response = await client.post("/categories", json=payload, headers=headers)
    assert response.status_code == 201
    res_data = response.json()["data"]
    assert res_data["name"] == "Electronics"
    assert res_data["slug"] == "electronics"


@pytest.mark.asyncio
async def test_create_category_customer_forbidden(client: AsyncClient, customer_user: User):
    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {"name": "Fashion"}
    response = await client.post("/categories", json=payload, headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_product_admin(client: AsyncClient, admin_user: User, test_db):
    category = Category(name="Laptops", slug="laptops")
    test_db.add(category)
    await test_db.commit()
    await test_db.refresh(category)

    token = create_access_token(subject=admin_user.id, extra_claims={"role": admin_user.role.value, "email": admin_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "Pro Ultra Laptop",
        "price": 1299.99,
        "stock": 25,
        "sku": "LAP-PRO-01",
        "category_id": category.id,
        "description": "High performance laptop",
    }
    response = await client.post("/products", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Pro Ultra Laptop"
    assert data["stock"] == 25
    assert float(data["price"]) == 1299.99


@pytest.mark.asyncio
async def test_list_products_filtering_and_sorting(client: AsyncClient, test_db):
    p1 = Product(name="Alpha Phone", slug="alpha-phone", sku="PH-01", price=499.00, stock=10, is_active=True)
    p2 = Product(name="Beta Phone", slug="beta-phone", sku="PH-02", price=799.00, stock=5, is_active=True)
    p3 = Product(name="Gamma Tablet", slug="gamma-tablet", sku="TB-01", price=299.00, stock=0, is_active=True)
    test_db.add_all([p1, p2, p3])
    await test_db.commit()

    # Search by keyword
    res = await client.get("/products?search=Phone")
    assert res.status_code == 200
    items = res.json()["data"]["items"]
    assert len(items) == 2

    # In-stock filter
    res_stock = await client.get("/products?in_stock=true")
    assert res_stock.status_code == 200
    stock_items = res_stock.json()["data"]["items"]
    assert all(item["stock"] > 0 for item in stock_items)

    # Price sorting (desc)
    res_sort = await client.get("/products?sort=price_desc")
    assert res_sort.status_code == 200
    sorted_items = res_sort.json()["data"]["items"]
    assert sorted_items[0]["price"] >= sorted_items[1]["price"]
