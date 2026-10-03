"""
Categories router: /api/v1/categories/*
"""
import re
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import require_staff_or_admin
from app.core.exceptions import success_response
from app.models import Category, Product


class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    is_active: bool
    product_count: int = 0
    model_config = {"from_attributes": True}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return re.sub(r"^-+|-+$", "", text)


router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=dict, summary="List all active categories with product count")
async def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Join with product count
    subq = (
        select(Product.category_id, func.count(Product.id).label("product_count"))
        .where(Product.is_active == True)
        .group_by(Product.category_id)
        .subquery()
    )
    result = await db.execute(
        select(Category, func.coalesce(subq.c.product_count, 0).label("product_count"))
        .outerjoin(subq, Category.id == subq.c.category_id)
        .where(Category.is_active == True)
        .order_by(Category.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.all()

    data = []
    for cat, count in rows:
        d = CategoryResponse.model_validate(cat).model_dump()
        d["product_count"] = count
        data.append(d)

    return success_response(data=data, message="Categories retrieved")


@router.get("/{category_id}", response_model=dict, summary="Get category by ID or slug")
async def get_category(category_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import or_
    result = await db.execute(
        select(Category).where(
            or_(Category.id == category_id, Category.slug == category_id)
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    count_result = await db.execute(
        select(func.count(Product.id)).where(Product.category_id == cat.id).where(Product.is_active == True)
    )
    return success_response(
        data={**CategoryResponse.model_validate(cat).model_dump(), "product_count": count_result.scalar()},
        message="Category retrieved",
    )


@router.post("", response_model=dict, status_code=201, summary="Create category (staff/admin)")
async def create_category(
    payload: CategoryCreateRequest,
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = slugify(payload.name)
    existing = await db.execute(select(Category).where(Category.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Category with this name already exists")

    cat = Category(name=payload.name, slug=slug, description=payload.description)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return success_response(data=CategoryResponse.model_validate(cat).model_dump(), message="Category created", status_code=201)


@router.patch("/{category_id}", response_model=dict, summary="Update category (staff/admin)")
async def update_category(
    category_id: str,
    payload: CategoryUpdateRequest,
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = payload.model_dump(exclude_none=True)
    if "name" in update_data:
        update_data["slug"] = slugify(update_data["name"])
    for k, v in update_data.items():
        setattr(cat, k, v)

    await db.commit()
    await db.refresh(cat)
    return success_response(data=CategoryResponse.model_validate(cat).model_dump(), message="Category updated")


@router.delete("/{category_id}", response_model=dict, summary="Deactivate category (admin only)")
async def delete_category(
    category_id: str,
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if products still depend on it
    count_result = await db.execute(
        select(func.count(Product.id)).where(Product.category_id == category_id).where(Product.is_active == True)
    )
    if count_result.scalar() > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete category with active products. Reassign or deactivate products first.",
        )

    cat.is_active = False
    await db.commit()
    return success_response(message="Category deactivated")
