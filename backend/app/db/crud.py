from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, desc, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Registry, Scan, ScanResult, User, ApiKey


# ── Scan CRUD ────────────────────────────────────────────────────────────────

async def create_scan(
    db: AsyncSession,
    document_type: str,
    document_image_path: str,
    live_capture_path: str | None = None,
    user_id: uuid.UUID | None = None,
    api_key_id: uuid.UUID | None = None,
) -> Scan:
    scan = Scan(
        document_type=document_type,
        status="pending",
        document_image_path=document_image_path,
        live_capture_path=live_capture_path,
        user_id=user_id,
        api_key_id=api_key_id,
    )
    db.add(scan)
    await db.flush()
    return scan


async def get_scan(db: AsyncSession, scan_id: str) -> Scan | None:
    result = await db.execute(select(Scan).where(Scan.id == uuid.UUID(scan_id)))
    return result.scalar_one_or_none()


async def update_scan_status(
    db: AsyncSession, scan_id: str, status: str, completed: bool = False
) -> None:
    scan = await get_scan(db, scan_id)
    if scan is None:
        return
    scan.status = status
    if completed:
        scan.completed_at = datetime.now(timezone.utc)
    await db.flush()


async def list_scans(
    db: AsyncSession,
    q: str | None = None,
    document_type: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
    limit: int = 100,
    user_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """
    Returns scan history items joined with scan_results for risk score/band.
    """
    stmt = (
        select(Scan, ScanResult)
        .outerjoin(ScanResult, ScanResult.scan_id == Scan.id)
        .order_by(desc(Scan.created_at))
        .limit(limit)
    )
    if document_type and document_type != "all":
        stmt = stmt.where(Scan.document_type == document_type)
    if from_dt:
        stmt = stmt.where(Scan.created_at >= from_dt)
    if to_dt:
        stmt = stmt.where(Scan.created_at <= to_dt)
    if user_id:
        stmt = stmt.where(Scan.user_id == user_id)

    rows = (await db.execute(stmt)).all()

    items: list[dict[str, Any]] = []
    for scan, sr in rows:
        # Extract name from extracted_fields JSONB
        name = "Unknown"
        if sr and sr.extracted_fields:
            fn = sr.extracted_fields.get("full_name")
            if fn:
                name = fn.get("text", "Unknown")

        item = {
            "scan_id": str(scan.id),
            "document_type": scan.document_type,
            "name": name,
            "created_at": scan.created_at.isoformat(),
            "risk_score": float(sr.risk_score) if sr else 0.0,
            "risk_band": sr.risk_band if sr else "low",
        }

        # Apply name search filter after we have the name
        if q:
            q_lower = q.lower()
            if q_lower not in item["name"].lower() and q_lower not in item["scan_id"].lower():
                continue

        items.append(item)

    return items


# ── ScanResult CRUD ──────────────────────────────────────────────────────────

async def upsert_scan_result(
    db: AsyncSession,
    scan_id: str,
    **kwargs: Any,
) -> ScanResult:
    existing = await get_scan_result(db, scan_id)
    if existing is None:
        sr = ScanResult(scan_id=uuid.UUID(scan_id), **kwargs)
        db.add(sr)
    else:
        for k, v in kwargs.items():
            setattr(existing, k, v)
        sr = existing
    await db.flush()
    return sr


async def get_scan_result(db: AsyncSession, scan_id: str) -> ScanResult | None:
    result = await db.execute(
        select(ScanResult).where(ScanResult.scan_id == uuid.UUID(scan_id))
    )
    return result.scalar_one_or_none()


async def record_officer_action(
    db: AsyncSession, scan_id: str, action: str
) -> None:
    sr = await get_scan_result(db, scan_id)
    if sr is None:
        return
    sr.officer_action = action
    await db.flush()


# ── Registry CRUD ─────────────────────────────────────────────────────────────

async def registry_lookup(
    db: AsyncSession, document_type: str, id_number: str
) -> Registry | None:
    result = await db.execute(
        select(Registry).where(
            Registry.document_type == document_type,
            Registry.id_number == id_number,
        )
    )
    return result.scalar_one_or_none()


# ── Auth & User CRUD ─────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: str | uuid.UUID) -> User | None:
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def create_user(
    db: AsyncSession,
    email: str,
    password_hash: str,
    organization_name: str | None = None
) -> User:
    user = User(
        email=email,
        password_hash=password_hash,
        organization_name=organization_name,
    )
    db.add(user)
    await db.flush()
    return user

async def get_api_key_by_hash(db: AsyncSession, key_hash: str) -> ApiKey | None:
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None))
    )
    return result.scalar_one_or_none()

async def get_api_keys_by_user(db: AsyncSession, user_id: str | uuid.UUID) -> list[ApiKey]:
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == user_id, ApiKey.revoked_at.is_(None))
        .order_by(desc(ApiKey.created_at))
    )
    return list(result.scalars().all())

async def create_api_key(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    label: str,
    environment: str,
    key_hash: str,
    key_prefix: str,
) -> ApiKey:
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    key = ApiKey(
        user_id=user_id,
        label=label,
        environment=environment,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(key)
    await db.flush()
    return key

async def update_api_key_last_used(db: AsyncSession, key_id: uuid.UUID) -> None:
    key = await db.get(ApiKey, key_id)
    if key:
        key.last_used_at = datetime.now(timezone.utc)
        await db.flush()

async def revoke_api_key(db: AsyncSession, key_id: str | uuid.UUID, user_id: str | uuid.UUID) -> bool:
    if isinstance(key_id, str):
        key_id = uuid.UUID(key_id)
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    key = await db.get(ApiKey, key_id)
    if key and key.user_id == user_id and key.revoked_at is None:
        key.revoked_at = datetime.now(timezone.utc)
        await db.flush()
        return True
    return False
