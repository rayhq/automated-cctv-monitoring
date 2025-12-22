# app/routes/events.py
from typing import List, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from fastapi import (
    APIRouter,
    Depends,
    status,
    WebSocket,
    WebSocketDisconnect,
)

from app.database import SessionLocal
from app import models, schemas


router = APIRouter()


# --------------------------------------------------
# DB dependency
# --------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# WebSocket connection manager
# --------------------------------------------------
class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        for ws in list(self.active_connections):
            try:
                await ws.send_json(message)
            except Exception:
                # drop dead connections
                self.disconnect(ws)


manager = ConnectionManager()


# --------------------------------------------------
# HTTP endpoints
# --------------------------------------------------

@router.get("/", response_model=List[schemas.EventRead])
def list_events(
    limit: int = 50,
    skip: int = 0,
    camera_id: str | None = None,
    event_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Return filtered events with pagination.
    """
    query = db.query(models.Event)

    if camera_id:
        query = query.filter(models.Event.camera_id == camera_id)
    if event_type and event_type != "all":
        query = query.filter(models.Event.event_type == event_type)
    
    # Date filtering
    if start_date:
        # Expect ISO format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
        query = query.filter(models.Event.timestamp >= start_date)
    if end_date:
        query = query.filter(models.Event.timestamp <= end_date)

    events = (
        query.order_by(models.Event.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return events


@router.post("/", response_model=schemas.EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(event_in: schemas.EventCreate, db: Session = Depends(get_db)):
    """
    Create a new security event (YOLO/detector uses this),
    then broadcast it over WebSocket.
    """
    event = models.Event(
        camera_id=event_in.camera_id,
        event_type=event_in.event_type,
        confidence=event_in.confidence,
        description=event_in.description,
        image_path=event_in.image_path,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    payload = schemas.EventRead.from_attributes(event).model_dump()
    await manager.broadcast({"type": "new_event", "event": payload})

    return event


@router.get("/stats", response_model=schemas.EventStats)
def get_event_stats(db: Session = Depends(get_db)):
    """
    Aggregate stats for dashboard cards.
    """
    total_events = db.query(func.count(models.Event.id)).scalar() or 0

    intrusion_events = (
        db.query(func.count(models.Event.id))
        .filter(models.Event.event_type == "intrusion")
        .scalar()
        or 0
    )

    last_event = (
        db.query(models.Event.timestamp)
        .order_by(models.Event.timestamp.desc())
        .first()
    )
    last_event_time = last_event[0] if last_event else None

    return schemas.EventStats(
        total_events=total_events,
        intrusion_events=intrusion_events,
        last_event_time=last_event_time,
    )


# --------------------------------------------------
# WebSocket endpoint
# --------------------------------------------------

@router.websocket("/ws")
async def events_ws(websocket: WebSocket):
    """
    Live events WebSocket:
    ws://127.0.0.1:8000/api/events/ws
    """
    await manager.connect(websocket)
    try:
        # We don't expect messages from the client;
        # just keep the connection open.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
