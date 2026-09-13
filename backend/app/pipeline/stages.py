from __future__ import annotations
from enum import Enum


class PipelineStage(str, Enum):
    """
    Pipeline stage identifiers — matches the TypeScript PipelineStage union
    type in frontend/src/api/types.ts exactly.
    """
    OCR = "ocr"
    VALIDATION = "validation"
    TAMPERING = "tampering"
    FACE_VERIFICATION = "face_verification"
    RISK_SCORING = "risk_scoring"
    REPORT_GENERATION = "report_generation"
    DONE = "done"
    FAILED = "failed"

    @classmethod
    def active_stages(cls) -> list["PipelineStage"]:
        """Returns the 6 processing stages in execution order (excludes DONE/FAILED)."""
        return [
            cls.OCR,
            cls.VALIDATION,
            cls.TAMPERING,
            cls.FACE_VERIFICATION,
            cls.RISK_SCORING,
            cls.REPORT_GENERATION,
        ]
