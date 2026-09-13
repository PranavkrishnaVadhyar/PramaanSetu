from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/doc_screening"
    hf_api_token: str = ""
    storage_path: str = "./storage"
    risk_model_path: str = "./app/modules/module5_risk/model.joblib"

    # OCR: local PP-OCRv5 recognition model. Keep this directory provisioned
    # during deployment; production scans must not download model files.
    # OCR: local PP-OCRv5 recognition model
    ocr_confidence_threshold: float = 40.0
    paddle_ocr_model_name: str = "PP-OCRv5_mobile_rec"
    paddle_ocr_model_dir: str = "./models/pp-ocrv5-mobile-rec"
    paddle_ocr_device: str = "cpu"
    paddle_ocr_enable_mkldnn: bool = True

    # Auth
    jwt_secret_key: str = "default_secret_key_change_me_in_production"
    jwt_expire_minutes: int = 10080

    # Cross-document identity correlation (synthetic/demo identity provider)
    identity_name_weight: float = 0.35
    identity_dob_weight: float = 0.25
    identity_gender_weight: float = 0.10
    identity_face_weight: float = 0.30
    identity_correlation_risk_max: float = 40.0



@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
