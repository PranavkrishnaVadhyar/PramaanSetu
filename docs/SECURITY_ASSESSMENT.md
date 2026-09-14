# PramaanSetu API Security Assessment

**Assessment date:** 13 September 2026  
**Target:** Local API at `http://127.0.0.1:8000`  
**Method:** Safe black-box HTTP checks against the running API, followed by targeted configuration/code review. The expanded assessment created disposable accounts, one scan from a repository illustration (not an identity document), and one temporary API key; that key was revoked during the test.

## Scope

The assessment covered authentication gates, exposure of forensic evidence, CORS, and HTTP security headers. It did not include destructive testing, database penetration testing, authenticated cross-account testing, denial-of-service testing, or third-party dependency scanning.

## Test results

| Test | Expected result | Observed result | Status |
| --- | --- | --- | --- |
| `GET /health` | Service responds and includes defensive headers. | `200`; `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a restrictive `Permissions-Policy` were present. | Pass |
| Unauthenticated `GET /api/scans/{uuid}/status` | Request is rejected before a scan can be read. | `401 Unauthorized`. | Pass |
| Public `GET /evidence/does-not-exist.png` | No public static evidence directory is available. | `404 Not Found`. | Pass |
| CORS preflight from `https://attacker.invalid` | Browser origin is not allowed. | `400` with no `Access-Control-Allow-Origin` header. | Pass |
| CORS preflight from `http://localhost:5173` | Configured development UI origin is allowed. | `200` and `Access-Control-Allow-Origin: http://localhost:5173`. | Pass |

## Expanded authenticated test results

| Test | Expected result | Observed result | Status |
| --- | --- | --- | --- |
| Create two disposable users | Isolated user identities can authenticate. | Both sign-ups returned `201`. | Pass |
| User B reads user A's scan status | Do not disclose the scan exists. | `404 Not Found`. | Pass |
| User B reads user A's scan result | Do not disclose the result exists. | `404 Not Found`. | Pass |
| User B records an action on user A's scan | Action must be denied without changing the scan. | `404 Not Found`. | Pass |
| User B requests user A's ELA evidence | Evidence must remain private. | `404 Not Found`. | Pass |
| User A reads their own scan status | The owner retains access. | `200 OK`. | Pass |
| Authenticated non-image upload | Invalid content must be rejected before a scan is created. | `422 Unprocessable Entity`. | Pass |
| Temporary API key | Owner's key can access their scan. | `200 OK`. | Pass |
| Revoked temporary API key | Revoked key cannot access a scan. | `401 Unauthorized`. | Pass |
| Authentication rate limit | Further authentication traffic is throttled after the configured limit. | Sixth request returned `429 Too Many Requests`. | Pass |

## Findings

### SEC-01 — Security headers are missing from error responses

**Severity:** Low  
**Status:** Open

Successful and allowed-CORS responses include the configured security headers. However, the tested `401`, `404`, and CORS `400` responses did not include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`.

This does not bypass authentication or expose evidence, but headers should be consistent across every response. Add these headers in a top-level exception response handler, or configure the reverse proxy/API gateway to append them universally. Re-test unauthenticated and not-found paths after the change.

### SEC-02 — Rate limiting is process-local

**Severity:** Medium for multi-instance deployment; Informational for local development  
**Status:** Open

The current limiter is an in-memory sliding-window guard. It protects a single API process, but its counters are not shared by multiple workers or server instances and reset on restart. Use Redis-backed limits or an API gateway/WAF rate limiter before production deployment.

## Controls verified by review

- Scan status, results, officer actions, and ELA heatmaps require JWT or API-key authentication.
- Scan resources check ownership and return `404` for another tenant's scan.
- ELA evidence is delivered through an authenticated route with `Cache-Control: private, no-store`, not a public static mount.
- Images are limited by size and pixels, decoded, constrained to JPEG/PNG/WebP, rejected when animated/corrupt, and normalized before storage.
- CORS origins are configurable through `CORS_ORIGINS`.

## Recommended next tests

1. Test a valid oversized, animated, and decompression-bomb image using an authenticated test API key.
2. Verify `429` behavior and retry windows for uploads, polling, and Aadhaar verification.
3. Run dependency, secret, and dynamic security scans in CI against an isolated test database.
4. Repeat the assessment behind the intended production reverse proxy with TLS enabled.
