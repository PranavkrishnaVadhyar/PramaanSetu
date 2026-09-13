"""
FastAPI dependencies for authentication.

Three separate dependency functions:
  - get_current_user: Bearer JWT → User (console/dashboard routes, /api/keys)
  - get_current_user_from_api_key: API key (X-API-Key or Bearer) → User
  - get_current_user_flexible: JWT first, then API key (POST /api/scans)
    Returns Tuple[User, Optional[ApiKey]]
"""
from __future__ import annotations

from typing import Optional, Tuple

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.api_keys import hash_key_for_lookup
from app.auth.jwt import decode_access_token
from app.db import crud
from app.db.models import ApiKey, User
from app.db.session import get_db

# ── helpers ──────────────────────────────────────────────────────────────────

def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    """Pull the raw token from 'Bearer <token>' header, or None."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:].strip()
    return None


async def _user_from_jwt(token: str, db: AsyncSession) -> User:
    try:
        user_id = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def _user_from_api_key(raw_key: str, db: AsyncSession) -> Tuple[User, ApiKey]:
    key_hash = hash_key_for_lookup(raw_key)
    api_key = await crud.get_api_key_by_hash(db, key_hash)
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Update last_used_at (non-blocking)
    await crud.update_api_key_last_used(db, api_key.id)
    user = await crud.get_user_by_id(db, api_key.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this API key not found.",
        )
    return user, api_key


# ── dependencies ─────────────────────────────────────────────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Requires a valid JWT Bearer token. Used on console-only routes."""
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _user_from_jwt(token, db)


async def get_current_user_from_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> Tuple[User, ApiKey]:
    """Requires a valid API key (via X-API-Key header or Bearer token)."""
    raw_key = x_api_key or _extract_bearer(authorization)
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key header or Bearer API key required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _user_from_api_key(raw_key, db)


async def get_current_user_flexible(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Tuple[User, Optional[ApiKey]]:
    """
    Tries JWT Bearer first (console/sandbox), then falls back to API key
    (X-API-Key header or sk_-prefixed Bearer token).
    Returns (user, api_key_or_none).
    """
    authorization = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-API-Key")

    bearer_token = _extract_bearer(authorization)

    # Detect API key: starts with sk_ OR is in X-API-Key header
    if bearer_token and bearer_token.startswith("sk_"):
        user, api_key = await _user_from_api_key(bearer_token, db)
        return user, api_key

    if x_api_key:
        user, api_key = await _user_from_api_key(x_api_key, db)
        return user, api_key

    if bearer_token:
        user = await _user_from_jwt(bearer_token, db)
        return user, None

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a JWT Bearer token or an API key.",
        headers={"WWW-Authenticate": "Bearer"},
    )
