"""
Email service: console or SMTP backend with Jinja2 HTML templates.
"""
import logging
import os
from typing import Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import Order, User

logger = logging.getLogger(__name__)

# Template environment
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


class EmailService:

    async def send_email(self, to: str, subject: str, html_body: str):
        """Send email via configured backend."""
        if settings.EMAIL_BACKEND == "console" or settings.is_development:
            logger.info(
                f"\n{'='*60}\n"
                f"[EMAIL - CONSOLE BACKEND]\n"
                f"To: {to}\n"
                f"Subject: {subject}\n"
                f"Body (HTML stripped):\n{self._strip_html(html_body)}\n"
                f"{'='*60}"
            )
            return

        # SMTP backend
        try:
            import aiosmtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to
            msg.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
                use_tls=False,
                start_tls=True,
            )
            logger.info(f"Email sent to {to}: {subject}")
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")

    async def send_order_confirmation(self, order_id: str, user_id: str):
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            order_result = await db.execute(
                select(Order).where(Order.id == order_id).options(selectinload(Order.items))
            )
            order = order_result.scalar_one_or_none()
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()

            if not order or not user:
                return

            html = self._render("order_confirmation.html", order=order, user=user)
            await self.send_email(user.email, f"Order Confirmed — #{order.order_number}", html)

    async def send_payment_failed(self, order_id: str, user_id: str):
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            order_result = await db.execute(select(Order).where(Order.id == order_id))
            order = order_result.scalar_one_or_none()
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not order or not user:
                return
            html = self._render("payment_failed.html", order=order, user=user)
            await self.send_email(user.email, f"Payment Failed — #{order.order_number}", html)

    async def send_order_shipped(self, order_id: str, user_id: str):
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            order_result = await db.execute(select(Order).where(Order.id == order_id))
            order = order_result.scalar_one_or_none()
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not order or not user:
                return
            html = self._render("order_shipped.html", order=order, user=user)
            await self.send_email(user.email, f"Your Order Has Shipped — #{order.order_number}", html)

    def _render(self, template_name: str, **kwargs) -> str:
        try:
            template = jinja_env.get_template(template_name)
            return template.render(**kwargs)
        except Exception as e:
            logger.error(f"Template render error ({template_name}): {e}")
            return f"<p>Email content unavailable</p>"

    @staticmethod
    def _strip_html(html: str) -> str:
        import re
        return re.sub(r"<[^>]+>", "", html).strip()


email_service = EmailService()
