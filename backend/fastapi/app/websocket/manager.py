"""
WebSocket Connection Manager.
Manages per-user authenticated WebSocket connections.
"""
import logging
import json
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages active WebSocket connections keyed by user_id.
    Supports multiple connections per user (e.g., multiple browser tabs).
    """

    def __init__(self):
        # user_id -> list of active WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: user={user_id}, total_connections={self.total_connections}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info(f"WebSocket disconnected: user={user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        """Send a JSON message to all connections for a given user."""
        connections = self._connections.get(user_id, [])
        disconnected = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")
                disconnected.append(ws)
        # Clean up broken connections
        for ws in disconnected:
            self.disconnect(user_id, ws)

    async def broadcast(self, message: dict):
        """Broadcast to all connected users (e.g., system announcements)."""
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, message)

    @property
    def total_connections(self) -> int:
        return sum(len(v) for v in self._connections.values())

    @property
    def connected_users(self) -> List[str]:
        return list(self._connections.keys())


# Singleton manager
ws_manager = WebSocketManager()
