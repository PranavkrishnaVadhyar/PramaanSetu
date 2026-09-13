from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.utils.logging import get_logger

logger = get_logger("module2.registry")

RegistryStatus = Literal["clear", "blacklisted", "under_investigation", "not_found", "expired"]


@dataclass
class RegistryResult:
    status: RegistryStatus
    issuing_authority: str
    document_expired: bool
    name: str | None = None


async def registry_lookup(
    db: AsyncSession,
    doc_type: str,
    id_number: str,
) -> RegistryResult:
    """
    Query the registry table for a given document type + ID number.
    Returns a RegistryResult with resolved status and issuing authority.
    """
    # Normalise ID number (strip spaces, hyphens for Aadhaar)
    clean_id = id_number.replace(" ", "").replace("-", "").upper()

    record = await crud.registry_lookup(db, doc_type, clean_id)

    _AUTHORITY_DEFAULTS = {
        "passport": "Ministry of External Affairs, Government of India",
        "aadhaar":  "Unique Identification Authority of India (UIDAI)",
        "pan":      "Income Tax Department, Government of India",
    }

    if record is None:
        logger.info(
            "registry: doc_type='%s' id='%s' → not_found",
            doc_type, clean_id,
        )
        return RegistryResult(
            status="clear",   # absence from registry ≠ flagged
            issuing_authority=_AUTHORITY_DEFAULTS.get(doc_type, "Unknown Authority"),
            document_expired=False,
        )

    # Check expiry
    expired = False
    if record.dob is not None and record.status == "active":
        # For passports: status alone not enough, but no expiry date stored here
        # Expired status is set explicitly in the registry
        pass
    if record.status == "expired":
        expired = True

    # Map DB status to API status
    api_status: RegistryStatus
    if record.status == "blacklisted":
        api_status = "blacklisted"
    elif record.status == "under_investigation":
        api_status = "under_investigation"
    elif record.status == "expired":
        api_status = "clear"   # expired ≠ fraudulent; flagged via document_expired
        expired = True
    else:
        api_status = "clear"

    logger.info(
        "registry: doc_type='%s' id='%s' → status='%s' expired=%s",
        doc_type, clean_id, api_status, expired,
    )

    return RegistryResult(
        status=api_status,
        issuing_authority=record.issuing_authority,
        document_expired=expired,
        name=record.name,
    )
