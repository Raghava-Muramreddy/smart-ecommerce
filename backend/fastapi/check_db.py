import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models import Product, ProductImage

async def check_images():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Product).where(Product.name.in_(["Slim Fit Jeans", "The Pragmatic Programmer"])))
        products = result.scalars().all()
        
        for p in products:
            img_result = await db.execute(select(ProductImage).where(ProductImage.product_id == p.id))
            images = img_result.scalars().all()
            print(f"Product: {p.name}, Images: {[i.url for i in images]}")

if __name__ == "__main__":
    asyncio.run(check_images())
