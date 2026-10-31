# FastAPI Backend — Phase 7 Report

## Architecture Overview

```
backend/
├── __init__.py
├── main.py           — FastAPI app, lifespan, CORS, router registration
├── app_state.py      — Singleton: loads model + datasets once at startup
├── schemas.py        — Pydantic request/response models
├── database.py       — Stub (Phase 8+)
├── auth.py           — Stub (Phase 8+)
├── models.py         — Stub (Phase 8+)
└── routes/
    ├── __init__.py
    ├── prediction.py — POST /predict
    ├── atm.py        — GET /atms
    ├── analytics.py  — Stub (Phase 8+)
    └── auth.py       — Stub (Phase 8+)
```

The API is a thin HTTP adapter around `ml/predict.py`.
No prediction logic is duplicated inside the backend.

---

## Endpoints

| Method | Path | Description | Status Code |
|---|---|---|---|
| GET | `/` | Root — confirms API is running | 200 |
| GET | `/health` | Health check | 200 |
| GET | `/atms` | List of 5 supported ATMs | 200 |
| POST | `/predict` | Forecast ATM cash demand | 200 / 422 / 500 |
| GET | `/analytics` | Placeholder (Phase 8+) | 200 |
| GET | `/auth` | Placeholder (Phase 8+) | 200 |

---

## Request / Response Examples

### POST /predict

**Request:**
```json
{
  "atm_name": "Mount Road ATM",
  "forecast_date": "2017-06-15"
}
```

**Response (200):**
```json
{
  "atm_name": "Mount Road ATM",
  "forecast_date": "2017-06-15",
  "predicted_demand": 5124.08
}
```

**Error — Invalid ATM (422):**
```json
{
  "detail": "Unknown ATM 'Unknown ATM'. Valid ATMs: ['Airport ATM', 'Big Street ATM', 'Christ College ATM', 'KK Nagar ATM', 'Mount Road ATM']"
}
```

**Error — Invalid date format (422):**
```json
{
  "detail": [{"type": "value_error", "msg": "Value error, forecast_date must be in YYYY-MM-DD format, got: '15-06-2017'", ...}]
}
```

---

## Validation

| Case | HTTP Code | Handled by |
|---|---|---|
| Valid request | 200 | Normal flow |
| Invalid ATM name | 422 | `routes/prediction.py` |
| Wrong date format | 422 | Pydantic `field_validator` in `schemas.py` |
| Insufficient history | 422 | `ml/predict.py` raises `ValueError` |
| Model not loaded | 503 | `app_state.is_ready` check |
| Unexpected error | 500 | Generic `Exception` handler |

---

## Connection Between FastAPI and ml/predict.py

1. At startup (`lifespan`), `AppState.load()` reads the model + datasets into memory once.
2. `routes/prediction.py` imports `predict_demand` directly from `ml.predict`.
3. The route passes `state.model`, `state.hist_df`, `state.cleaned_df` to `predict_demand`.
4. No prediction logic exists in the backend layer — it is 100% delegated to `ml/predict.py`.
5. `VALID_ATMS` is also imported from `ml.predict` to keep a single source of truth.

---

## CORS Configuration

```python
allow_origins = [
    "http://localhost:5173",   # Vite/React dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",   # Create-React-App fallback
]
allow_methods = ["*"]
allow_headers = ["*"]
allow_credentials = True
```

---

## Testing Results

| Endpoint | Expected | Actual | Pass |
|---|---|---|---|
| GET / | 200 + message | `{"message": "ATM Cash Demand Predictor API is running"}` | YES |
| GET /health | 200 + status | `{"status": "healthy"}` | YES |
| GET /atms | 200 + 5 ATMs | All 5 ATMs listed | YES |
| POST /predict (valid) | 200 + prediction | `{"predicted_demand": 5124.08}` | YES |
| POST /predict (bad ATM) | 422 | Clear error message | YES |
| POST /predict (bad date) | 422 | Pydantic validation error | YES |

**Prediction match vs `python ml/predict.py`:**
Both return `5124.08` for `Mount Road ATM` on `2017-06-15`. ✅

---

## Command Used

```
python -m uvicorn backend.main:app --reload
```

Swagger UI available at: http://127.0.0.1:8000/docs

---

## Known Limitations

1. **No authentication**: All endpoints are publicly accessible. JWT auth will be added in Phase 8.
2. **No database**: Predictions are not persisted. Database integration is planned for Phase 8.
3. **In-dataset dates only with full context**: For dates beyond 2017-09-29, context features (Festival, Working Day) are estimated via seasonal proxy.
4. **Single model**: Only the Gradient Boosting model is exposed. Future API versions could support model selection.
5. **No rate limiting**: Suitable for development; production deployment would require rate limiting middleware.
