from fastapi import WebSocket
import json
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.poll_subscribers: Dict[int, List[WebSocket]] = {}  # poll_id -> websockets

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        # Remove from all poll subscriptions
        for poll_id in self.poll_subscribers:
            if websocket in self.poll_subscribers[poll_id]:
                self.poll_subscribers[poll_id].remove(websocket)

    async def subscribe_to_poll(self, poll_id: int, websocket: WebSocket):
        if poll_id not in self.poll_subscribers:
            self.poll_subscribers[poll_id] = []
        if websocket not in self.poll_subscribers[poll_id]:
            self.poll_subscribers[poll_id].append(websocket)

    async def unsubscribe_from_poll(self, poll_id: int, websocket: WebSocket):
        if poll_id in self.poll_subscribers and websocket in self.poll_subscribers[poll_id]:
            self.poll_subscribers[poll_id].remove(websocket)

    async def broadcast_to_poll(self, poll_id: int, message: dict):
        if poll_id in self.poll_subscribers:
            disconnected = []
            for websocket in self.poll_subscribers[poll_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.append(websocket)

            # Remove disconnected websockets
            for websocket in disconnected:
                self.disconnect(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            if isinstance(message, dict):
                await websocket.send_text(json.dumps(message))
            else:
                await websocket.send_text(message)
        except Exception:
            pass  # WebSocket might be disconnected

    async def broadcast(self, message: dict):
        disconnected = []
        print(f"Active connections: {self.active_connections}")
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except:
                disconnected.append(websocket)

        # Remove disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)

# Create a global instance of the connection manager
manager = ConnectionManager()
