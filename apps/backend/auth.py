"""
auth.py
-------
Authentication and authorization module for the deployment platform.

Supports:
- JWT token-based authentication
- Role-Based Access Control (RBAC)
- GitHub OAuth integration
- API key authentication for service accounts
"""

import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User, APIKey

logger = logging.getLogger(__name__)

# ── Security Configuration ────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)
security = HTTPBearer(auto_error=False)

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenPayload(BaseModel):
    sub: str  # subject (user ID or email)
    role: str
    exp: datetime
    iat: datetime
    type: str = "access"

class UserCreate(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    full_name: str = Field(..., description="Full name")
    github_id: Optional[str] = Field(None, description="GitHub user ID")
    github_username: Optional[str] = Field(None, description="GitHub username")

class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    github_id: Optional[str]
    github_username: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: str
    password: str

class APIKeyCreate(BaseModel):
    name: str = Field(..., description="API key name/description")
    expires_in_days: Optional[int] = Field(365, description="Expiration in days (default: 365)")

class APIKeyRead(BaseModel):
    id: int
    name: str
    key_prefix: str
    created_at: datetime
    expires_at: Optional[datetime]
    last_used: Optional[datetime]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

# ── Password Utilities ────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

# ── JWT Token Utilities ───────────────────────────────────────────────────────

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[TokenPayload]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(**payload)
    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        return None

# ── API Key Utilities ─────────────────────────────────────────────────────────

def hash_api_key(api_key: str) -> str:
    """Hash an API key for storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()

def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """Verify an API key against its hash."""
    return hmac.compare_digest(hash_api_key(api_key), hashed_key)

def generate_api_key() -> tuple[str, str]:
    """Generate a new API key. Returns (raw_key, hashed_key)."""
    raw_key = f"nimbus_{''.join([os.urandom(4).hex() for _ in range(4)])}"
    hashed_key = hash_api_key(raw_key)
    return raw_key, hashed_key

# ── Authentication Dependencies ───────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT or API key."""
    auth_value = None
    
    # Try JWT from Authorization header
    if credentials:
        auth_value = credentials.credentials
    # Try OAuth2 token
    elif token:
        auth_value = token
    
    if not auth_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Try JWT first
    payload = decode_token(auth_value)
    if payload and payload.type == "access":
        user = db.query(User).filter(User.email == payload.sub, User.is_active == True).first()
        if user:
            user.last_login = datetime.now(timezone.utc)
            db.commit()
            return user
    
    # Try API key
    hashed_key = hash_api_key(auth_value)
    api_key = db.query(APIKey).filter(
        APIKey.key_hash == hashed_key,
        APIKey.is_active == True,
    ).first()
    
    if api_key:
        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key expired",
            )
        api_key.last_used = datetime.now(timezone.utc)
        db.commit()
        return api_key.user
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the current user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user

# ── Role-Based Access Control ─────────────────────────────────────────────────

class RoleChecker:
    """Dependency class for role-based access control."""
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized. Required: {', '.join(self.allowed_roles)}",
            )
        return current_user

# Pre-defined role checkers
require_admin = RoleChecker(["admin"])
require_developer = RoleChecker(["admin", "developer"])
require_viewer = RoleChecker(["admin", "developer", "viewer"])

# ── Authentication Service Functions ─────────────────────────────────────────

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password."""
    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_user(db: Session, user_data: UserCreate) -> User:
    """Create a new user."""
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise ValueError(f"User with email {user_data.email} already exists")
    
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        github_id=user_data.github_id,
        github_username=user_data.github_username,
        role="developer",  # Default role
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created user: %s (id=%d)", user.email, user.id)
    return user

def create_api_key(db: Session, user_id: int, name: str, expires_in_days: int = 365) -> tuple[str, APIKey]:
    """Create a new API key for a user."""
    raw_key, hashed_key = generate_api_key()
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
    
    api_key = APIKey(
        user_id=user_id,
        name=name,
        key_hash=hashed_key,
        key_prefix=raw_key[:12],
        expires_at=expires_at,
        is_active=True,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    logger.info("Created API key '%s' for user_id=%d", name, user_id)
    return raw_key, api_key

# ── GitHub OAuth Utilities ────────────────────────────────────────────────────

def verify_github_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
    """Verify GitHub webhook signature."""
    if not signature_header:
        return False
    
    hash_name, signature = signature_header.split("=", 1)
    if hash_name != "sha256":
        return False
    
    mac = hmac.new(secret.encode(), payload_body, hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest(), signature)

def extract_github_user_info(github_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract user information from GitHub OAuth callback."""
    return {
        "github_id": str(github_payload.get("id")),
        "github_username": github_payload.get("login"),
        "email": github_payload.get("email"),
        "full_name": github_payload.get("name") or github_payload.get("login"),
    }