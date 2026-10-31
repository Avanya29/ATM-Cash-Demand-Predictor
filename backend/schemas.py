"""
backend/schemas.py
Pydantic request/response schemas for the ATM Cash Demand Predictor API.
"""
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict
import re


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------
class PredictionRequest(BaseModel):
    atm_name: str
    forecast_date: str  # Expected: YYYY-MM-DD

    @field_validator("forecast_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        pattern = r"^\d{4}-\d{2}-\d{2}$"
        if not re.match(pattern, v):
            raise ValueError(
                f"forecast_date must be in YYYY-MM-DD format, got: '{v}'"
            )
        return v


class PredictionResponse(BaseModel):
    atm_name: str
    forecast_date: str
    predicted_demand: float
    model_used: Optional[str] = None


# ---------------------------------------------------------------------------
# ATM & Model Info
# ---------------------------------------------------------------------------
class ATMListResponse(BaseModel):
    atms: List[str]


class ModelInfoResponse(BaseModel):
    model_name: str
    model_path: str
    dataset_coverage: Dict[str, str]
    supported_atms: List[str]


# ---------------------------------------------------------------------------
# Health / Root
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    active_model: Optional[str] = None


class RootResponse(BaseModel):
    message: str
    active_model: Optional[str] = None
