# app/main.py
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app import models
from app.routes import auth, events, cameras, video
from app.websockets import manager  # 🔴 NEW: websocket connection manager


# ---------------------------------------------------------
# 🛑 GRACEFUL SHUTDOWN LOGIC
# ---------------------------------------------------------
# This event acts as a global "kill switch" for the video loops
stop_event = threading.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup Logic
    print("🚀 Server Starting...")

    # Pass the stop event to the video router so it can listen for it
    if hasattr(video, "set_stop_event"):
        video.set_stop_event(stop_event)

    yield  # The application runs here

    # 2. Shutdown Logic (Triggers on Ctrl+C)
    print("🛑 Server Shutting Down... Signaling threads to stop.")
    stop_event.set()


# ---------------------------------------------------------
# 🏗️ APP INITIALIZATION
# ---------------------------------------------------------
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated CCTV Monitoring System",
    version="0.1.0",
    lifespan=lifespan,  # <--- Link the shutdown logic here
)

# ---------------------------------------------------------
# 🌐 CORS CONFIGURATION
# ---------------------------------------------------------
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 📂 STATIC MEDIA FILES
# ---------------------------------------------------------
app.mount("/media", StaticFiles(directory="media"), name="media")

# ---------------------------------------------------------
# 🔗 ROUTERS
# ---------------------------------------------------------
app.include_router(auth.router)
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Cameras"])
app.include_router(video.router, tags=["Video"])


# ---------------------------------------------------------
# 🔴 LIVE EVENTS WEBSOCKET
# ---------------------------------------------------------
@app.websocket("/ws/events")
async def events_ws(websocket: WebSocket):
    """
    WebSocket endpoint that pushes new security events to connected clients.

    Frontend will connect to: ws://127.0.0.1:8000/ws/events
    """
    await manager.connect(websocket)
    try:
        while True:
            # We don't really *need* messages from the client, but this
            # keeps the connection alive and avoids disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ---------------------------------------------------------
# 🏥 HEALTH CHECK
# ---------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok"}
