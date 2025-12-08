# app/websockets.py
from typing import List
from fastapi import WebSocket, WebSocketDisconnect
import json


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        """Send a JSON-serializable message to all connected clients."""
        dead: list[WebSocket] = []

        for ws in self.active_connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                # If a client is dead/closed, mark it for removal
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
