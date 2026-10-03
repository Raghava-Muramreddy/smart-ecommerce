"""
Reports router: CSV and PDF export.
"""
import io
import csv
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import require_staff_or_admin
from app.models import Order, OrderItem, Product, User, Payment, PaymentStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])

def get_date_range(range_str: str, start_date: str = None, end_date: str = None):
    now = datetime.utcnow()
    if range_str == "today":
        return now.replace(hour=0, minute=0, second=0), now
    elif range_str == "7days":
        return now - timedelta(days=7), now
    elif range_str == "30days":
        return now - timedelta(days=30), now
    elif range_str == "90days":
        return now - timedelta(days=90), now
    elif range_str == "custom" and start_date and end_date:
        try:
            return datetime.fromisoformat(start_date), datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601.")
    return now - timedelta(days=30), now

def create_pdf(title, period_text, headers, data_rows, col_widths):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(title, styles["h1"]))
    elements.append(Paragraph(f"Period: {period_text} | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC", styles["Normal"]))
    elements.append(Spacer(1, 12))

    data = [headers] + data_rows
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer

def create_csv(headers, data_rows):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(data_rows)
    output.seek(0)
    return io.BytesIO(output.getvalue().encode())

@router.get("/sales/csv", summary="Export sales report as CSV")
async def sales_csv(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(Order).where(and_(Order.created_at >= d_from, Order.created_at <= d_to)).order_by(Order.created_at.desc()))
    orders = result.scalars().all()
    headers = ["Date", "Order Number", "Revenue", "Tax", "Shipping", "Status"]
    data = [[o.created_at.strftime("%Y-%m-%d"), o.order_number, f"{o.total:.2f}", f"{o.tax:.2f}", f"{o.shipping_cost:.2f}", o.order_status.value] for o in orders]
    return StreamingResponse(create_csv(headers, data), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=sales_{range}.csv"})

@router.get("/sales/pdf", summary="Export sales report as PDF")
async def sales_pdf(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(Order).where(and_(Order.created_at >= d_from, Order.created_at <= d_to)).order_by(Order.created_at.desc()))
    orders = result.scalars().all()
    headers = ["Date", "Order Number", "Revenue", "Tax", "Shipping", "Status"]
    data = [[o.created_at.strftime("%Y-%m-%d"), o.order_number, f"${o.total:.2f}", f"${o.tax:.2f}", f"${o.shipping_cost:.2f}", o.order_status.value] for o in orders]
    buffer = create_pdf("Sales Report", f"{d_from.date()} to {d_to.date()}", headers, data, [100, 120, 80, 80, 80, 100])
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=sales_{range}.pdf"})

@router.get("/orders/csv", summary="Export orders report as CSV")
async def orders_csv(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(Order).where(and_(Order.created_at >= d_from, Order.created_at <= d_to)).options(selectinload(Order.items)).order_by(Order.created_at.desc()))
    orders = result.scalars().all()
    headers = ["Order Number", "Date", "Items", "Total", "Status", "Payment"]
    data = [[o.order_number, o.created_at.strftime("%Y-%m-%d"), sum(i.quantity for i in o.items), f"{o.total:.2f}", o.order_status.value, o.payment_status.value] for o in orders]
    return StreamingResponse(create_csv(headers, data), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=orders_{range}.csv"})

@router.get("/orders/pdf", summary="Export orders report as PDF")
async def orders_pdf(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(Order).where(and_(Order.created_at >= d_from, Order.created_at <= d_to)).options(selectinload(Order.items)).order_by(Order.created_at.desc()))
    orders = result.scalars().all()
    headers = ["Order Number", "Date", "Items", "Total", "Status", "Payment"]
    data = [[o.order_number, o.created_at.strftime("%Y-%m-%d"), str(sum(i.quantity for i in o.items)), f"${o.total:.2f}", o.order_status.value, o.payment_status.value] for o in orders]
    buffer = create_pdf("Orders Report", f"{d_from.date()} to {d_to.date()}", headers, data, [120, 100, 60, 80, 100, 100])
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=orders_{range}.pdf"})

@router.get("/products/csv", summary="Export products report as CSV")
async def products_csv(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(Product).where(and_(Product.created_at >= d_from, Product.created_at <= d_to)).options(selectinload(Product.category)).order_by(Product.name))
    products = result.scalars().all()
    headers = ["SKU", "Name", "Category", "Price", "Stock", "Active", "Created"]
    data = [[p.sku, p.name, p.category.name if p.category else "", f"{p.price:.2f}", p.stock, "Yes" if p.is_active else "No", p.created_at.strftime("%Y-%m-%d")] for p in products]
    return StreamingResponse(create_csv(headers, data), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=products.csv"})

@router.get("/products/pdf", summary="Export products report as PDF")
async def products_pdf(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(Product).where(and_(Product.created_at >= d_from, Product.created_at <= d_to)).options(selectinload(Product.category)).order_by(Product.name))
    products = result.scalars().all()
    headers = ["SKU", "Name", "Category", "Price", "Stock", "Created"]
    data = [[p.sku, p.name[:30], p.category.name if p.category else "", f"${p.price:.2f}", str(p.stock), p.created_at.strftime("%Y-%m-%d")] for p in products]
    buffer = create_pdf("Products Report", f"{d_from.date()} to {d_to.date()}", headers, data, [100, 200, 100, 80, 60, 80])
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=products.pdf"})

@router.get("/customers/csv", summary="Export customers report as CSV")
async def customers_csv(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(User).where(and_(User.created_at >= d_from, User.created_at <= d_to)).order_by(User.created_at.desc()))
    users = result.scalars().all()
    headers = ["Name", "Email", "Role", "Active", "Verified", "Provider", "Joined"]
    data = [[u.name, u.email, u.role.value, "Yes" if u.is_active else "No", "Yes" if u.is_verified else "No", u.auth_provider.value, u.created_at.strftime("%Y-%m-%d")] for u in users]
    return StreamingResponse(create_csv(headers, data), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=customers.csv"})

@router.get("/customers/pdf", summary="Export customers report as PDF")
async def customers_pdf(
    range: str = Query("30days", enum=["today", "7days", "30days", "90days", "custom"]),
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user=Depends(require_staff_or_admin), db: AsyncSession = Depends(get_db),
):
    d_from, d_to = get_date_range(range, start_date, end_date)
    result = await db.execute(select(User).where(and_(User.created_at >= d_from, User.created_at <= d_to)).order_by(User.created_at.desc()))
    users = result.scalars().all()
    headers = ["Name", "Email", "Role", "Active", "Joined"]
    data = [[u.name, u.email, u.role.value, "Yes" if u.is_active else "No", u.created_at.strftime("%Y-%m-%d")] for u in users]
    buffer = create_pdf("Customers Report", f"{d_from.date()} to {d_to.date()}", headers, data, [150, 200, 80, 80, 100])
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=customers.pdf"})
