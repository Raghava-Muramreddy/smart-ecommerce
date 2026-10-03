"""
Notifications service: create DB notifications and broadcast via WebSocket.
"""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Notification, NotificationType, Order, OrderStatus, User

logger = logging.getLogger(__name__)

# Import WebSocket manager (lazy to avoid circular imports)
_ws_manager = None


def get_ws_manager():
    global _ws_manager
    if _ws_manager is None:
        from app.websocket.manager import ws_manager
        _ws_manager = ws_manager
    return _ws_manager


class NotificationService:

    async def create_notification(
        self,
        db: AsyncSession,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[dict] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data or {},
        )
        db.add(notif)
        await db.flush()

        # Broadcast via WebSocket
        try:
            manager = get_ws_manager()
            await manager.send_to_user(user_id, {
                "type": notification_type.value,
                "title": title,
                "message": message,
                "data": data or {},
                "notification_id": notif.id,
            })
        except Exception as e:
            logger.warning(f"WebSocket broadcast failed: {e}")

        return notif

    async def notify_payment_success(self, order_id: str, user_id: str):
        async with AsyncSessionLocal() as db:
            order_result = await db.execute(select(Order).where(Order.id == order_id))
            order = order_result.scalar_one_or_none()
            if not order:
                return
            await self.create_notification(
                db, user_id,
                NotificationType.PAYMENT_SUCCESS,
                "Payment Successful!",
                f"Your payment for order #{order.order_number} was successful.",
                {"order_id": order_id, "order_number": order.order_number},
            )
            await db.commit()

    async def notify_payment_failed(self, order_id: str, user_id: str):
        async with AsyncSessionLocal() as db:
            order_result = await db.execute(select(Order).where(Order.id == order_id))
            order = order_result.scalar_one_or_none()
            if not order:
                return
            await self.create_notification(
                db, user_id,
                NotificationType.PAYMENT_FAILED,
                "Payment Failed",
                f"Payment for order #{order.order_number} failed. Please try again.",
                {"order_id": order_id, "order_number": order.order_number},
            )
            await db.commit()

    async def notify_order_status_change(self, order_id: str, user_id: str, new_status: OrderStatus):
        status_messages = {
            OrderStatus.CONFIRMED: ("Order Confirmed", "Your order has been confirmed and is being prepared."),
            OrderStatus.PROCESSING: ("Order Processing", "Your order is being processed."),
            OrderStatus.SHIPPED: ("Order Shipped", "Great news! Your order has been shipped."),
            OrderStatus.OUT_FOR_DELIVERY: ("Out for Delivery", "Your order is out for delivery today!"),
            OrderStatus.DELIVERED: ("Order Delivered", "Your order has been delivered. Enjoy!"),
            OrderStatus.CANCELLED: ("Order Cancelled", "Your order has been cancelled."),
        }

        type_map = {
            OrderStatus.SHIPPED: NotificationType.ORDER_SHIPPED,
            OrderStatus.DELIVERED: NotificationType.ORDER_DELIVERED,
            OrderStatus.CANCELLED: NotificationType.ORDER_CANCELLED,
            OrderStatus.CONFIRMED: NotificationType.ORDER_CONFIRMED,
        }

        title, msg = status_messages.get(new_status, ("Order Updated", f"Your order status changed to {new_status.value}"))
        notif_type = type_map.get(new_status, NotificationType.SYSTEM)

        async with AsyncSessionLocal() as db:
            order_result = await db.execute(select(Order).where(Order.id == order_id))
            order = order_result.scalar_one_or_none()
            if not order:
                return
            await self.create_notification(
                db, user_id, notif_type, title, msg,
                {"order_id": order_id, "order_number": order.order_number, "status": new_status.value},
            )
            await db.commit()

    async def notify_low_stock(self, product_id: str, product_name: str, stock: int, admin_user_ids: list):
        async with AsyncSessionLocal() as db:
            for uid in admin_user_ids:
                await self.create_notification(
                    db, uid,
                    NotificationType.LOW_STOCK,
                    "Low Stock Alert",
                    f"Product '{product_name}' has only {stock} units remaining.",
                    {"product_id": product_id, "stock": stock},
                )
            await db.commit()


notification_service = NotificationService()
