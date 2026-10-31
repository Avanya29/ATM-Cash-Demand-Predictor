"""
tests/test_api.py
Automated integration tests for FastAPI backend endpoints:
- Root and health check
- ATM list and model metadata
- Valid predictions
- Invalid ATM names
- Malformed dates
- Unsupported historical horizons (past/future)
- Missing calendar lag history
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from ml.predict import VALID_ATMS


@pytest.fixture(scope="module")
def client():
    """Create a test client with lifespan executed (loads model once)."""
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client):
    """GET / returns 200 with service message and active model."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "ATM Cash Demand Predictor API is running" in data["message"]
    assert data["active_model"] == "Random Forest"


def test_health_endpoint(client):
    """GET /health returns 200, status='healthy', and model_loaded=True."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["active_model"] == "Random Forest"


def test_model_info_endpoint(client):
    """GET /model-info returns metadata, active model, and supported ATMs."""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["model_name"] == "Random Forest"
    assert "random_forest_pipeline.joblib" in data["model_path"]
    assert "start_date" in data["dataset_coverage"]
    assert "end_date" in data["dataset_coverage"]
    assert data["supported_atms"] == VALID_ATMS


def test_list_atms_endpoint(client):
    """GET /atms returns all 5 valid ATMs."""
    response = client.get("/atms")
    assert response.status_code == 200
    data = response.json()
    assert "atms" in data
    assert len(data["atms"]) == 5
    assert set(data["atms"]) == set(VALID_ATMS)


def test_valid_prediction(client):
    """POST /predict generates a valid forecast for an eligible historical date."""
    payload = {
        "atm_name": "Mount Road ATM",
        "forecast_date": "2017-06-15"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["atm_name"] == "Mount Road ATM"
    assert data["forecast_date"] == "2017-06-15"
    assert isinstance(data["predicted_demand"], (int, float))
    assert data["predicted_demand"] > 0
    assert data["model_used"] == "Random Forest"


def test_valid_prediction_different_atm(client):
    """POST /predict generates a forecast for Big Street ATM."""
    payload = {
        "atm_name": "Big Street ATM",
        "forecast_date": "2017-07-31"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["atm_name"] == "Big Street ATM"
    assert data["predicted_demand"] > 0


def test_invalid_atm_name(client):
    """POST /predict with unknown ATM returns 422 with descriptive detail."""
    payload = {
        "atm_name": "NonExistent ATM",
        "forecast_date": "2017-06-15"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "Unknown ATM 'NonExistent ATM'" in data["detail"]


def test_malformed_date_format(client):
    """POST /predict with invalid date format returns 422 validation error."""
    payload = {
        "atm_name": "Mount Road ATM",
        "forecast_date": "15-06-2017"  # Wrong format, should be YYYY-MM-DD
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "YYYY-MM-DD" in response.text


def test_future_unsupported_date(client):
    """POST /predict for dates beyond dataset coverage returns 422 explaining horizon bounds."""
    payload = {
        "atm_name": "Mount Road ATM",
        "forecast_date": "2026-10-27"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "beyond the supported historical dataset horizon" in data["detail"]


def test_pre_dataset_unsupported_date(client):
    """POST /predict for dates preceding dataset coverage returns 422."""
    payload = {
        "atm_name": "Mount Road ATM",
        "forecast_date": "2010-01-01"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "precedes historical dataset start" in data["detail"]


def test_missing_lag_history_outage_date(client):
    """POST /predict on dates with missing prior calendar lags returns 422 explaining data gaps."""
    # During mid-December 2016 (Demonetisation cash outage), prior calendar days had no transactions
    payload = {
        "atm_name": "Mount Road ATM",
        "forecast_date": "2016-12-15"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "missing historical calendar lag observations" in data["detail"] or "Insufficient history" in data["detail"]


def test_analytics_summary_endpoint(client):
    """GET /analytics/summary returns aggregate KPI statistics."""
    response = client.get("/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_rows"] == 10296
    assert data["supported_atms"] == 5
    assert len(data["atm_profiles"]) == 5


def test_analytics_historical_endpoint(client):
    """GET /analytics/historical returns monthly and weekday series."""
    response = client.get("/analytics/historical?atm_name=Mount+Road+ATM")
    assert response.status_code == 200
    data = response.json()
    assert data["atm_filter"] == "Mount Road ATM"
    assert len(data["monthly_trend"]) > 0
    assert len(data["weekday_patterns"]) == 7


def test_analytics_benchmarks_endpoint(client):
    """GET /analytics/benchmarks returns verified evaluation metrics."""
    response = client.get("/analytics/benchmarks")
    assert response.status_code == 200
    data = response.json()
    assert data["selected_production_model"] == "Random Forest"
    assert len(data["common_calendar_metrics"]) > 0
    assert len(data["expanding_window_metrics"]) > 0
