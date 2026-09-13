-- PostgreSQL migration for deployments that do not use Base.metadata.create_all.
CREATE TABLE IF NOT EXISTS identity_profiles (
    id VARCHAR(64) PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES users(id),
    normalized_name VARCHAR(200) NOT NULL,
    dob VARCHAR(10),
    gender VARCHAR(20),
    face_embedding JSONB,
    aadhaar_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_documents (
    id UUID PRIMARY KEY,
    identity_profile_id VARCHAR(32) NOT NULL REFERENCES identity_profiles(id),
    scan_id UUID NOT NULL UNIQUE REFERENCES scans(id),
    document_type VARCHAR(20) NOT NULL,
    correlation_score DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_correlations (
    id UUID PRIMARY KEY,
    identity_profile_id VARCHAR(32) NOT NULL REFERENCES identity_profiles(id),
    source_document_id UUID REFERENCES identity_documents(id),
    target_document_id UUID NOT NULL REFERENCES identity_documents(id),
    name_similarity DOUBLE PRECISION,
    dob_match BOOLEAN,
    gender_match BOOLEAN,
    face_similarity DOUBLE PRECISION,
    overall_score DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
