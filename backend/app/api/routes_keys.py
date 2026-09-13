"""
API Key management routes.

GET    /api/keys          — list the current user's active API keys
POST   /api/keys          — create a new API key (returns the one-time full value)
DELETE /api/keys/{id}     — revoke (soft-delete) an API key
"""
from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.api_keys import generate_api_key
from app.auth.dependencies import get_current_user
from app.db import crud
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse
from app.utils.logging import get_logger

router = APIRouter(prefix="/api/keys", tags=["keys"])
logger = get_logger("api.keys")


# ── GET /api/keys ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[ApiKeyResponse])
async def list_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ApiKeyResponse]:
    """Return all active (non-revoked) API keys for the authenticated user."""
    keys = await crud.get_api_keys_by_user(db, current_user.id)
    return [
        ApiKeyResponse(
            id=k.id,
            label=k.label,
            environment=k.environment,
            key_prefix=k.key_prefix,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
        )
        for k in keys
    ]


# ── POST /api/keys ────────────────────────────────────────────────────────────

@router.post("", response_model=ApiKeyCreateResponse, status_code=201)
async def create_key(
    payload: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiKeyCreateResponse:
    """
    Create a new API key for the current user.
    The full_value is returned ONCE and never stored — save it securely.
    """
    if payload.environment not in ("test", "live"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="environment must be 'test' or 'live'.",
        )

    full_value, key_hash, key_prefix = generate_api_key(payload.environment)

    key = await crud.create_api_key(
        db,
        user_id=current_user.id,
        label=payload.label,
        environment=payload.environment,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    await db.commit()

    logger.info("API key created: user=%s label=%s env=%s", current_user.email, payload.label, payload.environment)

    return ApiKeyCreateResponse(
        id=key.id,
        label=key.label,
        environment=key.environment,
        key_prefix=key.key_prefix,
        created_at=key.created_at,
        last_used_at=key.last_used_at,
        full_value=full_value,
    )


# ── DELETE /api/keys/{id} ─────────────────────────────────────────────────────

@router.delete("/{key_id}", status_code=200)
async def revoke_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Soft-delete (revoke) an API key. The key_id must belong to the current user."""
    revoked = await crud.revoke_api_key(db, key_id, current_user.id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or already revoked.",
        )
    await db.commit()
    logger.info("API key revoked: user=%s key_id=%s", current_user.email, key_id)
    return {"ok": True}
