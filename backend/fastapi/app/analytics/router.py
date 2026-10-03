"""
Analytics router: /api/v1/analytics/*
All metrics computed from real database data using SQL aggregation.
"""
import logging
from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import require_staff_or_admin
from app.core.exceptions import success_response
from app.models import Order, OrderItem, Product, User, Payment, PaymentStatus, OrderStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])

VALID_RANGES = {"today", "7days", "30days", "90days"}


def get_date_range(range_str: str, start: Optional[str], end: Optional[str]):
    now = datetime.utcnow()
    if range_str == "today":
        return now.replace(hour=0, minute=0, second=0), now
    elif range_str == "7days":
        return now - timedelta(days=7), now
    elif range_str == "30days":
        return now - timedelta(days=30), now
    elif range_str == "90days":
        return now - timedelta(days=90), now
    elif range_str == "custom" and start and end:
        try:
            return datetime.fromisoformat(start), datetime.fromisoformat(end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601.")
    else:
        return now - timedelta(days=30), now


@router.get("/dashboard", response_model=dict, summary="Dashboard KPIs (staff/admin)")
async def get_dashboard(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    date_from, date_to = get_date_range(range, start_date, end_date)

    # Total Revenue
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.payment_status == PaymentStatus.SUCCESS)
        .where(Order.created_at.between(date_from, date_to))
    )
    total_revenue = float(revenue_result.scalar())

    # Total Orders
    orders_result = await db.execute(
        select(func.count(Order.id))
        .where(Order.created_at.between(date_from, date_to))
    )
    total_orders = orders_result.scalar()

    # Pending Orders
    pending_result = await db.execute(
        select(func.count(Order.id))
        .where(Order.order_status == OrderStatus.PENDING_PAYMENT)
    )
    pending_orders = pending_result.scalar()

    # Total Customers
    customers_result = await db.execute(select(func.count(User.id)))
    total_customers = customers_result.scalar()

    # Total Products
    products_result = await db.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )
    total_products = products_result.scalar()

    # Low Stock Products (stock < 10)
    low_stock_result = await db.execute(
        select(func.count(Product.id))
        .where(Product.stock < 10)
        .where(Product.is_active == True)
    )
    low_stock_count = low_stock_result.scalar()

    # Average Order Value
    avg_result = await db.execute(
        select(func.avg(Order.total))
        .where(Order.payment_status == PaymentStatus.SUCCESS)
        .where(Order.created_at.between(date_from, date_to))
    )
    avg_order_value = float(avg_result.scalar() or 0)

    # Payment Success Rate
    success_count = await db.execute(
        select(func.count(Order.id))
        .where(Order.created_at.between(date_from, date_to))
        .where(Order.payment_status == PaymentStatus.SUCCESS)
    )
    total_count = await db.execute(
        select(func.count(Order.id))
        .where(Order.created_at.between(date_from, date_to))
    )
    s = success_count.scalar() or 0
    t = total_count.scalar() or 1
    payment_success_rate = round((s / t) * 100, 1)

    return success_response(
        data={
            "kpis": {
                "total_revenue": round(total_revenue, 2),
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "total_customers": total_customers,
                "total_products": total_products,
                "low_stock_products": low_stock_count,
                "average_order_value": round(avg_order_value, 2),
                "payment_success_rate": payment_success_rate,
            },
            "date_range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        },
        message="Dashboard metrics retrieved",
    )


@router.get("/revenue-trend", response_model=dict, summary="Daily revenue trend")
async def revenue_trend(
    range: str = Query("30days"),
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    date_from, date_to = get_date_range(range, None, None)

    # MySQL DATE() function for grouping by day
    result = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .where(Order.payment_status == PaymentStatus.SUCCESS)
        .where(Order.created_at.between(date_from, date_to))
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    rows = result.all()

    return success_response(
        data=[{"date": str(r.date), "revenue": float(r.revenue), "orders": r.orders} for r in rows],
        message="Revenue trend retrieved",
    )


@router.get("/top-products", response_model=dict, summary="Top selling products")
async def top_products(
    limit: int = Query(10, ge=1, le=50),
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            OrderItem.product_id,
            OrderItem.product_name_snapshot,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.subtotal).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.payment_status == PaymentStatus.SUCCESS)
        .group_by(OrderItem.product_id, OrderItem.product_name_snapshot)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )
    rows = result.all()

    return success_response(
        data=[
            {
                "product_id": r.product_id,
                "product_name": r.product_name_snapshot,
                "units_sold": int(r.units_sold),
                "revenue": float(r.revenue),
            }
            for r in rows
        ],
        message="Top products retrieved",
    )


@router.get("/low-stock", response_model=dict, summary="Low stock products")
async def low_stock_products(
    threshold: int = Query(10, ge=0),
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product)
        .where(Product.stock <= threshold)
        .where(Product.is_active == True)
        .order_by(Product.stock.asc())
    )
    products = result.scalars().all()

    return success_response(
        data=[
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "stock": p.stock,
                "price": float(p.price),
            }
            for p in products
        ],
        message="Low stock products retrieved",
    )


@router.get("/order-status-distribution", response_model=dict, summary="Order status breakdown")
async def order_status_distribution(
    current_user=Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order.order_status, func.count(Order.id).label("count"))
        .group_by(Order.order_status)
    )
    rows = result.all()
    return success_response(
        data=[{"status": r.order_status.value, "count": r.count} for r in rows],
        message="Order status distribution retrieved",
    )
