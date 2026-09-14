# PramaanSetu API Reference

Base URL: `http://localhost:8000` in local development. Interactive OpenAPI documentation is available at `/docs` while the backend is running.

## Authentication

Register or log in to obtain a JWT. Use it as `Authorization: Bearer <jwt>`. Programmatic verification endpoints also accept a generated API key as either `X-API-Key: <key>` or `Authorization: Bearer <key>`.

Keep API keys secret. A full key is returned only once when it is created.

## Authentication endpoints

### `POST /api/auth/signup`

Creates an account and returns a JWT. Request body:

```json
{"email":"developer@example.com","password":"at-least-8-characters","organization_name":"Example Ltd"}
```

Returns `201` with `{ "token": "...", "user": { "id": "...", "email": "..." } }`. Returns `409` if the email already exists.

### `POST /api/auth/login`

Request body:

```json
{"email":"developer@example.com","password":"at-least-8-characters"}
```

Returns `200` with a JWT and user. Returns `401` for invalid credentials.

## API keys

JWT authentication is required for these endpoints.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/keys` | List active keys for the current account. |
| `POST` | `/api/keys` | Create a key. Body: `{ "label": "Production", "environment": "live" }`; `environment` is `test` or `live`. |
| `DELETE` | `/api/keys/{key_id}` | Revoke a key. |

## Screening a document

### `POST /api/scans`

Requires JWT or API-key authentication. Submit `multipart/form-data`:

| Field | Required | Values / description |
| --- | --- | --- |
| `document_type` | Yes | `aadhaar`, `pan`, or `passport` |
| `document_image` | Yes | Document image file |
| `live_capture_image` | No | Selfie/liveness image for face verification |

Example:

```bash
curl -X POST http://localhost:8000/api/scans \
  -H "X-API-Key: sk_live_your_key" \
  -F "document_type=aadhaar" \
  -F "document_image=@aadhaar.png" \
  -F "live_capture_image=@selfie.jpg"
```

Returns `202` with `{ "scan_id": "uuid" }`. Processing continues in the background.

### `GET /api/scans/{scan_id}/status`

Requires JWT or API-key authentication and only returns a scan owned by the caller. Poll this endpoint until `current_stage` is `done` or `failed`. Pipeline stages are `ocr`, `validation`, `tampering`, `face_verification`, `risk_scoring`, `report_generation`, `done`, and `failed`.

### `GET /api/scans/{scan_id}/result`

Requires JWT or API-key authentication and only returns a scan owned by the caller. Returns the structured screening result after processing. It returns `425 Too Early` while the pipeline is still running. The response includes extracted fields, validation checks, tamper evidence, optional face-verification outcome, identity risk, risk score/band, and English/Hindi report text.

### `GET /api/scans/{scan_id}/evidence/ela`

Requires JWT or API-key authentication and returns the ELA heatmap only to the scan owner. Clients must request the image with their authorization header; it is intentionally not served as a public static file.

### `GET /api/scans`

Requires JWT or API-key authentication. Lists scans belonging to the caller. Optional filters: `q`, `document_type`, `from_dt`, and `to_dt` (ISO 8601 date-times).

### `POST /api/scans/{scan_id}/action`

Record a review outcome. JSON body:

```json
{"action":"review","notes":"Escalated for manual verification"}
```

Allowed actions are `clear`, `review`, and `escalate`.

## Synthetic Aadhaar identity correlation

These endpoints are demo-only and verify against the project’s local synthetic provider. They never call UIDAI.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/identity/aadhaar/verify` | Verify an Aadhaar number and create a tenant-scoped identity anchor. Body: `{ "aadhaar_number": "177589178390" }`. |
| `POST` | `/api/identity/correlate/{scan_id}` | Compare a completed PAN/passport scan with an anchor. Body: `{ "identity_id": "..." }`. |
| `GET` | `/api/identity/{identity_id}` | Read an anchor’s synthetic attributes. |
| `GET` | `/api/identity/{identity_id}/documents` | List linked scanned documents. |
| `GET` | `/api/identity/{identity_id}/correlations` | List individual comparison results. |
| `GET` | `/api/identity/{identity_id}/graph` | Return anchor/document graph data. |

All identity endpoints require JWT or API-key authentication and only expose data owned by the caller. Correlating an unfinished scan returns `425 Too Early`.

## Errors

| Status | Meaning |
| --- | --- |
| `401` | Missing, expired, or invalid credentials. |
| `404` | Resource not found, or not owned by the caller. |
| `409` | Duplicate email during signup. |
| `422` | Invalid request field or document type. |
| `425` | A scan has not finished processing. Poll status and try again. |
| `500` | Unexpected server error; do not retry blindly without inspecting logs. |

## Data handling

The OCR engine runs locally from provisioned model weights. Document images are not sent to a cloud OCR service. Treat uploads, results, JWTs, and API keys as sensitive data.
