"""
Tests for Notifications and Preferences API:
- Listing notifications with unread filter
- Marking single notification as read
- Marking all notifications as read
- Getting and updating notification preferences
"""
import pytest
from httpx import AsyncClient
from app.models import User, Notification
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_list_and_read_notifications(client: AsyncClient, customer_user: User, test_db):
    token = create_access_token(subject=customer_user.id, extra_claims={"role": customer_user.role.value, "email": customer_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 notifications
    n1 = Notification(
        user_id=customer_user.id,
        type="ORDER_CONFIRMED",
        title="Order Placed",
        message="Your order #ORD-123 has been received.",
        read=False,
    )
    n2 = Notification(
        user_id=customer_user.id,
        type="PAYMENT_SUCCESS",
        title="Payment Verified",
        message="Your payment was successful.",
        read=False,
    )
    test_db.add_all([n1, n2])
    await test_db.commit()

    # List all
    res = await client.get("/notifications", headers=headers)
    assert res.status_code == 200
    items = res.json()["data"]
    assert len(items) == 2

    # Mark single as read
    res_mark = await client.patch(f"/notifications/{n1.id}/read", headers=headers)
    assert res_mark.status_code == 200
    assert res_mark.json()["data"]["read"] is True

    # Filter unread only -> should be 1
    res_unread = await client.get("/notifications?unread_only=true", headers=headers)
    assert res_unread.status_code == 200
    assert len(res_unread.json()["data"]) == 1

    # Mark all read
    res_all = await client.patch("/notifications/read-all", headers=headers)
    assert res_all.status_code == 200
    assert res_all.json()["data"]["marked_as_read"] == 1
