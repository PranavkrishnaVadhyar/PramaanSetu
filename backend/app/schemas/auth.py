from typing import Optional
from datetime import datetime
import uuid
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    organization_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    organization_name: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class ApiKeyCreate(BaseModel):
    label: str
    environment: str


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    label: str
    environment: str
    key_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None

    # Used by the frontend, map key_prefix to masked_value
    @property
    def masked_value(self) -> str:
        return self.key_prefix


class ApiKeyCreateResponse(ApiKeyResponse):
    full_value: str
