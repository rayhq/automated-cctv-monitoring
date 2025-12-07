# app/models.py
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    Boolean,
)

from app.database import Base

# =========================
# AUTH model
# =========================


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)



# =========================
# Event model
# =========================
class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    camera_id = Column(String, index=True)
    event_type = Column(String, index=True)      # e.g. "intrusion"
    confidence = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    image_path = Column(String, nullable=True)   # e.g. "media/cam1_2025.jpg"


# =========================
# Camera model
# =========================
class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, unique=True, index=True)   # e.g. "cam1"
    name = Column(String)                                 # e.g. "Lab Camera 1"
    rtsp_url = Column(String)                             # RTSP or file path
    location = Column(String, nullable=True)              # e.g. "CS Lab - Block A"
    is_active = Column(Boolean, default=True)
