# app/schemas.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# =====================
# User / Auth
# =====================

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False


class UserCreate(BaseModel):
    username: str
    full_name: Optional[str] = None
    password: str


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True  # Pydantic v2 replacement for orm_mode


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# =====================
# Events
# =====================

class EventBase(BaseModel):
    camera_id: str
    event_type: str
    confidence: Optional[float] = None
    description: Optional[str] = None
    image_path: Optional[str] = None


class EventCreate(EventBase):
    # same fields as base when creating
    pass


class EventRead(EventBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True  # IMPORTANT for SQLAlchemy -> Pydantic


class EventStats(BaseModel):
    total_events: int
    intrusion_events: int
    last_event_time: Optional[datetime] = None


# =====================
# Cameras
# =====================

class CameraBase(BaseModel):
    camera_id: str
    name: str
    rtsp_url: str
    location: Optional[str] = None
    is_active: bool = True


class CameraCreate(CameraBase):
    pass


class CameraRead(CameraBase):
    id: int

    class Config:
        from_attributes = True
