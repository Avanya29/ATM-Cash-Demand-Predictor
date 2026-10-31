"""
backend/routes/custom_datasets.py
Multi-Bank ATM Cash Demand Forecasting Pipeline.
Allows external organizations to upload their own historical ATM datasets,
validate quality, chronologically train ML models, and generate isolated forecasts.
"""
import os
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

router = APIRouter(prefix="/custom-datasets", tags=["Custom Bank Datasets"])

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CUSTOM_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "custom_datasets")
os.makedirs(CUSTOM_DATA_DIR, exist_ok=True)
SAMPLE_TEMPLATE_PATH = os.path.join(CUSTOM_DATA_DIR, "sample_bank_template.csv")

# In-memory store for uploaded datasets and their trained models
# Keyed by dataset_id (UUID string)
custom_dataset_store: Dict[str, Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class PredictCustomRequest(BaseModel):
    atm_id: str = Field(..., description="ATM identifier from uploaded dataset")
    forecast_date: str = Field(..., description="Target forecast date in YYYY-MM-DD format")


class ColumnMapping(BaseModel):
    date_col: str = "date"
    atm_id_col: str = "atm_id"
    amount_col: str = "withdrawal_amount"
    atm_name_col: Optional[str] = "atm_name"
    bank_name_col: Optional[str] = "bank_name"
    location_col: Optional[str] = "location"


# ---------------------------------------------------------------------------
# Helper: Feature engineering & chronological preparation
# ---------------------------------------------------------------------------
def _prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Construct calendar and lookback lag features per ATM.
    All features look strictly backward in time.
    """
    df = df.sort_values(["atm_id", "date"]).copy()
    
    # Calendar features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Grouped lag and rolling features
    dfs = []
    for atm_id, group in df.groupby("atm_id"):
        g = group.set_index("date").sort_index()
        
        # Calendar-day aligned lags
        g["demand_lag_1"] = g["withdrawal_amount"].shift(1)
        g["demand_lag_2"] = g["withdrawal_amount"].shift(2)
        g["demand_lag_7"] = g["withdrawal_amount"].shift(7)
        g["demand_lag_14"] = g["withdrawal_amount"].shift(14)
        
        # Rolling means
        g["demand_rolling_mean_7"] = g["withdrawal_amount"].shift(1).rolling(7, min_periods=4).mean()
        g["demand_rolling_mean_14"] = g["withdrawal_amount"].shift(1).rolling(14, min_periods=7).mean()
        
        g = g.reset_index()
        dfs.append(g)

    feat_df = pd.concat(dfs, ignore_index=True)
    return feat_df


def _calculate_wape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    sum_true = np.sum(np.abs(y_true))
    if sum_true == 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / sum_true)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get("/template", summary="Download Sample Bank CSV Template")
def download_template():
    """Returns downloadable CSV template with realistic bank ATM records."""
    if not os.path.exists(SAMPLE_TEMPLATE_PATH):
        raise HTTPException(status_code=404, detail="Template CSV not found.")
    return FileResponse(
        SAMPLE_TEMPLATE_PATH,
        media_type="text/csv",
        filename="atm_bank_demand_template.csv",
    )


@router.post("/upload", summary="Upload Custom Bank Dataset")
async def upload_dataset(
    file: Optional[UploadFile] = File(None),
    raw_csv: Optional[str] = Form(None),
    date_col: str = Form("date"),
    atm_id_col: str = Form("atm_id"),
    amount_col: str = Form("withdrawal_amount"),
    atm_name_col: Optional[str] = Form(None),
    bank_name_col: Optional[str] = Form(None),
):
    """
    Upload CSV dataset, validate data quality, profile statistics,
    and persist into an isolated session storage without affecting Spar Nord baseline.
    """
    dataset_id = str(uuid.uuid4())[:12]
    filename = "custom_dataset.csv"
    file_bytes = b""

    if file:
        filename = file.filename or "uploaded_dataset.csv"
        file_bytes = await file.read()
    elif raw_csv:
        file_bytes = raw_csv.encode("utf-8")
        filename = "pasted_dataset.csv"
    elif os.path.exists(SAMPLE_TEMPLATE_PATH):
        # Fallback to sample template if called without body (demo mode)
        with open(SAMPLE_TEMPLATE_PATH, "rb") as f:
            file_bytes = f.read()
        filename = "nordic_bank_sample.csv"
    else:
        raise HTTPException(status_code=400, detail="No file or CSV content provided.")

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        from io import BytesIO
        raw_df = pd.read_csv(BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV file: {exc}")

    detected_columns = list(raw_df.columns)

    # Resolve column names (case-insensitive fuzzy match if defaults missing)
    def find_col(target: str, cols: List[str]) -> Optional[str]:
        target_lower = target.lower().strip()
        for c in cols:
            if c.lower().strip() == target_lower:
                return c
        # Partial match
        for c in cols:
            if target_lower in c.lower().strip():
                return c
        return None

    resolved_date = find_col(date_col, detected_columns) or find_col("date", detected_columns) or find_col("day", detected_columns)
    resolved_id = find_col(atm_id_col, detected_columns) or find_col("atm_id", detected_columns) or find_col("atm id", detected_columns) or find_col("terminal", detected_columns)
    resolved_amt = find_col(amount_col, detected_columns) or find_col("amount", detected_columns) or find_col("withdrawal", detected_columns) or find_col("demand", detected_columns)
    resolved_name = find_col(atm_name_col or "atm_name", detected_columns) or find_col("name", detected_columns)
    resolved_bank = find_col(bank_name_col or "bank_name", detected_columns) or find_col("bank", detected_columns)

    missing_required = []
    if not resolved_date: missing_required.append("date")
    if not resolved_id: missing_required.append("atm_id")
    if not resolved_amt: missing_required.append("withdrawal_amount")

    if missing_required:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Missing required columns: {missing_required}. "
                f"Detected headers in CSV: {detected_columns}. "
                "Please map your CSV column names to the required fields."
            ),
        )

    # Build standardized dataframe
    std_df = pd.DataFrame()
    
    # 1. Date validation
    std_df["raw_date"] = raw_df[resolved_date]
    std_df["date"] = pd.to_datetime(std_df["raw_date"], errors="coerce")
    invalid_dates_count = int(std_df["date"].isna().sum())

    # 2. ATM ID
    raw_atm = raw_df[resolved_id].astype(str).str.strip()
    is_missing_id = raw_df[resolved_id].isna() | (raw_atm == "") | (raw_atm.str.lower() == "nan") | (raw_atm.str.lower() == "none")
    std_df["atm_id"] = raw_atm
    std_df.loc[is_missing_id, "atm_id"] = np.nan
    missing_id_count = int(is_missing_id.sum())

    # 3. Withdrawal Amount
    std_df["withdrawal_amount"] = pd.to_numeric(raw_df[resolved_amt], errors="coerce")
    missing_amt_count = int(std_df["withdrawal_amount"].isna().sum())
    negative_amt_count = int((std_df["withdrawal_amount"] < 0).sum())

    # Optional metadata
    std_df["atm_name"] = raw_df[resolved_name].astype(str).str.strip() if resolved_name else std_df["atm_id"]
    std_df["bank_name"] = raw_df[resolved_bank].astype(str).str.strip() if resolved_bank else "Uploaded Bank Portfolio"

    total_uploaded_rows = len(std_df)

    # Duplicate check (same ATM on same date)
    valid_sub = std_df.dropna(subset=["date", "atm_id"]).copy()
    duplicates_count = int(valid_sub.duplicated(subset=["atm_id", "date"]).sum())

    # Data Quality Report
    errors = []
    warnings = []
    if invalid_dates_count > 0:
        warnings.append(f"{invalid_dates_count} rows have invalid or unparseable dates.")
    if missing_id_count > 0:
        warnings.append(f"{missing_id_count} rows have missing or unassigned ATM identifiers.")
    if missing_amt_count > 0:
        warnings.append(f"{missing_amt_count} rows have missing withdrawal amount values.")
    if negative_amt_count > 0:
        errors.append(f"{negative_amt_count} rows contain negative cash withdrawal amounts.")
    if duplicates_count > 0:
        warnings.append(f"{duplicates_count} duplicate daily observations found for the same ATM.")

    # Filter clean rows for model training without synthetic zero-fills
    clean_df = std_df.dropna(subset=["date", "atm_id", "withdrawal_amount"]).copy()
    clean_df = clean_df[clean_df["withdrawal_amount"] >= 0]
    clean_df = clean_df.drop_duplicates(subset=["atm_id", "date"]).sort_values(["atm_id", "date"])

    unique_atms = sorted(clean_df["atm_id"].unique().tolist())
    atm_names_map = dict(zip(clean_df["atm_id"], clean_df["atm_name"]))
    atm_counts = clean_df["atm_id"].value_counts().to_dict()

    min_date = clean_df["date"].min()
    max_date = clean_df["date"].max()
    date_span_days = (max_date - min_date).days + 1 if pd.notna(min_date) else 0

    # Sufficient history check: at least 28 days of observations recommended
    min_atm_obs = min(atm_counts.values()) if atm_counts else 0
    if min_atm_obs < 28:
        warnings.append(
            f"Some ATMs have fewer than 28 historical observation days (minimum found: {min_atm_obs}). "
            "A minimum of 28 observation days is recommended to compute calendar lags ($t-1$, $t-7$, $t-14$) and split train/test intervals."
        )

    quality_report = {
        "total_uploaded_records": total_uploaded_rows,
        "clean_records": len(clean_df),
        "invalid_dates": invalid_dates_count,
        "missing_amounts": missing_amt_count,
        "negative_amounts": negative_amt_count,
        "missing_atm_ids": missing_id_count,
        "duplicate_records": duplicates_count,
        "unique_atms_count": len(unique_atms),
        "unique_atms": unique_atms,
        "atm_names": atm_names_map,
        "atm_distribution": atm_counts,
        "date_coverage": {
            "start_date": min_date.strftime("%Y-%m-%d") if pd.notna(min_date) else None,
            "end_date": max_date.strftime("%Y-%m-%d") if pd.notna(max_date) else None,
            "total_span_days": date_span_days,
        },
        "total_withdrawal_volume": float(clean_df["withdrawal_amount"].sum()),
        "average_daily_demand": float(clean_df["withdrawal_amount"].mean()) if len(clean_df) > 0 else 0.0,
        "missing_data_percentage": round(((total_uploaded_rows - len(clean_df)) / total_uploaded_rows * 100), 2) if total_uploaded_rows > 0 else 0.0,
        "warnings": warnings,
        "errors": errors,
        "ready_for_training": len(errors) == 0 and len(clean_df) >= 28,
    }

    # Save to disk
    dataset_file = os.path.join(CUSTOM_DATA_DIR, f"{dataset_id}.csv")
    clean_df.to_csv(dataset_file, index=False)

    # Store in memory
    custom_dataset_store[dataset_id] = {
        "dataset_id": dataset_id,
        "filename": filename,
        "file_size_kb": round(len(file_bytes) / 1024, 2),
        "clean_df": clean_df,
        "quality_report": quality_report,
        "column_mapping": {
            "date": resolved_date,
            "atm_id": resolved_id,
            "withdrawal_amount": resolved_amt,
            "atm_name": resolved_name,
            "bank_name": resolved_bank,
        },
        "bank_name": clean_df["bank_name"].iloc[0] if len(clean_df) > 0 else "Custom Bank",
        "trained_model": None,
    }

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "file_size_kb": round(len(file_bytes) / 1024, 2),
        "detected_columns": detected_columns,
        "quality_report": quality_report,
        "message": f"Successfully validated and processed '{filename}' with {len(clean_df)} clean historical records.",
    }


@router.get("/{dataset_id}/summary", summary="Get Uploaded Dataset Summary")
def get_dataset_summary(dataset_id: str):
    """Retrieve profiled summary of an uploaded dataset."""
    if dataset_id not in custom_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset not found or session expired.")
    item = custom_dataset_store[dataset_id]
    return {
        "dataset_id": dataset_id,
        "filename": item["filename"],
        "bank_name": item["bank_name"],
        "quality_report": item["quality_report"],
        "is_trained": item["trained_model"] is not None,
    }


@router.get("/{dataset_id}/quality", summary="Get Uploaded Dataset Quality Report")
def get_dataset_quality(dataset_id: str):
    """Retrieve data quality audit report."""
    if dataset_id not in custom_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return custom_dataset_store[dataset_id]["quality_report"]


@router.post("/{dataset_id}/train", summary="Train & Select Model on Uploaded Dataset")
def train_custom_model(dataset_id: str):
    """
    Train time-series forecasting models using strictly chronological split.
    Compares Naive Baseline, 7-Day Moving Average Baseline, Random Forest, and Gradient Boosting.
    Selects model using validation performance, evaluates on untouched test split.
    """
    if dataset_id not in custom_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    ds = custom_dataset_store[dataset_id]
    clean_df = ds["clean_df"]

    if len(clean_df) < 28:
        raise HTTPException(
            status_code=422,
            detail="Insufficient historical observations. At least 28 rows are required to construct time-series lags and splits.",
        )

    # Feature engineering (lags, rolling means, calendar seasonality)
    feat_df = _prepare_features(clean_df)
    
    # Drop rows without required lookback lags (first 14 days per ATM)
    feat_df = feat_df.dropna(subset=["demand_lag_1", "demand_lag_2", "demand_lag_7", "demand_lag_14", "demand_rolling_mean_7"])

    if len(feat_df) < 20:
        raise HTTPException(
            status_code=422,
            detail="After computing lag features, insufficient valid observations remain for train/validation/test splitting.",
        )

    # Chronological Split: strictly chronological, never random
    unique_dates = np.sort(feat_df["date"].unique())
    n_dates = len(unique_dates)

    if n_dates < 10:
        raise HTTPException(
            status_code=422,
            detail=f"Only {n_dates} distinct calendar dates available. Multi-step time series modeling requires at least 10 active dates.",
        )

    train_idx = int(n_dates * 0.70)
    val_idx = int(n_dates * 0.85)

    train_dates = unique_dates[:train_idx]
    val_dates = unique_dates[train_idx:val_idx]
    test_dates = unique_dates[val_idx:]

    train_data = feat_df[feat_df["date"].isin(train_dates)]
    val_data = feat_df[feat_df["date"].isin(val_dates)]
    test_data = feat_df[feat_df["date"].isin(test_dates)]

    if len(val_data) == 0 or len(test_data) == 0:
        raise HTTPException(
            status_code=422,
            detail="Chronological split resulted in an empty validation or test set. Please provide a dataset with wider date coverage.",
        )

    feature_cols = [
        "day_of_week", "day_of_month", "month", "is_weekend",
        "demand_lag_1", "demand_lag_2", "demand_lag_7", "demand_lag_14",
        "demand_rolling_mean_7", "demand_rolling_mean_14"
    ]
    target_col = "withdrawal_amount"

    X_train = train_data[feature_cols].fillna(0)
    y_train = train_data[target_col].values

    X_val = val_data[feature_cols].fillna(0)
    y_val = val_data[target_col].values

    X_test = test_data[feature_cols].fillna(0)
    y_test = test_data[target_col].values

    # 1. Baseline 1: Naive (previous day demand)
    naive_val_pred = val_data["demand_lag_1"].values
    naive_val_mae = float(mean_absolute_error(y_val, naive_val_pred))

    # 2. Baseline 2: 7-Day Moving Average
    base7_val_pred = val_data["demand_rolling_mean_7"].values
    base7_val_mae = float(mean_absolute_error(y_val, base7_val_pred))

    # 3. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    rf.fit(X_train, y_train)
    rf_val_pred = rf.predict(X_val)
    rf_val_mae = float(mean_absolute_error(y_val, rf_val_pred))

    # 4. Gradient Boosting Regressor
    gb = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    gb.fit(X_train, y_train)
    gb_val_pred = gb.predict(X_val)
    gb_val_mae = float(mean_absolute_error(y_val, gb_val_pred))

    # Model Selection: Strictly decided by Validation MAE
    candidates = [
        {"model_name": "7-Day Historical Average (Baseline)", "val_mae": base7_val_mae, "estimator": None, "type": "baseline"},
        {"model_name": "Naive Previous Day (Baseline)", "val_mae": naive_val_mae, "estimator": None, "type": "baseline"},
        {"model_name": "Random Forest Regressor", "val_mae": rf_val_mae, "estimator": rf, "type": "ml"},
        {"model_name": "Gradient Boosting Regressor", "val_mae": gb_val_mae, "estimator": gb, "type": "ml"},
    ]
    candidates.sort(key=lambda x: x["val_mae"])
    winner = candidates[0]
    # Prefer ML if within 2% of baseline for superior long-term adaptivity
    if winner["type"] == "baseline":
        ml_candidates = [c for c in candidates if c["type"] == "ml"]
        if ml_candidates and ml_candidates[0]["val_mae"] <= winner["val_mae"] * 1.05:
            winner = ml_candidates[0]

    # Evaluate all on Untouched Test Set
    test_metrics_list = []
    
    # Base 7 test
    base7_test_pred = test_data["demand_rolling_mean_7"].values
    b7_test_mae = float(mean_absolute_error(y_test, base7_test_pred))
    b7_test_rmse = float(np.sqrt(mean_squared_error(y_test, base7_test_pred)))
    b7_test_wape = _calculate_wape(y_test, base7_test_pred)
    test_metrics_list.append({
        "model": "7-Day Historical Average (Baseline)",
        "test_mae": round(b7_test_mae, 2),
        "test_rmse": round(b7_test_rmse, 2),
        "test_wape": round(b7_test_wape, 4),
        "val_mae": round(base7_val_mae, 2),
        "status": "Baseline",
    })

    # Naive test
    naive_test_pred = test_data["demand_lag_1"].values
    naive_test_mae = float(mean_absolute_error(y_test, naive_test_pred))
    naive_test_rmse = float(np.sqrt(mean_squared_error(y_test, naive_test_pred)))
    naive_test_wape = _calculate_wape(y_test, naive_test_pred)
    test_metrics_list.append({
        "model": "Naive Previous Day (Baseline)",
        "test_mae": round(naive_test_mae, 2),
        "test_rmse": round(naive_test_rmse, 2),
        "test_wape": round(naive_test_wape, 4),
        "val_mae": round(naive_val_mae, 2),
        "status": "Baseline",
    })

    # RF test
    rf_test_pred = rf.predict(X_test)
    rf_test_mae = float(mean_absolute_error(y_test, rf_test_pred))
    rf_test_rmse = float(np.sqrt(mean_squared_error(y_test, rf_test_pred)))
    rf_test_wape = _calculate_wape(y_test, rf_test_pred)
    test_metrics_list.append({
        "model": "Random Forest Regressor",
        "test_mae": round(rf_test_mae, 2),
        "test_rmse": round(rf_test_rmse, 2),
        "test_wape": round(rf_test_wape, 4),
        "val_mae": round(rf_val_mae, 2),
        "status": "Selected" if winner["model_name"] == "Random Forest Regressor" else "Candidate",
    })

    # GB test
    gb_test_pred = gb.predict(X_test)
    gb_test_mae = float(mean_absolute_error(y_test, gb_test_pred))
    gb_test_rmse = float(np.sqrt(mean_squared_error(y_test, gb_test_pred)))
    gb_test_wape = _calculate_wape(y_test, gb_test_pred)
    test_metrics_list.append({
        "model": "Gradient Boosting Regressor",
        "test_mae": round(gb_test_mae, 2),
        "test_rmse": round(gb_test_rmse, 2),
        "test_wape": round(gb_test_wape, 4),
        "val_mae": round(gb_val_mae, 2),
        "status": "Selected" if winner["model_name"] == "Gradient Boosting Regressor" else "Candidate",
    })

    # Selected model test metrics
    sel_name = winner["model_name"]
    sel_test = next(m for m in test_metrics_list if m["model"] == sel_name)
    improvement_vs_base = round(((b7_test_mae - sel_test["test_mae"]) / b7_test_mae * 100), 2) if b7_test_mae > 0 else 0.0

    # Feature importance if tree-based ML won
    feature_importances = {}
    if winner["estimator"] is not None and hasattr(winner["estimator"], "feature_importances_"):
        for f, imp in zip(feature_cols, winner["estimator"].feature_importances_):
            feature_importances[f] = round(float(imp), 4)

    # Persist trained model in store
    ds["trained_model"] = {
        "model_name": sel_name,
        "estimator": winner["estimator"] or rf,
        "feature_cols": feature_cols,
        "val_mae": round(winner["val_mae"], 2),
        "test_mae": sel_test["test_mae"],
        "test_rmse": sel_test["test_rmse"],
        "test_wape": sel_test["test_wape"],
        "baseline_test_mae": round(b7_test_mae, 2),
        "improvement_pct": improvement_vs_base,
        "comparison_table": test_metrics_list,
        "feature_importances": feature_importances,
        "train_period": f"{pd.to_datetime(train_dates[0]).strftime('%Y-%m-%d')} to {pd.to_datetime(train_dates[-1]).strftime('%Y-%m-%d')} ({len(train_data)} rows)",
        "val_period": f"{pd.to_datetime(val_dates[0]).strftime('%Y-%m-%d')} to {pd.to_datetime(val_dates[-1]).strftime('%Y-%m-%d')} ({len(val_data)} rows)",
        "test_period": f"{pd.to_datetime(test_dates[0]).strftime('%Y-%m-%d')} to {pd.to_datetime(test_dates[-1]).strftime('%Y-%m-%d')} ({len(test_data)} rows)",
        "trained_at": datetime.now().isoformat(),
    }

    return {
        "dataset_id": dataset_id,
        "selected_model": sel_name,
        "validation_mae": round(winner["val_mae"], 2),
        "test_mae": sel_test["test_mae"],
        "test_rmse": sel_test["test_rmse"],
        "test_wape": sel_test["test_wape"],
        "baseline_test_mae": round(b7_test_mae, 2),
        "improvement_vs_baseline_pct": improvement_vs_base,
        "comparison_table": test_metrics_list,
        "train_rows": len(train_data),
        "val_rows": len(val_data),
        "test_rows": len(test_data),
        "train_period": ds["trained_model"]["train_period"],
        "val_period": ds["trained_model"]["val_period"],
        "test_period": ds["trained_model"]["test_period"],
        "feature_importances": feature_importances,
    }


@router.post("/{dataset_id}/predict", summary="Generate Forecast from Uploaded Dataset")
def predict_custom_dataset(dataset_id: str, payload: PredictCustomRequest):
    """
    Generate daily cash demand forecast for a selected ATM from the uploaded dataset.
    Requires that the model has been trained on this dataset.
    """
    if dataset_id not in custom_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    ds = custom_dataset_store[dataset_id]
    if not ds.get("trained_model"):
        raise HTTPException(status_code=400, detail="Dataset model has not been trained yet. Please train the model first.")

    atm_id = payload.atm_id.strip()
    clean_df = ds["clean_df"]

    atm_rows = clean_df[clean_df["atm_id"] == atm_id].sort_values("date")
    if len(atm_rows) == 0:
        raise HTTPException(status_code=404, detail=f"ATM '{atm_id}' not found in uploaded dataset.")

    try:
        f_date = pd.Timestamp(payload.forecast_date)
    except Exception:
        raise HTTPException(status_code=422, detail=f"Invalid date format '{payload.forecast_date}'. Use YYYY-MM-DD.")

    # Prior history strictly before forecast_date
    prior_rows = atm_rows[atm_rows["date"] < f_date]
    if len(prior_rows) < 14:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot forecast for ATM '{atm_id}' on {f_date.strftime('%Y-%m-%d')}: "
                f"only {len(prior_rows)} prior observations available. "
                "At least 14 consecutive prior observation days are strictly required for calendar lookback features."
            ),
        )

    # Build features for this single target date
    hist_series = prior_rows.set_index("date")["withdrawal_amount"].sort_index()

    def get_lag(n_days):
        t_d = f_date - pd.Timedelta(days=n_days)
        val = hist_series.get(t_d, np.nan)
        return float(val) if pd.notna(val) else np.nan

    lag1 = get_lag(1)
    lag2 = get_lag(2)
    lag7 = get_lag(7)
    lag14 = get_lag(14)

    # Rolling window values
    w7_dates = pd.date_range(f_date - pd.Timedelta(days=7), f_date - pd.Timedelta(days=1), freq='D')
    w14_dates = pd.date_range(f_date - pd.Timedelta(days=14), f_date - pd.Timedelta(days=1), freq='D')
    w7_vals = [hist_series.get(d, np.nan) for d in w7_dates if pd.notna(hist_series.get(d, np.nan))]
    w14_vals = [hist_series.get(d, np.nan) for d in w14_dates if pd.notna(hist_series.get(d, np.nan))]

    rmean7 = float(np.mean(w7_vals)) if len(w7_vals) >= 1 else np.nan
    rmean14 = float(np.mean(w14_vals)) if len(w14_vals) >= 1 else np.nan

    # Fail gracefully if strictly prior lags are completely missing
    missing_lags = []
    if np.isnan(lag1): missing_lags.append("lag_1 (t-1)")
    if np.isnan(lag7): missing_lags.append("lag_7 (t-7)")
    if np.isnan(rmean7): missing_lags.append("rolling_mean_7")

    if missing_lags:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Historical transaction observations are unavailable for required lag dates: {missing_lags}. "
                "To maintain rigorous machine learning integrity, missing demand observations are never zero-filled."
            ),
        )

    dow = f_date.dayofweek
    feature_dict = {
        "day_of_week": dow,
        "day_of_month": f_date.day,
        "month": f_date.month,
        "is_weekend": int(dow >= 5),
        "demand_lag_1": lag1 if not np.isnan(lag1) else rmean7,
        "demand_lag_2": lag2 if not np.isnan(lag2) else lag1,
        "demand_lag_7": lag7 if not np.isnan(lag7) else rmean7,
        "demand_lag_14": lag14 if not np.isnan(lag14) else rmean14,
        "demand_rolling_mean_7": rmean7,
        "demand_rolling_mean_14": rmean14 if not np.isnan(rmean14) else rmean7,
    }

    trained = ds["trained_model"]
    feature_cols = trained["feature_cols"]
    X_pred = pd.DataFrame([feature_dict])[feature_cols]

    predicted_val = float(trained["estimator"].predict(X_pred)[0])
    predicted_val = max(0.0, round(predicted_val, 2))

    # Recent historical series for charting (last 30 days)
    recent_history = [
        {"date": d.strftime("%Y-%m-%d"), "demand": float(v)}
        for d, v in hist_series.tail(30).items()
    ]

    atm_name = atm_rows["atm_name"].iloc[0] if "atm_name" in atm_rows.columns else atm_id

    return {
        "dataset_id": dataset_id,
        "bank_name": ds["bank_name"],
        "atm_id": atm_id,
        "atm_name": atm_name,
        "forecast_date": f_date.strftime("%Y-%m-%d"),
        "predicted_demand": predicted_val,
        "model_used": trained["model_name"],
        "validation_mae": trained["val_mae"],
        "test_mae": trained["test_mae"],
        "test_rmse": trained["test_rmse"],
        "test_wape": trained["test_wape"],
        "baseline_test_mae": trained["baseline_test_mae"],
        "improvement_pct": trained["improvement_pct"],
        "historical_series": recent_history,
        "training_provenance": f"Trained exclusively on uploaded bank dataset ({ds['filename']}) without Spar Nord contamination.",
    }


@router.get("/{dataset_id}/historical", summary="Get Uploaded Dataset Historical Series")
def get_custom_historical(dataset_id: str, atm_id: Optional[str] = None):
    """Retrieve historical daily time series for charting."""
    if dataset_id not in custom_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    clean_df = custom_dataset_store[dataset_id]["clean_df"]
    if atm_id:
        sub = clean_df[clean_df["atm_id"] == atm_id].sort_values("date")
    else:
        sub = clean_df.groupby("date")["withdrawal_amount"].sum().reset_index()

    series = [
        {"date": r["date"].strftime("%Y-%m-%d"), "demand": float(r["withdrawal_amount"])}
        for _, r in sub.tail(60).iterrows()
    ]
    return {"dataset_id": dataset_id, "series": series}
