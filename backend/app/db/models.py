from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    organization_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    label = Column(String(255), nullable=False)
    environment = Column(String(20), nullable=False)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    key_prefix = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True)
    document_type = Column(String(20), nullable=False)           # passport | aadhaar | pan
    status = Column(String(30), nullable=False, default="pending")  # PipelineStage value
    document_image_path = Column(Text, nullable=False)
    live_capture_path = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    result = relationship("ScanResult", back_populates="scan", uselist=False)

    __table_args__ = (
        Index("idx_scans_created_at", "created_at"),
        Index("idx_scans_user_id", "user_id"),
    )


class ScanResult(Base):
    __tablename__ = "scan_results"

    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), primary_key=True)
    extracted_fields = Column(JSONB, nullable=False, default=dict)
    validation = Column(JSONB, nullable=False, default=dict)
    tampering = Column(JSONB, nullable=False, default=dict)
    face_verification = Column(JSONB, nullable=True)
    identity_risk = Column(JSONB, nullable=False, default=dict)
    risk_score = Column(Numeric(5, 2), nullable=False, default=0)
    risk_band = Column(String(10), nullable=False, default="low")  # low | medium | high
    top_features = Column(JSONB, nullable=True)
    report_text_en = Column(Text, nullable=True)
    report_text_hi = Column(Text, nullable=True)
    officer_action = Column(String(20), nullable=True)   # clear | review | escalate

    scan = relationship("Scan", back_populates="result")


class Registry(Base):
    __tablename__ = "registry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_type = Column(String(20), nullable=False)
    id_number = Column(String(50), nullable=False)
    name = Column(String(200), nullable=True)
    dob = Column(DateTime(timezone=False), nullable=True)
    status = Column(String(20), nullable=False)          # active | expired | blacklisted | under_investigation
    issuing_authority = Column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("document_type", "id_number", name="uq_registry_doc_id"),
        Index("idx_registry_lookup", "document_type", "id_number"),
    )


# Synthetic identity records are deliberately separate from Registry and scans.
# No Aadhaar number is stored: the application uses only an internal identity ID.
class IdentityProfile(Base):
    __tablename__ = "identity_profiles"

    id = Column(String(64), primary_key=True)  # internal, tenant-scoped identity reference
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    normalized_name = Column(String(200), nullable=False)
    dob = Column(String(10), nullable=True)  # ISO date, not a government identifier
    gender = Column(String(20), nullable=True)
    face_embedding = Column(JSONB, nullable=True)
    aadhaar_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    documents = relationship("IdentityDocument", back_populates="identity_profile")
    correlations = relationship("IdentityCorrelation", back_populates="identity_profile")
    owner = relationship("User")


class IdentityDocument(Base):
    __tablename__ = "identity_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_profile_id = Column(String(32), ForeignKey("identity_profiles.id"), nullable=False)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False, unique=True)
    document_type = Column(String(20), nullable=False)
    correlation_score = Column(Float, nullable=True)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    identity_profile = relationship("IdentityProfile", back_populates="documents")
    scan = relationship("Scan")


class IdentityCorrelation(Base):
    __tablename__ = "identity_correlations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_profile_id = Column(String(32), ForeignKey("identity_profiles.id"), nullable=False)
    # A null source denotes the synthetic Aadhaar anchor rather than a scan.
    source_document_id = Column(UUID(as_uuid=True), ForeignKey("identity_documents.id"), nullable=True)
    target_document_id = Column(UUID(as_uuid=True), ForeignKey("identity_documents.id"), nullable=False)
    name_similarity = Column(Float, nullable=True)
    dob_match = Column(Boolean, nullable=True)
    gender_match = Column(Boolean, nullable=True)
    face_similarity = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    identity_profile = relationship("IdentityProfile", back_populates="correlations")
    target_document = relationship("IdentityDocument", foreign_keys=[target_document_id])
