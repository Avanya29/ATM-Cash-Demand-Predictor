"""
backend/routes/atm.py
GET /atms  — returns the list of supported ATMs.
"""
from fastapi import APIRouter
from backend.schemas import ATMListResponse
from ml.predict import VALID_ATMS

router = APIRouter(prefix="/atms", tags=["ATMs"])


@router.get("", response_model=ATMListResponse, summary="List Supported ATMs")
def list_atms():
    """
    Return the list of ATMs supported by the prediction model.
    This list is sourced directly from ml/predict.py (VALID_ATMS),
    so it always stays in sync with what the model actually supports.
    """
    return ATMListResponse(atms=VALID_ATMS)
