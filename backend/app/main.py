from __future__ import annotations

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for evidence heatmaps (/evidence/{scan_id}_ela.png)
evidence_dir = os.path.join(settings.storage_path, "evidence")
os.makedirs(evidence_dir, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=evidence_dir), name="evidence")

# Register API routes
app.include_router(scans_router)
app.include_router(auth_router)
app.include_router(keys_router)
app.include_router(identity_router)


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "app": "PramaanSetu API"}
