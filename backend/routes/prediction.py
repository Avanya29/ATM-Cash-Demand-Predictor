"""
backend/routes/prediction.py
POST /predict  — calls ml/predict.py, never duplicates prediction logic.
"""
from fastapi import APIRouter, HTTPException

from backend.schemas import PredictionRequest, PredictionResponse
from backend.app_state import state
from ml.predict import predict_demand, VALID_ATMS

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("", response_model=PredictionResponse, summary="Forecast ATM Cash Demand")
def predict(request: PredictionRequest):
    """
    Generate a cash-demand forecast for a specific ATM on a given date.

    - **atm_name**: one of the 5 supported ATMs
    - **forecast_date**: YYYY-MM-DD format

    Returns the predicted total cash withdrawal amount in USD.
    """
    # Validate ATM name against the source-of-truth list from ml/predict.py
    if request.atm_name not in VALID_ATMS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown ATM '{request.atm_name}'. "
                f"Valid ATMs: {VALID_ATMS}"
            ),
        )

    if not state.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Prediction service is not ready yet. Please retry shortly.",
        )

    try:
        predicted = predict_demand(
            atm_name=request.atm_name,
            forecast_date=request.forecast_date,
            historical_data=state.hist_df,
            model=state.model,
            cleaned_df=state.cleaned_df,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {exc}",
        )

    return PredictionResponse(
        atm_name=request.atm_name,
        forecast_date=request.forecast_date,
        predicted_demand=round(predicted, 2),
        model_used=state.model_name,
    )
