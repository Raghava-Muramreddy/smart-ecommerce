"""
WebSocket router: authenticated real-time notification endpoint.
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_access_token
from app.core.database import AsyncSessionLocal
from app.models import User
from app.websocket.manager import ws_manager
from jose import JWTError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    Authenticated WebSocket endpoint.
    Connect with: ws://localhost:8000/ws/notifications?token=<jwt>
    """
    user_id = None
    try:
        # Authenticate via token query param
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "access":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Verify user exists and is active
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

        await ws_manager.connect(user_id, websocket)

        # Send connection confirmation
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to notifications",
            "user_id": user_id,
        })

        # Keep connection alive, handle client messages
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")

    except JWTError:
        logger.warning(f"Invalid JWT on WebSocket connection")
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally for user {user_id}")

    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")

    finally:
        if user_id:
            ws_manager.disconnect(user_id, websocket)
