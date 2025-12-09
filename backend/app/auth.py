# app/auth.py
from datetime import datetime, timedelta
from typing import Optional
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models

# ==============================
# JWT CONFIG
# ==============================
SECRET_KEY = "super-secret-key-change-this"  # change in real deployment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

# ==============================
# PASSWORD HASHING
#   -> use pbkdf2_sha256 (pure python, no bcrypt)
# ==============================
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],  # ✅ no bcrypt here
    deprecated="auto",
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plain password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storing in DB."""
    return pwd_context.hash(password)

# ==============================
# DB dependency
# ==============================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==============================
# JWT helpers
# ==============================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Read user information from the JWT access token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception

    return user

def get_current_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Ensure current user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


OTP_LENGTH = 6
OTP_EXP_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def generate_otp() -> str:
    # zero-padded 6-digit code
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"