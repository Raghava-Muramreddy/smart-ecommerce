"""
Cart router: /api/v1/cart/*
All prices are calculated server-side from the database — never trusted from frontend.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import success_response
from app.models import Cart, CartItem, Product, User


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CartItemAddRequest(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1, le=1000)


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=1, le=1000)


class CartItemSchema(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_price: float
    product_image: Optional[str] = None
    quantity: int
    line_total: float
    stock_available: int
    model_config = {"from_attributes": True}


class CartSchema(BaseModel):
    id: str
    items: List[CartItemSchema]
    subtotal: float
    item_count: int


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def get_or_create_cart(user: User, db: AsyncSession) -> Cart:
    result = await db.execute(
        select(Cart).where(Cart.user_id == user.id)
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        await db.commit()
        result = await db.execute(
            select(Cart).where(Cart.id == cart.id)
        )
        cart = result.scalar_one()
    return cart


async def get_cart_schema(cart_id: str, db: AsyncSession) -> CartSchema:
    result = await db.execute(
        select(CartItem)
        .where(CartItem.cart_id == cart_id)
        .options(selectinload(CartItem.product).selectinload(Product.images))
    )
    cart_items = result.scalars().all()
    items = []
    subtotal = 0.0
    for item in cart_items:
        if item.product and item.product.is_active:
            line_total = float(item.product.price) * item.quantity
            subtotal += line_total
            img_url = item.product.images[0].url if item.product.images else None
            items.append(CartItemSchema(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name,
                product_price=float(item.product.price),
                product_image=img_url,
                quantity=item.quantity,
                line_total=round(line_total, 2),
                stock_available=item.product.stock,
            ))
    return CartSchema(
        id=cart_id,
        items=items,
        subtotal=round(subtotal, 2),
        item_count=sum(i.quantity for i in items),
    )


# ─── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", response_model=dict, summary="View current user's cart")
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await get_or_create_cart(current_user, db)
    schema = await get_cart_schema(cart.id, db)
    return success_response(data=schema.model_dump(), message="Cart retrieved")


@router.post("/items", response_model=dict, status_code=201, summary="Add item to cart")
async def add_to_cart(
    payload: CartItemAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate product
    result = await db.execute(
        select(Product).where(Product.id == payload.product_id).where(Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Stock validation (server-side)
    if payload.quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.stock}",
        )

    cart = await get_or_create_cart(current_user, db)

    # Check if product already in cart
    existing_result = await db.execute(
        select(CartItem)
        .where(CartItem.cart_id == cart.id)
        .where(CartItem.product_id == payload.product_id)
    )
    existing_item = existing_result.scalar_one_or_none()

    if existing_item:
        new_qty = existing_item.quantity + payload.quantity
        if new_qty > product.stock:
            raise HTTPException(
                status_code=400,
                detail=f"Total quantity exceeds available stock ({product.stock})",
            )
        existing_item.quantity = new_qty
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(cart_item)

    await db.commit()
    schema = await get_cart_schema(cart.id, db)
    return success_response(data=schema.model_dump(), message="Item added to cart", status_code=201)


@router.patch("/items/{item_id}", response_model=dict, summary="Update cart item quantity")
async def update_cart_item(
    item_id: str,
    payload: CartItemUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await get_or_create_cart(current_user, db)

    result = await db.execute(
        select(CartItem)
        .where(CartItem.id == item_id)
        .where(CartItem.cart_id == cart.id)
        .options(selectinload(CartItem.product))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity > item.product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {item.product.stock}",
        )

    item.quantity = payload.quantity
    await db.commit()

    schema = await get_cart_schema(cart.id, db)
    return success_response(data=schema.model_dump(), message="Cart updated")


@router.delete("/items/{item_id}", response_model=dict, summary="Remove item from cart")
async def remove_cart_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await get_or_create_cart(current_user, db)
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id).where(CartItem.cart_id == cart.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    await db.delete(item)
    await db.commit()

    schema = await get_cart_schema(cart.id, db)
    return success_response(data=schema.model_dump(), message="Item removed")


@router.delete("", response_model=dict, summary="Clear entire cart")
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await get_or_create_cart(current_user, db)
    await db.execute(
        delete(CartItem).where(CartItem.cart_id == cart.id)
    )
    await db.commit()
    return success_response(data={"id": cart.id, "items": [], "subtotal": 0.0, "item_count": 0}, message="Cart cleared")
