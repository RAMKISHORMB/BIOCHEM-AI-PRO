from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing configuration using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a plain text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash for the given plain text password."""
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], 
    role: str,
    user_id: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Issue a signed JWT access token containing subject, role, user_id and expiration."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "uid": str(user_id)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token signature and expiration."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
