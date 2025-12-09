# app/routes/auth.py
from datetime import datetime, timedelta
import secrets
from app.dependencies import get_current_user
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
# OTP CONFIG + HELPER
# =========================

OTP_LENGTH = 6
OTP_EXP_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def generate_otp() -> str:
    """
    Generate zero-padded numeric OTP, e.g. '034291'
    """
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"


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
# REQUEST OTP FOR RESET (DEV MODE)
# =========================
@router.post("/request-otp")
def request_otp(payload: schemas.OTPRequest, db: Session = Depends(get_db)):
    """
    Start password reset by generating an OTP and storing its hash
    on the user. DEV MODE: OTP is printed in backend logs only.
    """
    identifier = payload.identifier.strip()

    user = (
        db.query(models.User)
        .filter(models.User.username == identifier)
        .first()
    )

    # Do not reveal if user exists -> generic response
    if not user:
        return {"detail": "If an account exists, an OTP has been sent."}

    if user.otp_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account temporarily locked due to too many OTP attempts.",
        )

    code = generate_otp()
    user.otp_code_hash = get_password_hash(code)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXP_MINUTES)
    user.otp_attempts = 0

    db.add(user)
    db.commit()

    # ✅ DEV MODE: PRINT OTP IN TERMINAL
    print("=" * 50)
    print(f"[DEV OTP] Username: {user.username}")
    print(f"[DEV OTP] OTP Code: {code}")
    print("=" * 50)

    return {"detail": "If an account exists, an OTP has been sent."}


# =========================
# RESET PASSWORD WITH OTP
# =========================
@router.post("/reset-with-otp")
def reset_with_otp(payload: schemas.OTPReset, db: Session = Depends(get_db)):
    """
    Verify OTP and set a new password.
    """
    identifier = payload.identifier.strip()

    user = (
        db.query(models.User)
        .filter(models.User.username == identifier)
        .first()
    )

    if not user:
        # avoid username enumeration
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP or identifier.",
        )

    if user.otp_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account temporarily locked due to too many OTP attempts.",
        )

    if not user.otp_code_hash or not user.otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP request. Please request a new OTP.",
        )

    now = datetime.utcnow()
    if user.otp_expires_at < now:
        user.otp_code_hash = None
        user.otp_expires_at = None
        db.add(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    if user.otp_attempts >= OTP_MAX_ATTEMPTS:
        user.otp_locked = True
        db.add(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many OTP attempts. Account locked.",
        )

    # verify numeric code using same hasher as passwords
    if not verify_password(payload.otp, user.otp_code_hash):
        user.otp_attempts += 1
        db.add(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP.",
        )

    # ✅ OTP valid -> reset password
    user.hashed_password = get_password_hash(payload.new_password)
    user.otp_code_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.otp_locked = False

    db.add(user)
    db.commit()

    return {"detail": "Password reset successful. You can now log in."}


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
# USER COUNT (ADMIN ONLY)
# =========================
@router.get("/user-count")
def get_user_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return total number of users in the system.
    Only admins can access this.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins only",
        )

    total = db.query(models.User).count()
    return {"total_users": total}


# =========================
# OPTIONAL LOGOUT
# =========================
@router.post("/logout")
def logout():
    """
    Stateless JWT logout – frontend just deletes the token.
    """
    return {"detail": "Logged out"}
