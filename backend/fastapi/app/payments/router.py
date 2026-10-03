"""
Stripe payment webhook handler.
- Verifies Stripe signature
- Idempotent: checks stripe_event_id before processing
- Updates order + payment status
- Decrements stock with DB-level locking
- Sends notifications
"""
import logging
from fastapi import APIRouter, Request, HTTPException, status, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

import stripe

from app.core.database import get_db
from app.core.config import settings
from app.core.exceptions import success_response
from app.models import (
    Order, Payment, Product, CartItem, Cart,
    OrderStatus, PaymentStatus, utcnow
)
from app.notifications.service import notification_service
from app.email.service import email_service

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/webhook", summary="Stripe webhook endpoint — do not call manually")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # 1. Verify Stripe signature
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.warning("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.warning("Invalid Stripe signature on webhook")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event["id"]
    event_type = event["type"]
    logger.info(f"Stripe webhook received: {event_type} (event_id={event_id})")

    # 2. Idempotency check — skip if already processed
    payment_result = await db.execute(
        select(Payment).where(Payment.stripe_event_id == event_id)
    )
    if payment_result.scalar_one_or_none():
        logger.info(f"Webhook event {event_id} already processed — skipping")
        return {"status": "already_processed"}

    # 3. Handle events
    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"], event_id, db, background_tasks)

    elif event_type == "payment_intent.payment_failed":
        await _handle_payment_failed(event["data"]["object"], event_id, db, background_tasks)

    elif event_type == "checkout.session.expired":
        await _handle_checkout_expired(event["data"]["object"], event_id, db)

    return {"status": "received"}


async def _handle_checkout_completed(session: dict, event_id: str, db: AsyncSession, background_tasks: BackgroundTasks):
    order_id = session.get("metadata", {}).get("order_id") or session.get("client_reference_id")
    if not order_id:
        logger.error("No order_id in Stripe session metadata")
        return

    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.payment))
    )
    order = result.scalar_one_or_none()
    if not order:
        logger.error(f"Order {order_id} not found for Stripe webhook")
        return

    # Already confirmed — idempotent skip
    if order.order_status != OrderStatus.PENDING_PAYMENT:
        logger.info(f"Order {order_id} already past PENDING_PAYMENT state — skipping")
        return

    # 4. Decrement stock with DB locking (SELECT FOR UPDATE)
    for item in order.items:
        product_result = await db.execute(
            select(Product)
            .where(Product.id == item.product_id)
            .with_for_update()  # Row-level lock prevents overselling
        )
        product = product_result.scalar_one_or_none()
        if product:
            if product.stock < item.quantity:
                logger.error(
                    f"Stock insufficient for product {product.id} during webhook — "
                    f"available: {product.stock}, ordered: {item.quantity}"
                )
                # Flag as failed — refund should be triggered manually or by separate process
                order.order_status = OrderStatus.FAILED
                order.payment_status = PaymentStatus.FAILED
                await db.commit()
                return
            product.stock -= item.quantity

    # 5. Update order and payment status
    order.order_status = OrderStatus.CONFIRMED
    order.payment_status = PaymentStatus.SUCCESS

    if order.payment:
        order.payment.status = PaymentStatus.SUCCESS
        order.payment.stripe_payment_intent_id = session.get("payment_intent")
        order.payment.payment_method = session.get("payment_method_types", ["card"])[0]
        order.payment.stripe_event_id = event_id
        order.payment.transaction_id = session.get("payment_intent")
    else:
        db.add(Payment(
            order_id=order.id,
            amount=float(session.get("amount_total", 0)) / 100,
            currency=session.get("currency", "usd"),
            status=PaymentStatus.SUCCESS,
            stripe_payment_intent_id=session.get("payment_intent"),
            stripe_event_id=event_id,
            transaction_id=session.get("payment_intent"),
        ))

    # 6. Clear the user's cart
    cart_result = await db.execute(select(Cart).where(Cart.user_id == order.user_id))
    cart = cart_result.scalar_one_or_none()
    if cart:
        await db.execute(
            select(CartItem).where(CartItem.cart_id == cart.id)
        )
        # Delete all cart items
        cart_items = await db.execute(select(CartItem).where(CartItem.cart_id == cart.id))
        for ci in cart_items.scalars().all():
            await db.delete(ci)

    await db.commit()
    logger.info(f"Order {order.order_number} confirmed after successful payment")

    # 7. Background: send notifications + email
    background_tasks.add_task(
        notification_service.notify_payment_success,
        order_id=order.id,
        user_id=order.user_id,
    )
    background_tasks.add_task(
        email_service.send_order_confirmation,
        order_id=order.id,
        user_id=order.user_id,
    )


async def _handle_payment_failed(payment_intent: dict, event_id: str, db: AsyncSession, background_tasks: BackgroundTasks):
    pi_id = payment_intent.get("id")
    result = await db.execute(
        select(Order)
        .join(Payment, Order.id == Payment.order_id)
        .where(Payment.stripe_payment_intent_id == pi_id)
        .options(selectinload(Order.payment))
    )
    order = result.scalar_one_or_none()
    if not order:
        logger.warning(f"No order found for failed payment_intent {pi_id}")
        return

    order.order_status = OrderStatus.FAILED
    order.payment_status = PaymentStatus.FAILED
    if order.payment:
        order.payment.status = PaymentStatus.FAILED
        order.payment.stripe_event_id = event_id
        order.payment.failure_reason = payment_intent.get("last_payment_error", {}).get("message")

    await db.commit()
    logger.info(f"Order {order.order_number} marked as FAILED due to payment failure")

    background_tasks.add_task(
        notification_service.notify_payment_failed,
        order_id=order.id,
        user_id=order.user_id,
    )


async def _handle_checkout_expired(session: dict, event_id: str, db: AsyncSession):
    order_id = session.get("client_reference_id")
    if not order_id:
        return
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order and order.order_status == OrderStatus.PENDING_PAYMENT:
        order.order_status = OrderStatus.CANCELLED
        order.payment_status = PaymentStatus.CANCELLED
        await db.commit()
        logger.info(f"Order {order.order_number} cancelled — Stripe session expired")
