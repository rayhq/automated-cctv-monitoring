# app/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.database import SessionLocal, engine, Base
from app.models import all_models as models
from app.core.config import settings

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ---------------------------
# DB dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------
# Helper: get current admin
# ---------------------------
def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> models.User:
    """
    Extract JWT from Authorization header, decode it,
    load the user from DB, and ensure they are an admin.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = auth_header.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    return user


# ---------------------------
# Delete ONLY events
# ---------------------------
@router.post("/reset-events")
def reset_events(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),  # just to enforce admin auth
):
    """
    Delete ALL events from the database, but keep users and cameras.
    """
    db.query(models.Event).delete()
    db.commit()
    return {"detail": "All events deleted successfully."}


# ---------------------------
# Full DB reset (users + cameras + events)
# ---------------------------
@router.post("/reset-everything")
def reset_everything(
    _: models.User = Depends(get_current_admin),
):
    """
    Drop and recreate all tables.
    This will wipe users, cameras and events.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"detail": "Full database reset successful."}
