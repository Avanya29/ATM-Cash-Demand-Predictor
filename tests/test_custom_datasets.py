"""
tests/test_custom_datasets.py
Comprehensive test suite for the Multi-Bank Custom ATM Dataset Pipeline.
Tests upload, column mapping, data validation, chronological training,
model selection, forecast generation, and dataset isolation.
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client():
    """Create a test client with lifespan executed (loads model once)."""
    with TestClient(app) as test_client:
        yield test_client


SAMPLE_CSV_CONTENT = """date,atm_id,atm_name,bank_name,withdrawal_amount,transaction_count,location
2023-01-01,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5200.00,85,Airport
2023-01-02,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,4800.00,80,Airport
2023-01-03,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5100.00,82,Airport
2023-01-04,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5300.00,88,Airport
2023-01-05,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6100.00,105,Airport
2023-01-06,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7200.00,120,Airport
2023-01-07,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6800.00,115,Airport
2023-01-08,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,4900.00,83,Airport
2023-01-09,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5050.00,84,Airport
2023-01-10,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5250.00,87,Airport
2023-01-11,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5400.00,90,Airport
2023-01-12,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5950.00,98,Airport
2023-01-13,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7100.00,118,Airport
2023-01-14,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6750.00,112,Airport
2023-01-15,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,4950.00,81,Airport
2023-01-16,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5100.00,85,Airport
2023-01-17,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5300.00,89,Airport
2023-01-18,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5500.00,92,Airport
2023-01-19,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6200.00,104,Airport
2023-01-20,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7350.00,122,Airport
2023-01-21,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6900.00,114,Airport
2023-01-22,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5000.00,83,Airport
2023-01-23,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5150.00,86,Airport
2023-01-24,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5350.00,90,Airport
2023-01-25,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5600.00,94,Airport
2023-01-26,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6300.00,105,Airport
2023-01-27,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7450.00,125,Airport
2023-01-28,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7000.00,116,Airport
2023-01-29,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5100.00,84,Airport
2023-01-30,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5250.00,87,Airport
2023-01-31,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5450.00,91,Airport
2023-02-01,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,5700.00,95,Airport
2023-02-02,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,6400.00,106,Airport
2023-02-03,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7550.00,126,Airport
2023-02-04,ATM_TEST_1,Test Terminal Alpha,Nordic Test Bank,7100.00,118,Airport
"""


def test_download_template(client):
    """Verify template download endpoint serves valid CSV template."""
    response = client.get("/custom-datasets/template")
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    content = response.content.decode("utf-8")
    assert "withdrawal_amount" in content
    assert "atm_id" in content
    assert "date" in content


def test_upload_sample_demo_mode(client):
    """Verify demo mode loads built-in sample template when called without files."""
    response = client.post("/custom-datasets/upload")
    assert response.status_code == 200
    data = response.json()
    assert "dataset_id" in data
    assert data["quality_report"]["total_uploaded_records"] > 0
    assert data["quality_report"]["clean_records"] > 0
    assert len(data["quality_report"]["unique_atms"]) > 0


def test_upload_custom_csv_and_validate(client):
    """Verify upload, validation, and profiling on a custom CSV."""
    files = {"file": ("my_bank_data.csv", SAMPLE_CSV_CONTENT.encode("utf-8"), "text/csv")}
    response = client.post("/custom-datasets/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    dataset_id = data["dataset_id"]
    report = data["quality_report"]

    assert report["total_uploaded_records"] == 35
    assert report["clean_records"] == 35
    assert report["invalid_dates"] == 0
    assert report["missing_amounts"] == 0
    assert report["negative_amounts"] == 0
    assert report["unique_atms_count"] == 1
    assert "ATM_TEST_1" in report["unique_atms"]
    assert report["ready_for_training"] is True


def test_upload_missing_required_columns(client):
    """Verify rejection when required fields are missing."""
    bad_csv = "timestamp,user_id\n2023-01-01,USR1\n"
    files = {"file": ("bad.csv", bad_csv.encode("utf-8"), "text/csv")}
    response = client.post("/custom-datasets/upload", files=files)
    assert response.status_code == 422
    assert "Missing required columns" in response.json()["detail"]


def test_train_and_predict_flow(client):
    """Test full chronological train, model selection, and forecast pipeline."""
    # 1. Upload valid test dataset
    files = {"file": ("bank_flow.csv", SAMPLE_CSV_CONTENT.encode("utf-8"), "text/csv")}
    upload_res = client.post("/custom-datasets/upload", files=files)
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Train and select model
    train_res = client.post(f"/custom-datasets/{dataset_id}/train")
    assert train_res.status_code == 200
    train_data = train_res.json()
    assert "selected_model" in train_data
    assert train_data["validation_mae"] > 0
    assert train_data["test_mae"] > 0
    assert "comparison_table" in train_data
    assert len(train_data["comparison_table"]) == 4

    # 3. Generate forecast for a date with sufficient prior lag history
    pred_res = client.post(
        f"/custom-datasets/{dataset_id}/predict",
        json={"atm_id": "ATM_TEST_1", "forecast_date": "2023-02-04"},
    )
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert pred_data["predicted_demand"] > 0
    assert pred_data["atm_id"] == "ATM_TEST_1"
    assert pred_data["model_used"] == train_data["selected_model"]
    assert len(pred_data["historical_series"]) > 0

    # 4. Lag safety check: requesting a date with insufficient prior history (< 14 days)
    early_pred_res = client.post(
        f"/custom-datasets/{dataset_id}/predict",
        json={"atm_id": "ATM_TEST_1", "forecast_date": "2023-01-05"},
    )
    assert early_pred_res.status_code == 422
    assert "prior observations available" in early_pred_res.json()["detail"]


def test_spar_nord_isolation(client):
    """Verify Spar Nord production predictions remain completely functional and uncontaminated."""
    res = client.post(
        "/predict",
        json={"atm_name": "Mount Road ATM", "forecast_date": "2017-06-15"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["atm_name"] == "Mount Road ATM"
    assert data["predicted_demand"] > 0
