"""
Database seed script — development/demo data only.
Creates: admin, staff, customer users + categories + products + sample orders.
"""
import asyncio
import logging
from decimal import Decimal
from datetime import datetime, timezone

from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal, engine
from app.models import (
    User, Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Payment,
    NotificationPreference, UserRole, AuthProvider, OrderStatus, PaymentStatus, Base
)
from app.core.security import hash_password

logger = logging.getLogger(__name__)


SEED_USERS = [
    {"name": "Admin User", "email": "admin@smartecommerce.com", "password": "Admin123!", "role": UserRole.ADMIN},
    {"name": "Staff Member", "email": "staff@smartecommerce.com", "password": "Staff123!", "role": UserRole.STAFF},
    {"name": "John Customer", "email": "customer@smartecommerce.com", "password": "Customer123!", "role": UserRole.CUSTOMER},
]

SEED_CATEGORIES = [
    {"name": "Electronics", "description": "Gadgets and electronic devices"},
    {"name": "Clothing", "description": "Fashion and apparel"},
    {"name": "Books", "description": "Physical and digital books"},
    {"name": "Home & Garden", "description": "Home improvement and garden supplies"},
    {"name": "Sports", "description": "Sports and outdoor equipment"},
]

SEED_PRODUCTS = [
    {"name": "Wireless Bluetooth Headphones", "price": 2499.00, "stock": 50, "sku": "ELEC-001", "category": "Electronics", "description": "Premium noise-cancelling wireless headphones with 30hr battery life.", "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"},
    {"name": "Smart Watch Pro X", "price": 4999.00, "stock": 25, "sku": "ELEC-002", "category": "Electronics", "description": "Feature-packed smartwatch with health monitoring and GPS.", "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"},
    {"name": "USB-C Hub 7-in-1", "price": 1299.00, "stock": 100, "sku": "ELEC-003", "category": "Electronics", "description": "7-port USB-C hub with HDMI, SD card, and USB 3.0 ports.", "image": "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&auto=format&fit=crop&q=80"},
    {"name": "Mechanical Keyboard RGB", "price": 3499.00, "stock": 30, "sku": "ELEC-004", "category": "Electronics", "description": "Tactile mechanical keyboard with per-key RGB lighting.", "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80"},
    {"name": "Classic Cotton T-Shirt", "price": 699.00, "stock": 200, "sku": "CLTH-001", "category": "Clothing", "description": "100% organic cotton unisex t-shirt, available in multiple colors.", "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80"},
    {"name": "Slim Fit Jeans", "price": 1499.00, "stock": 80, "sku": "CLTH-002", "category": "Clothing", "description": "Modern slim fit jeans with stretch comfort.", "image": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80"},
    {"name": "Waterproof Jacket", "price": 2999.00, "stock": 40, "sku": "CLTH-003", "category": "Clothing", "description": "Lightweight waterproof jacket for outdoor adventures.", "image": "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80"},
    {"name": "The Pragmatic Programmer", "price": 899.00, "stock": 60, "sku": "BOOK-001", "category": "Books", "description": "Essential guide to modern software development practices.", "image": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80"},
    {"name": "Clean Architecture", "price": 799.00, "stock": 45, "sku": "BOOK-002", "category": "Books", "description": "Robert C. Martin's definitive guide to software architecture.", "image": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"},
    {"name": "Yoga Mat Premium", "price": 999.00, "stock": 70, "sku": "SPRT-001", "category": "Sports", "description": "Non-slip premium yoga mat with alignment lines.", "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop&q=80"},
]


import re

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return re.sub(r"^-+|-+$", "", text)


async def seed():
    logger.info("🌱 Starting database seed...")

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.execute(select(User).where(User.email == "admin@smartecommerce.com"))
        if existing.scalar_one_or_none():
            logger.info("✅ Database already seeded — skipping")
            return

        # Seed users
        users = {}
        for u_data in SEED_USERS:
            user = User(
                name=u_data["name"],
                email=u_data["email"],
                password_hash=hash_password(u_data["password"]),
                role=u_data["role"],
                auth_provider=AuthProvider.LOCAL,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()
            db.add(NotificationPreference(user_id=user.id))
            users[u_data["role"]] = user
            logger.info(f"   Created user: {u_data['email']} ({u_data['role'].value})")

        # Seed categories
        categories = {}
        for c_data in SEED_CATEGORIES:
            cat = Category(name=c_data["name"], slug=slugify(c_data["name"]), description=c_data["description"])
            db.add(cat)
            await db.flush()
            categories[c_data["name"]] = cat
            logger.info(f"   Created category: {c_data['name']}")

        # Seed products
        products = []
        for p_data in SEED_PRODUCTS:
            cat = categories.get(p_data["category"])
            product = Product(
                name=p_data["name"],
                slug=slugify(p_data["name"]),
                description=p_data["description"],
                price=p_data["price"],
                stock=p_data["stock"],
                sku=p_data["sku"],
                category_id=cat.id if cat else None,
                is_active=True,
            )
            db.add(product)
            products.append(product)
            logger.info(f"   Created product: {p_data['name']}")

        await db.flush()
        for i, p_data in enumerate(SEED_PRODUCTS):
            if "image" in p_data and i < len(products):
                db.add(ProductImage(
                    product_id=products[i].id,
                    url=p_data["image"],
                    filename=products[i].slug + ".jpg",
                    is_primary=True,
                    sort_order=0
                ))
        await db.flush()

        # Create a sample order for the customer
        customer = users.get(UserRole.CUSTOMER)
        if customer and products:
            order = Order(
                order_number="ORD-DEMO001",
                user_id=customer.id,
                subtotal=79.99,
                tax=6.40,
                shipping_cost=5.99,
                discount=0.0,
                total=92.38,
                order_status=OrderStatus.DELIVERED,
                payment_status=PaymentStatus.SUCCESS,
                shipping_address="123 Demo Street, Test City, TC 12345",
            )
            db.add(order)
            await db.flush()

            db.add(OrderItem(
                order_id=order.id,
                product_id=products[0].id,
                product_name_snapshot=products[0].name,
                product_sku_snapshot=products[0].sku,
                unit_price=79.99,
                quantity=1,
                subtotal=79.99,
            ))

            db.add(Payment(
                order_id=order.id,
                amount=92.38,
                currency="usd",
                status=PaymentStatus.SUCCESS,
                transaction_id="pi_demo_test_payment",
                stripe_event_id="evt_demo_test_event",
            ))

        await db.commit()
        logger.info("✅ Seed completed successfully!")
        logger.info("\n📋 Demo credentials:")
        for u_data in SEED_USERS:
            logger.info(f"   {u_data['role'].value}: {u_data['email']} / {u_data['password']}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
