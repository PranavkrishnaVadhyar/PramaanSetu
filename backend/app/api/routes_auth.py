"""
Auth routes — signup and login.

POST /api/auth/signup
POST /api/auth/login
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.auth.passwords import hash_password, verify_password
from app.db import crud
from app.db.session import get_db
from app.schemas.auth import TokenResponse, UserCreate, UserLogin, UserResponse
from app.utils.logging import get_logger

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = get_logger("api.auth")


# ── POST /api/auth/signup ─────────────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Register a new user. Returns a JWT token on success.
    Raises 409 if email is already registered.
    """
    existing = await crud.get_user_by_email(db, payload.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    hashed = hash_password(payload.password)
    user = await crud.create_user(
        db,
        email=payload.email,
        password_hash=hashed,
        organization_name=payload.organization_name,
    )
    await db.commit()

    token = create_access_token(str(user.id))
    logger.info("New user registered: %s", user.email)

    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_name=user.organization_name,
            created_at=user.created_at,
        ),
    )


# ── POST /api/auth/login ──────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with email and password. Returns a JWT token on success.
    Returns 401 on bad credentials (no user-enumeration distinction).
    """
    user = await crud.get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(str(user.id))
    logger.info("User logged in: %s", user.email)

    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_name=user.organization_name,
            created_at=user.created_at,
        ),
    )
