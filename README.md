# PramaanSetu

## Synthetic identity correlation demo

PramaanSetu includes an optional **cross-document identity consistency** layer.
It uses a local mock Aadhaar provider only; it does not contact UIDAI and must
not be represented as UIDAI authentication or e-KYC. Verify the supplied
synthetic Aadhaar first, then correlate completed Passport or PAN scans:

```http
POST /api/identity/aadhaar/verify
Content-Type: application/json

{"aadhaar_number":"177589178390"}
```

The response returns a tenant-scoped synthetic identity ID (for example,
`ID-8F92A1-a1b2c3d4`), never the Aadhaar number. Use that ID with
`POST /api/identity/correlate/{scan_id}` and then read its graph. All identity
endpoints require the same Bearer JWT or API key authentication as scans.

The new PostgreSQL tables (`identity_profiles`, `identity_documents`, and
`identity_correlations`) are created by the backend's existing startup schema
initialization. For managed deployments, apply from the repository root:
`psql "postgresql://postgres:postgres@localhost:5432/doc_screening" -f backend/migrations/001_identity_correlation.sql`.
For an already-created identity schema, then apply
`backend/migrations/002_identity_profile_tenant_scope.sql`.

Optional environment variables: `IDENTITY_NAME_WEIGHT` (0.35),
`IDENTITY_DOB_WEIGHT` (0.25), `IDENTITY_GENDER_WEIGHT` (0.10),
`IDENTITY_FACE_WEIGHT` (0.30), and `IDENTITY_CORRELATION_RISK_MAX` (40.0).
Run the backend from `backend` and run tests with
`pytest tests/test_identity_correlation.py`.
PramaanSetu — “Bridge to Verification” AI-Powered Identity Verification &amp; Fraud Detection
