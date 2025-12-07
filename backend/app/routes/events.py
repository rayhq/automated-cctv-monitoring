from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import SessionLocal
from app import models, schemas

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.EventRead])
def list_events(limit: int = 50, db: Session = Depends(get_db)):
    events = (
        db.query(models.Event)
        .order_by(models.Event.timestamp.desc())
        .limit(limit)
        .all()
    )
    return events

@router.post("/", response_model=schemas.EventRead, status_code=status.HTTP_201_CREATED)
def create_event(event_in: schemas.EventCreate, db: Session = Depends(get_db)):
    """Create a new security event (used by detector/YOLO script)."""
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
    return event
