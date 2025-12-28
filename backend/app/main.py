import threading
import signal
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine
from app.models import all_models as models
from app.api.endpoints import auth, events, cameras, video, admin, settings 
# Ensure video module is correctly referenced if imported from package
import app.api.endpoints.video as video_module 
from app.services.websocket_manager import manager

# ---------------------------------------------------------
# 🛑 GRACEFUL SHUTDOWN LOGIC
# ---------------------------------------------------------
# This event acts as a global "kill switch" for the video loops
stop_event = threading.Event()

def signal_handler(sig, frame):
    print("\n🛑 Ctrl+C received (Signal Handler). Stopping services...")
    # Force reload trigger check
    stop_event.set()
    # Let uvicorn handle the actual exit, but strictly set event first
    
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup Logic
    print("🚀 Server Starting...")
    
    # Register Signal Handlers (Backup for Windows)
    original_sigint = signal.getsignal(signal.SIGINT)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Pass the stop event to the video router
    if hasattr(video_module, "set_stop_event"):
        video_module.set_stop_event(stop_event)

    # 🔍 DEBUG: Print all registered routes
    print("----- REGISTERED ROUTES -----")
    for route in app.routes:
        print(f"📍 {route.path} [{route.name}]")
    print("-----------------------------")

    yield  # The application runs here

    # 2. Shutdown Logic (Triggers on Ctrl+C)
    print("🛑 Server Shutting Down... Signaling threads to stop.")
    stop_event.set()
    
    # Restore original signal handler
    signal.signal(signal.SIGINT, original_sigint)

app = FastAPI(
    title="Automated CCTV Monitoring System",
    version="0.1.0",
    lifespan=lifespan,
)
# Force Reload Trigger 1

# ---------------------------------------------------------
# 🌐 CORS CONFIGURATION
# ---------------------------------------------------------
origins = [
    "*", # Allow all origins for easier local network deployment
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
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_DIR_ABS = BASE_DIR / "media"
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR_ABS)), name="media")

# ---------------------------------------------------------
# 🔗 ROUTERS
# ---------------------------------------------------------
app.include_router(auth.router)
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Cameras"])
app.include_router(video.router, prefix="/api", tags=["Video"])
app.include_router(admin.router)
app.include_router(settings.router)






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
