"""
schemas.py
----------
Pydantic v2 schemas used for request validation and response serialisation.

Naming convention
-----------------
  <Model>Base    – shared fields (used by Create and Read schemas)
  <Model>Create  – fields accepted on POST / PUT requests
  <Model>Update  – fields accepted on PATCH requests (all optional)
  <Model>Read    – fields returned in API responses (includes id, timestamps)
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Product ───────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name:        str     = Field(..., min_length=1, max_length=200,  description="Product name")
    description: Optional[str] = Field(None, max_length=2000,       description="Long-form description")
    price:       Decimal = Field(..., gt=0,        description="Unit price (must be > 0)")
    stock:       int     = Field(0,  ge=0,                           description="Units in stock")
    category:    Optional[str] = Field(None, max_length=100,         description="Category label")
    emoji:       Optional[str] = Field(None, max_length=8,           description="Display emoji")
    is_active:   bool    = Field(True,                               description="Soft-delete flag")


class ProductCreate(ProductBase):
    """Payload for POST /products"""
    pass


class ProductUpdate(BaseModel):
    """Payload for PATCH /products/{id} — all fields optional."""
    name:        Optional[str]     = Field(None, min_length=1, max_length=200)
    description: Optional[str]     = Field(None, max_length=2000)
    price:       Optional[Decimal] = Field(None, gt=0,)
    stock:       Optional[int]     = Field(None, ge=0)
    category:    Optional[str]     = Field(None, max_length=100)
    emoji:       Optional[str]     = Field(None, max_length=8)
    is_active:   Optional[bool]    = None


class ProductRead(ProductBase):
    """Shape of a product object returned by the API."""
    id:         int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── CartItem ──────────────────────────────────────────────────────────────────

class CartItemBase(BaseModel):
    product_id: int = Field(..., gt=0, description="ID of the product to add")
    quantity:   int = Field(1,  ge=1,  description="Number of units (min 1)")


class CartItemCreate(CartItemBase):
    """Payload for POST /cart — adds or increments a cart item."""
    pass


class CartItemUpdate(BaseModel):
    """Payload for PATCH /cart/{id} — update quantity only."""
    quantity: int = Field(..., ge=1, description="New quantity (min 1)")


class CartItemRead(CartItemBase):
    """Shape of a cart item returned by the API (includes joined product info)."""
    id:         int
    session_id: str
    added_at:   datetime
    updated_at: datetime

    # Nested product snapshot (avoids a second API call from the frontend)
    product:    Optional[ProductRead] = None

    model_config = ConfigDict(from_attributes=True)


# ── Aggregates ────────────────────────────────────────────────────────────────

class CartSummary(BaseModel):
    """Top-level cart response — items + computed totals."""
    items:       list[CartItemRead]
    item_count:  int     = Field(description="Total number of units across all lines")
    total_price: Decimal = Field(description="Sum of (price × quantity) for all items")

    model_config = ConfigDict(from_attributes=True)

    @field_validator("total_price", mode="before")
    @classmethod
    def round_total(cls, v):
        return round(Decimal(str(v)), 2)


# ── Generic responses ─────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    """Generic success / info message."""
    message: str

class HealthResponse(BaseModel):
    """Response shape for GET /health."""
    status:   str
    database: str
    version:  str


# ── Authentication ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Payload for creating a new user."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    full_name: str = Field(..., description="Full name")
    github_id: Optional[str] = Field(None, description="GitHub user ID")
    github_username: Optional[str] = Field(None, description="GitHub username")

class UserRead(BaseModel):
    """Shape of a user object returned by the API."""
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
    """Payload for user login."""
    email: str
    password: str

class Token(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str
    role: str
    exp: datetime
    iat: datetime
    type: str = "access"

class APIKeyCreate(BaseModel):
    """Payload for creating an API key."""
    name: str = Field(..., description="API key name/description")
    expires_in_days: Optional[int] = Field(365, description="Expiration in days")

class APIKeyRead(BaseModel):
    """Shape of an API key returned by the API."""
    id: int
    name: str
    key_prefix: str
    created_at: datetime
    expires_at: Optional[datetime]
    last_used: Optional[datetime]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# ── Repository ────────────────────────────────────────────────────────────────

class RepositoryBase(BaseModel):
    """Base repository schema."""
    name: str = Field(..., description="Repository name (e.g., owner/repo)")
    url: str = Field(..., description="GitHub repository URL")
    github_id: Optional[str] = Field(None, description="GitHub repository ID")
    default_branch: str = Field("main", description="Default branch")
    language: Optional[str] = Field(None, description="Programming language")
    framework: Optional[str] = Field(None, description="Framework detected")

class RepositoryCreate(RepositoryBase):
    """Payload for creating a repository."""
    pass

class RepositoryUpdate(BaseModel):
    """Payload for updating a repository."""
    name: Optional[str] = None
    language: Optional[str] = None
    framework: Optional[str] = None
    is_active: Optional[bool] = None

class RepositoryRead(RepositoryBase):
    """Shape of a repository returned by the API."""
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_deployed: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ── Deployment ────────────────────────────────────────────────────────────────

class DeploymentBase(BaseModel):
    """Base deployment schema."""
    repository_id: int = Field(..., description="Repository ID to deploy")
    branch: str = Field("main", description="Git branch to deploy")

class DeploymentCreate(DeploymentBase):
    """Payload for creating a deployment."""
    environment_vars: Optional[dict[str, str]] = Field(None, description="Environment variables")
    secrets: Optional[dict[str, str]] = Field(None, description="Secrets (will be encrypted)")

class DeploymentRead(DeploymentBase):
    """Shape of a deployment returned by the API."""
    id: int
    user_id: int
    commit_sha: str
    commit_message: Optional[str]
    status: str
    public_url: Optional[str]
    dashboard_url: Optional[str]
    image_tag: Optional[str]
    kubernetes_ns: Optional[str]
    helm_release: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_secs: Optional[int]
    error_message: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DeploymentLogs(BaseModel):
    """Deployment logs response."""
    deployment_id: int
    logs: list[str]
    status: str