"""
models.py
---------
SQLAlchemy ORM models for the e-commerce app and deployment platform.

Tables
------
  users        – Platform users with RBAC
  api_keys     – API keys for service authentication
  repositories – GitHub repositories tracked for deployment
  deployments  – Deployment records and status
  products     – Product catalogue
  cart_items   – Shopping cart rows
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    """
    Platform user with role-based access control.

    Roles: admin, developer, viewer
    """
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(255), nullable=False)
    role            = Column(String(50), nullable=False, default="developer", index=True)
    github_id       = Column(String(100), nullable=True, unique=True, index=True)
    github_username = Column(String(100), nullable=True, unique=True, index=True)
    is_active       = Column(Boolean, nullable=False, default=True, index=True)
    created_at      = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    last_login      = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    api_keys      = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    repositories  = relationship("Repository", back_populates="owner", cascade="all, delete-orphan")
    deployments   = relationship("Deployment", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"


# ── APIKey ────────────────────────────────────────────────────────────────────

class APIKey(Base):
    """
    API key for service-to-service authentication.
    """
    __tablename__ = "api_keys"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name       = Column(String(255), nullable=False, description="Human-readable key name")
    key_hash   = Column(String(64), nullable=False, unique=True, index=True)  # SHA256
    key_prefix = Column(String(20), nullable=False, index=True)  # First 12 chars for identification
    is_active  = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_used  = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")

    def __repr__(self) -> str:
        return f"<APIKey id={self.id} prefix={self.key_prefix!r} user_id={self.user_id}>"


# ── Repository ────────────────────────────────────────────────────────────────

class Repository(Base):
    """
    GitHub repository registered for deployment.
    """
    __tablename__ = "repositories"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name            = Column(String(255), nullable=False, index=True)  # e.g., "owner/repo"
    url             = Column(String(512), nullable=False, unique=True, index=True)
    github_id       = Column(String(100), nullable=True, unique=True, index=True)
    default_branch  = Column(String(100), nullable=False, default="main")
    language        = Column(String(50), nullable=True, index=True)
    framework       = Column(String(100), nullable=True, index=True)
    is_active       = Column(Boolean, nullable=False, default=True, index=True)
    created_at      = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at      = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    last_deployed   = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner       = relationship("User", back_populates="repositories")
    deployments = relationship("Deployment", back_populates="repository", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Repository id={self.id} name={self.name!r} user_id={self.user_id}>"


# ── Deployment ────────────────────────────────────────────────────────────────

class Deployment(Base):
    """
    Deployment record tracking a specific deployment of a repository.
    """
    __tablename__ = "deployments"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id   = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha      = Column(String(40), nullable=False, index=True)  # Git commit SHA
    commit_message  = Column(Text, nullable=True)
    branch          = Column(String(100), nullable=False, default="main", index=True)
    status          = Column(String(50), nullable=False, default="pending", index=True)  # pending, building, deploying, running, failed
    public_url      = Column(String(512), nullable=True, index=True)
    dashboard_url   = Column(String(512), nullable=True, index=True)
    image_tag       = Column(String(255), nullable=True)
    kubernetes_ns   = Column(String(100), nullable=True)
    helm_release    = Column(String(100), nullable=True)
    started_at      = Column(DateTime(timezone=True), nullable=True)
    completed_at    = Column(DateTime(timezone=True), nullable=True)
    duration_secs   = Column(Integer, nullable=True)
    error_message   = Column(Text, nullable=True)
    logs            = Column(Text, nullable=True)  # JSON-encoded logs
    created_at      = Column(DateTime(timezone=True), nullable=False, default=_utcnow, index=True)

    # Relationships
    user       = relationship("User", back_populates="deployments")
    repository = relationship("Repository", back_populates="deployments")

    def __repr__(self) -> str:
        return f"<Deployment id={self.id} repo={self.repository_id} status={self.status!r}>"


# ── Product ───────────────────────────────────────────────────────────────────

class Product(Base):
    """
    Represents an item available for purchase in the store.
    """
    __tablename__ = "products"

    __table_args__ = (
        CheckConstraint("price > 0",  name="ck_products_price_positive"),
        CheckConstraint("stock >= 0", name="ck_products_stock_non_negative"),
    )

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    price       = Column(Numeric(10, 2), nullable=False)
    stock       = Column(Integer, nullable=False, default=0)
    category    = Column(String(100), nullable=True, index=True)
    emoji       = Column(String(8), nullable=True)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationship: a product can appear in many cart rows
    cart_items = relationship(
        "CartItem",
        back_populates="product",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name!r} price={self.price}>"


# ── CartItem ──────────────────────────────────────────────────────────────────

class CartItem(Base):
    """
    Represents one line in a user's shopping cart.
    """
    __tablename__ = "cart_items"

    __table_args__ = (
        UniqueConstraint("session_id", "product_id", name="uq_cart_session_product"),
        CheckConstraint("quantity >= 1", name="ck_cart_quantity_positive"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(128), nullable=False, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity   = Column(Integer, nullable=False, default=1)
    added_at   = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationship: each cart item belongs to one product
    product = relationship("Product", back_populates="cart_items")

    def __repr__(self) -> str:
        return (
            f"<CartItem id={self.id} session={self.session_id!r} "
            f"product_id={self.product_id} qty={self.quantity}>"
        )