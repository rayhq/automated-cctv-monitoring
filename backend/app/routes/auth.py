# app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import SessionLocal
from app import models, schemas
from app.auth import (
    verify_password,
    create_access_token,
    get_password_hash,
    SECRET_KEY,
    ALGORITHM,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# =========================
# DB DEPENDENCY (LOCAL)
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# LOGIN
# =========================
@router.post("/login")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT access token.
    """
    user = (
        db.query(models.User)
        .filter(models.User.username == payload.username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        data={"sub": user.username, "is_admin": user.is_admin}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
        },
    }


# =========================
# CHANGE PASSWORD
# =========================
@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Change the password for the currently logged-in user.

    - Reads JWT from Authorization: Bearer <token>
    - Decodes it with the same SECRET_KEY / ALGORITHM as login
    - Loads the user from DB
    - Verifies current password
    - Updates to new password
    """

    # 1️⃣ Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = auth_header.split(" ", 1)[1].strip()

    # 2️⃣ Decode JWT and get username (sub)
    try:
        payload_jwt = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload_jwt.get("sub")
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

    # 3️⃣ Load user from DB
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # 4️⃣ Verify current password
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # 5️⃣ Hash & set new password
    user.hashed_password = get_password_hash(payload.new_password)
    db.add(user)
    db.commit()

    return {"detail": "Password updated successfully"}


# =========================
# OPTIONAL LOGOUT
# =========================
@router.post("/logout")
def logout():
    """
    Stateless JWT logout – frontend just deletes the token.
    """
    return {"detail": "Logged out"}
