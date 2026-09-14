from __future__ import annotations

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db.models import Base
from app.db.session import engine
from app.api.routes_scans import router as scans_router
from app.api.routes_auth import router as auth_router
from app.api.routes_keys import router as keys_router
from app.api.routes_identity import router as identity_router
from app.utils.logging import get_logger

logger = get_logger("app.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage directories exist
    os.makedirs(os.path.join(settings.storage_path, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(settings.storage_path, "evidence"), exist_ok=True)

    # Auto-create database tables on startup if database is accessible
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # create_all does not alter existing tables. Keep local/demo
            # databases compatible with the tenant-scoped identity endpoint;
            # the explicit SQL migration remains the production path.
            await conn.execute(text(
                "ALTER TABLE IF EXISTS identity_profiles "
                "ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_identity_profiles_owner_user_id "
                "ON identity_profiles(owner_user_id)"
            ))
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.warning("Could not auto-create database tables on startup: %s", exc)

    yield


app = FastAPI(
    title="PramaanSetu API",
    description="AI-Based Fake Identity & Document Screening System Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow frontend to communicate with API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_rate_windows: dict[tuple[str, str], list[float]] = {}

@app.middleware("http")
async def security_controls(request: Request, call_next):
    """Small dependency-free abuse guard; use Redis/shared limits in production."""
    import time
    path = request.url.path
    if request.method != "OPTIONS":
        category, limit, window = (
            ("auth", 5, 900) if path.startswith("/api/auth/") else
            ("upload", 10, 60) if path == "/api/scans" and request.method == "POST" else
            ("poll", 120, 60) if path.endswith("/status") else
            ("identity", 20, 3600) if path == "/api/identity/aadhaar/verify" else
            ("general", 300, 60)
        )
        client = request.client.host if request.client else "unknown"
        key = (category, client)
        now = time.monotonic()
        entries = [stamp for stamp in _rate_windows.get(key, []) if stamp > now - window]
        if len(entries) >= limit:
            return JSONResponse({"detail": "Rate limit exceeded. Try again later."}, status_code=429)
        entries.append(now)
        _rate_windows[key] = entries
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    return response

# Evidence is served by an authenticated scan route, never as a public static
# directory. Keep the directory private to the application process.
evidence_dir = os.path.join(settings.storage_path, "evidence")
os.makedirs(evidence_dir, exist_ok=True)

# Register API routes
app.include_router(scans_router)
app.include_router(auth_router)
app.include_router(keys_router)
app.include_router(identity_router)


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "app": "PramaanSetu API"}
