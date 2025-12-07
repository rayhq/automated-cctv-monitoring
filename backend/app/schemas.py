# app/schemas.py
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


# ---------- AUTH / USER ----------

class UserBase(BaseModel):
    username: str
    full_name: str | None = None
    is_active: bool = True
    is_admin: bool = False


class UserCreate(BaseModel):
    username: str
    full_name: str | None = None
    password: str


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True  # Pydantic v2 replacement of orm_mode


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# =====================
# Event Schemas
# =====================


class EventBase(BaseModel):
    camera_id: str
    event_type: str
    confidence: Optional[float] = None
    description: Optional[str] = None
    image_path: Optional[str] = None

class EventCreate(EventBase):
    pass  # same fields when creating

class EventRead(EventBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True

# =====================
# Camera Schemas
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
        from_attributes = True  # Pydantic v2 replacement for orm_mode