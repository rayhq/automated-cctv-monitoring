from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

# ==============================
# PASSWORD HASHING
# ==============================
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plain password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storage."""
    return pwd_context.hash(password)

# ==============================
# JWT TOKENS
# ==============================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
