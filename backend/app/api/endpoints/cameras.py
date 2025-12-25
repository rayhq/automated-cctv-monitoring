# backend/app/routes/cameras.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models import all_models as models
from app.schemas import all_schemas as schemas
from app.core.database import get_db
from app.api.auth import get_current_user  # reads JWT from Authorization header

router = APIRouter()


# ---------- LIST CAMERAS ----------
@router.get("/", response_model=List[schemas.CameraRead])
def list_cameras(db: Session = Depends(get_db)):
    """
    List all cameras.
    Left public so dashboard & live view can load even before
    you lock it down with roles.
    """
    return db.query(models.Camera).all()


# ---------- CREATE CAMERA ----------
@router.post(
    "/",
    response_model=schemas.CameraRead,
    status_code=status.HTTP_201_CREATED,
)
def create_camera(
    camera_in: schemas.CameraCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new camera (must be logged in)."""

    existing = (
        db.query(models.Camera)
        .filter(models.Camera.camera_id == camera_in.camera_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Camera with this camera_id already exists.",
        )

    cam = models.Camera(
        camera_id=camera_in.camera_id,
        name=camera_in.name,
        rtsp_url=camera_in.rtsp_url,
        location=camera_in.location,
        is_active=camera_in.is_active,
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam


# ---------- TOGGLE ACTIVE ----------
@router.patch("/{camera_id}/toggle", response_model=schemas.CameraRead)
def toggle_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Toggle a camera's active state (on/off)."""
    cam = (
        db.query(models.Camera)
        .filter(models.Camera.camera_id == camera_id)
        .first()
    )
    if not cam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )

    cam.is_active = not cam.is_active
    db.commit()
    db.refresh(cam)
    return cam


# ---------- DELETE BY camera_id (Frontend uses this) ----------
@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a camera using its camera_id (e.g. 'cam1')."""
    
    # 1. CLEAN THE INPUT (Fix for "Invisible Space" bug)
    clean_id = camera_id.strip()
    print(f"🗑️ DEBUG: Request to delete camera: '{camera_id}' -> Cleaned: '{clean_id}'")

    # 2. FIND THE CAMERA
    cam = (
        db.query(models.Camera)
        .filter(models.Camera.camera_id == clean_id)
        .first()
    )

    if not cam:
        print(f"❌ DEBUG: Camera '{clean_id}' NOT FOUND in database.")
        
        # Optional: Check if user confused Name with ID
        by_name = db.query(models.Camera).filter(models.Camera.name == clean_id).first()
        if by_name:
             print(f"   (Found camera with NAME='{clean_id}', but its ID is '{by_name.camera_id}')")

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )

    # 3. DELETE HISTORY FIRST
    deleted_events = db.query(models.Event).filter(models.Event.camera_id == clean_id).delete()
    print(f"   - Deleted {deleted_events} events linked to this camera.")

    # 4. DELETE CAMERA
    db.delete(cam)
    db.commit()
    print("✅ Camera deleted successfully.")
    return  # 204


# ---------- DELETE BY PK (numeric id) ----------
@router.delete("/id/{camera_pk}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera_by_id(
    camera_pk: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a camera using its primary key (id in DB)."""
    cam = (
        db.query(models.Camera)
        .filter(models.Camera.id == camera_pk)
        .first()
    )

    if not cam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found",
        )

    # Also fix this one, just in case
    db.query(models.Event).filter(models.Event.camera_id == cam.camera_id).delete()

    db.delete(cam)
    db.commit()
    return  # 204