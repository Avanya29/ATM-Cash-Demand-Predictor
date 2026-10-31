"""
ml/predict.py — ATM Cash Demand Prediction Pipeline
=====================================================
Phase 6: Production Prediction Pipeline

Purpose:
    Load the production pipeline (Random Forest, selected on Common-Calendar
    validation split) and generate ATM cash-demand predictions for a given ATM
    and forecast date.

Key design constraint:
    Lag and rolling features depend on real historical demand values.
    They CANNOT be invented. Therefore this pipeline requires a slice of
    historical data (at least 14 prior observations for the target ATM)
    to compute the same features that were used at training time.

Leakage prevention:
    - The forecast date's actual demand is NEVER used.
    - Only observations BEFORE the forecast date are used.
    - The saved model pipeline is loaded, never retrained.
"""

import os
import sys
import json
import warnings
from datetime import timedelta

import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# CONSTANTS & PATH RESOLUTION — anchored to project root
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _resolve_default_model_path() -> str:
    env_path = os.getenv("MODEL_PATH")
    if env_path:
        return env_path if os.path.isabs(env_path) else os.path.join(PROJECT_ROOT, env_path)
    meta_path = os.path.join(PROJECT_ROOT, "models", "model_metadata.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            selected = meta.get("selected_model", "Random Forest")
            candidate = os.path.join(PROJECT_ROOT, "models", f"{selected.lower().replace(' ', '_')}_pipeline.joblib")
            if os.path.exists(candidate):
                return candidate
        except Exception:
            pass
    return os.path.join(PROJECT_ROOT, "models", "random_forest_pipeline.joblib")

MODEL_PATH       = _resolve_default_model_path()
FEATURES_PATH    = os.getenv("FEATURES_PATH") or os.path.join(PROJECT_ROOT, "data", "processed", "atm_features_model_ready.csv")
CLEANED_PATH     = os.getenv("CLEANED_PATH") or os.path.join(PROJECT_ROOT, "data", "processed", "atm_transactions_cleaned.csv")
SAMPLE_OUT       = os.path.join(PROJECT_ROOT, "data", "processed", "sample_prediction.json")
REPORT_OUT       = os.path.join(PROJECT_ROOT, "data", "processed", "prediction_pipeline_report.md")

VALID_ATMS = [
    "Airport ATM",
    "Big Street ATM",
    "Christ College ATM",
    "KK Nagar ATM",
    "Mount Road ATM",
]

CATEGORICAL_FEATURES = [
    "ATM Name", "Weekday", "Festival Religion", "Working Day", "Holiday Sequence"
]

NUMERICAL_FEATURES = [
    "year", "month", "day_of_month", "day_of_week", "week_of_year", "quarter", "is_weekend",
    "day_of_week_sin", "day_of_week_cos", "month_sin", "month_cos",
    "demand_lag_1", "demand_lag_2", "demand_lag_3", "demand_lag_7", "demand_lag_14",
    "demand_rolling_mean_3", "demand_rolling_mean_7", "demand_rolling_mean_14",
    "demand_rolling_std_7", "demand_rolling_std_14",
    "demand_change_1d", "demand_change_7d",
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

MIN_HISTORY_ROWS = 14  # rolling_mean_14 requires at least 14 prior rows


# ---------------------------------------------------------------------------
# HELPER: build calendar + cyclical features for a single date
# ---------------------------------------------------------------------------
def _calendar_features(date: pd.Timestamp) -> dict:
    dow = date.dayofweek  # Mon=0 … Sun=6
    month = date.month
    return {
        "year":            date.year,
        "month":           month,
        "day_of_month":    date.day,
        "day_of_week":     dow,
        "week_of_year":    int(date.isocalendar()[1]),
        "quarter":         date.quarter,
        "is_weekend":      int(dow >= 5),
        "day_of_week_sin": float(np.sin(2 * np.pi * dow / 7)),
        "day_of_week_cos": float(np.cos(2 * np.pi * dow / 7)),
        "month_sin":       float(np.sin(2 * np.pi * month / 12)),
        "month_cos":       float(np.cos(2 * np.pi * month / 12)),
    }


# ---------------------------------------------------------------------------
# HELPER: derive lag + rolling features from a history Series
# ---------------------------------------------------------------------------
def _lag_and_rolling_features(history_series: pd.Series, forecast_date: pd.Timestamp = None) -> dict:
    """
    history_series: demand values for the ATM BEFORE the forecast date.
                    If forecast_date is provided and index is DatetimeIndex,
                    derives features based on actual calendar days (t-1, t-2, etc.).
                    Otherwise, falls back to positional tail lookbacks.
    All features look backward, never forward.
    """
    if forecast_date is not None and isinstance(history_series.index, pd.DatetimeIndex):
        forecast_ts = pd.Timestamp(forecast_date)
        
        def get_cal_lag(n_days):
            target_d = forecast_ts - pd.Timedelta(days=n_days)
            val = history_series.get(target_d, np.nan)
            return float(val) if pd.notna(val) else np.nan

        lag1 = get_cal_lag(1)
        lag2 = get_cal_lag(2)
        lag3 = get_cal_lag(3)
        lag7 = get_cal_lag(7)
        lag8 = get_cal_lag(8)
        lag14 = get_cal_lag(14)

        # Calendar windows:
        w3_dates = pd.date_range(forecast_ts - pd.Timedelta(days=3), forecast_ts - pd.Timedelta(days=1), freq='D')
        w7_dates = pd.date_range(forecast_ts - pd.Timedelta(days=7), forecast_ts - pd.Timedelta(days=1), freq='D')
        w14_dates = pd.date_range(forecast_ts - pd.Timedelta(days=14), forecast_ts - pd.Timedelta(days=1), freq='D')

        w3_vals = [history_series.get(d, np.nan) for d in w3_dates if pd.notna(history_series.get(d, np.nan))]
        w7_vals = [history_series.get(d, np.nan) for d in w7_dates if pd.notna(history_series.get(d, np.nan))]
        w14_vals = [history_series.get(d, np.nan) for d in w14_dates if pd.notna(history_series.get(d, np.nan))]

        rmean3 = float(np.mean(w3_vals)) if len(w3_vals) >= 1 else np.nan
        rmean7 = float(np.mean(w7_vals)) if len(w7_vals) >= 1 else np.nan
        rmean14 = float(np.mean(w14_vals)) if len(w14_vals) >= 1 else np.nan
        rstd7 = float(np.std(w7_vals, ddof=1)) if len(w7_vals) >= 2 else np.nan
        rstd14 = float(np.std(w14_vals, ddof=1)) if len(w14_vals) >= 2 else np.nan

        return {
            "demand_lag_1": lag1,
            "demand_lag_2": lag2,
            "demand_lag_3": lag3,
            "demand_lag_7": lag7,
            "demand_lag_14": lag14,
            "demand_rolling_mean_3": rmean3,
            "demand_rolling_mean_7": rmean7,
            "demand_rolling_mean_14": rmean14,
            "demand_rolling_std_7": rstd7,
            "demand_rolling_std_14": rstd14,
            "demand_change_1d": (lag1 - lag2) if (not np.isnan(lag1) and not np.isnan(lag2)) else np.nan,
            "demand_change_7d": (lag1 - lag8) if (not np.isnan(lag1) and not np.isnan(lag8)) else np.nan,
        }

    vals = history_series.values  # numpy array, chronological

    def lag(n):
        return float(vals[-n]) if len(vals) >= n else np.nan

    def rolling_mean(n):
        if len(vals) >= n:
            return float(np.mean(vals[-n:]))
        return np.nan

    def rolling_std(n):
        if len(vals) >= n:
            return float(np.std(vals[-n:], ddof=1))
        return np.nan

    lag1  = lag(1)
    lag2  = lag(2)
    lag8  = lag(8)

    return {
        "demand_lag_1":           lag1,
        "demand_lag_2":           lag2,
        "demand_lag_3":           lag(3),
        "demand_lag_7":           lag(7),
        "demand_lag_14":          lag(14),
        "demand_rolling_mean_3":  rolling_mean(3),
        "demand_rolling_mean_7":  rolling_mean(7),
        "demand_rolling_mean_14": rolling_mean(14),
        "demand_rolling_std_7":   rolling_std(7),
        "demand_rolling_std_14":  rolling_std(14),
        "demand_change_1d":       (lag1 - lag2)  if (not np.isnan(lag1) and not np.isnan(lag2)) else np.nan,
        "demand_change_7d":       (lag1 - lag8)  if (not np.isnan(lag1) and not np.isnan(lag8)) else np.nan,
    }


# ---------------------------------------------------------------------------
# HELPER: get context features (Weekday, Festival, etc.) for a date
# ---------------------------------------------------------------------------
def _context_features(atm_name: str, forecast_date: pd.Timestamp,
                       cleaned_df: pd.DataFrame) -> dict:
    """
    Attempt to look up categorical context (Festival Religion, Working Day,
    Holiday Sequence) from the cleaned historical data.

    Strategy:
      1. Exact date match for this ATM (in-dataset prediction).
      2. Same day-of-week + month in prior years (seasonal proxy).
      3. Conservative fallback values if no match found.

    Note: For truly future dates these fields would normally come from a
    business calendar/festival schedule at deployment time.
    """
    atm_hist = cleaned_df[cleaned_df["ATM Name"] == atm_name].copy()

    # 1. Exact date match
    exact = atm_hist[atm_hist["Transaction Date"] == forecast_date]
    if not exact.empty:
        row = exact.iloc[0]
        return {
            "Weekday":          row["Weekday"],
            "Festival Religion": row["Festival Religion"],
            "Working Day":       row["Working Day"],
            "Holiday Sequence":  row["Holiday Sequence"],
        }

    # 2. Seasonal proxy: same month + same day-of-week, most recent year
    target_dow   = forecast_date.day_name()      # e.g. "Monday"
    target_month = forecast_date.month
    proxy = atm_hist[
        (atm_hist["Transaction Date"].dt.month == target_month) &
        (atm_hist["Weekday"].str.capitalize() == target_dow)
    ].sort_values("Transaction Date", ascending=False)

    if not proxy.empty:
        row = proxy.iloc[0]
        return {
            "Weekday":           target_dow,
            "Festival Religion": row["Festival Religion"],
            "Working Day":       row["Working Day"],
            "Holiday Sequence":  row["Holiday Sequence"],
        }

    # 3. Conservative fallback
    is_weekend = forecast_date.dayofweek >= 5
    return {
        "Weekday":           target_dow,
        "Festival Religion": "NH",
        "Working Day":       "H" if is_weekend else "W",
        "Holiday Sequence":  "WHH" if is_weekend else "WWW",
    }


# ---------------------------------------------------------------------------
# MAIN PUBLIC FUNCTION
# ---------------------------------------------------------------------------
def predict_demand(
    atm_name: str,
    forecast_date,
    historical_data: pd.DataFrame,
    model=None,
    cleaned_df: pd.DataFrame = None,
) -> float:
    """
    Predict total cash demand for a given ATM on a given date.

    Parameters
    ----------
    atm_name : str
        Must be one of the 5 known ATM names.
    forecast_date : str or pd.Timestamp
        The date for which demand is forecast.
        All historical observations BEFORE this date are used.
    historical_data : pd.DataFrame
        The full feature-engineered dataset (atm_features_model_ready.csv).
        Only observations strictly before forecast_date for atm_name are used.
    model : sklearn Pipeline, optional
        Pre-loaded model. Loaded from MODEL_PATH if None.
    cleaned_df : pd.DataFrame, optional
        The cleaned transactions dataset for context-feature lookup.
        Loaded from CLEANED_PATH if None.

    Returns
    -------
    float : Predicted Total amount Withdrawn
    """

    # -- Validate ATM name
    if atm_name not in VALID_ATMS:
        raise ValueError(
            f"Unknown ATM: '{atm_name}'.\nValid ATMs: {VALID_ATMS}"
        )

    # -- Validate and parse date
    try:
        forecast_date = pd.Timestamp(forecast_date)
    except Exception:
        raise ValueError(f"Invalid forecast_date: '{forecast_date}'. Use YYYY-MM-DD.")

    # -- Load model if not provided
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at '{MODEL_PATH}'. Run ml/train_models.py first."
            )
        model = joblib.load(MODEL_PATH)

    # -- Load cleaned dataset for context features if not provided
    if cleaned_df is None:
        if not os.path.exists(CLEANED_PATH):
            raise FileNotFoundError(f"Cleaned data not found at '{CLEANED_PATH}'.")
        cleaned_df = pd.read_csv(CLEANED_PATH)
        cleaned_df["Transaction Date"] = pd.to_datetime(cleaned_df["Transaction Date"])

    # -- Validate against overall dataset date coverage
    ds_min = historical_data["Transaction Date"].min()
    ds_max = historical_data["Transaction Date"].max()
    if forecast_date < ds_min:
        raise ValueError(
            f"Forecast date '{forecast_date.date()}' precedes historical dataset start ({ds_min.date()}). "
            f"At least {MIN_HISTORY_ROWS} prior observations are required."
        )
    if forecast_date > ds_max:
        raise ValueError(
            f"Forecast date '{forecast_date.date()}' is beyond the supported historical dataset horizon "
            f"({ds_min.date()} to {ds_max.date()}). Out-of-sample future forecasting requires real-time telemetry."
        )

    # -- Extract strictly prior history for this ATM
    atm_df = historical_data[
        (historical_data["ATM Name"] == atm_name) &
        (historical_data["Transaction Date"] < forecast_date)
    ].sort_values("Transaction Date")

    if len(atm_df) < MIN_HISTORY_ROWS:
        raise ValueError(
            f"Insufficient history for '{atm_name}' before {forecast_date.date()}. "
            f"Need at least {MIN_HISTORY_ROWS} prior observations, found {len(atm_df)}."
        )

    # -- Build lag/rolling features from prior demand values (calendar-day aligned)
    history_series = atm_df.set_index("Transaction Date")["Total amount Withdrawn"]
    lag_roll = _lag_and_rolling_features(history_series, forecast_date=forecast_date)

    # Check for NaN in required features
    missing = [k for k, v in lag_roll.items() if np.isnan(v)]
    if missing:
        raise ValueError(
            f"Cannot forecast demand for '{atm_name}' on {forecast_date.date()}: "
            f"missing historical calendar lag observations for {missing}. "
            f"The model strictly requires prior calendar day demand without zero-filling."
        )

    # -- Build calendar + cyclical features
    cal = _calendar_features(forecast_date)

    # -- Get context (categorical) features
    ctx = _context_features(atm_name, forecast_date, cleaned_df)

    # -- Assemble single-row feature DataFrame
    row = {"ATM Name": atm_name, **ctx, **cal, **lag_roll}
    X_pred = pd.DataFrame([row])[ALL_FEATURES]  # enforce column order

    # -- Predict
    prediction = float(model.predict(X_pred)[0])
    return round(prediction, 4)


# ---------------------------------------------------------------------------
# COMMAND-LINE DEMO
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("ATM Cash Demand Prediction Pipeline — Phase 6 Demo")
    print("=" * 60)

    # Load the datasets once
    print("\nLoading data and model ...")
    if not os.path.exists(FEATURES_PATH):
        print(f"ERROR: Feature dataset not found at {FEATURES_PATH}")
        sys.exit(1)

    hist_df = pd.read_csv(FEATURES_PATH)
    hist_df["Transaction Date"] = pd.to_datetime(hist_df["Transaction Date"])

    cleaned_df = pd.read_csv(CLEANED_PATH)
    cleaned_df["Transaction Date"] = pd.to_datetime(cleaned_df["Transaction Date"])

    model = joblib.load(MODEL_PATH)
    print(f"Model loaded from: {MODEL_PATH}")

    # Pick a demo: use an ATM and a date that exists in the dataset
    # (i.e., an in-dataset prediction using all prior data as history)
    demo_atm  = "Mount Road ATM"
    demo_date = "2017-06-15"

    print(f"\nDemo Prediction")
    print(f"  ATM Name:      {demo_atm}")
    print(f"  Forecast Date: {demo_date}")

    try:
        predicted = predict_demand(
            atm_name=demo_atm,
            forecast_date=demo_date,
            historical_data=hist_df,
            model=model,
            cleaned_df=cleaned_df,
        )

        print(f"  Predicted Demand: USD {predicted:,.2f}")

        # Retrieve actual value for reference (only available because this
        # is an in-dataset demo — in production this would be unknown)
        actual_row = hist_df[
            (hist_df["ATM Name"] == demo_atm) &
            (hist_df["Transaction Date"] == pd.Timestamp(demo_date))
        ]
        actual_note = (
            f"{actual_row['Total amount Withdrawn'].values[0]:,.2f}"
            if not actual_row.empty else "not available (future date)"
        )
        print(f"  Actual Demand:    USD {actual_note}  (for reference only)")

        # Save sample prediction JSON
        sample = {
            "model":           "Gradient Boosting",
            "model_path":      MODEL_PATH,
            "atm_name":        demo_atm,
            "forecast_date":   demo_date,
            "predicted_demand_usd": predicted,
            "actual_demand_usd_reference": actual_note,
            "note": (
                "Actual value is shown for validation only. In production, "
                "the actual value for the forecast date is never available at prediction time."
            ),
        }
        os.makedirs("data/processed", exist_ok=True)
        with open(SAMPLE_OUT, "w") as f:
            json.dump(sample, f, indent=2)
        print(f"\nSample prediction saved to: {SAMPLE_OUT}")

    except Exception as e:
        print(f"\nPrediction FAILED: {e}")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # WRITE REPORT
    # -----------------------------------------------------------------------
    report = f"""# Prediction Pipeline Report

## Purpose
Load the trained Gradient Boosting pipeline and generate ATM cash-demand
predictions using only historically available information.

## Input
| Field | Value |
|---|---|
| Feature dataset | `{FEATURES_PATH}` |
| Cleaned dataset | `{CLEANED_PATH}` |
| Trained model   | `{MODEL_PATH}` |

## Feature Generation
The `predict_demand()` function constructs the exact same features as Phase 3:

1. **Calendar features**: year, month, day_of_month, day_of_week, week_of_year, quarter, is_weekend
2. **Cyclical features**: day_of_week_sin/cos, month_sin/cos
3. **Lag features** (demand_lag_1 to demand_lag_14): computed from the N observations strictly before the forecast date.
4. **Rolling features** (mean and std, 3/7/14 days): computed from the shifted window of prior observations.
5. **Trend features** (demand_change_1d/7d): computed from lag differences.
6. **Context features** (Weekday, Festival Religion, Working Day, Holiday Sequence): looked up from the cleaned historical dataset by exact date or seasonal proxy.

## Leakage Prevention
- The forecast date's actual demand (`Total amount Withdrawn`) is **never read** during prediction.
- Only observations with `Transaction Date < forecast_date` are used to derive lag/rolling features.
- The model pipeline was trained once and is **never retrained** during prediction.
- Preprocessing (OneHotEncoder) was fitted on training data and is embedded in the saved pipeline.

## Saved Model
`{MODEL_PATH}` — a scikit-learn `Pipeline` containing `ColumnTransformer` + `GradientBoostingRegressor`.

## Output
A single float representing the predicted `Total amount Withdrawn` (USD) for the requested ATM and date.

## Example Prediction
| Field | Value |
|---|---|
| ATM Name | {demo_atm} |
| Forecast Date | {demo_date} |
| Predicted Demand (USD) | {predicted:,.2f} |
| Actual Demand (USD, reference only) | {actual_note} |

## Limitations
1. **Lag/rolling features require history**: At minimum {MIN_HISTORY_ROWS} prior observations per ATM are needed. Cold-start predictions for a brand-new ATM with no history are not supported without modification.
2. **Context features for future dates**: `Festival Religion`, `Working Day`, and `Holiday Sequence` are derived from the historical dataset by seasonal proxy. For genuine future dates, a business calendar should supply these values directly.
3. **Dataset time coverage**: The model was trained on 2011–2017 data. Structural demand shifts after 2017 are not captured.
4. **ATM scope**: Only the 5 ATMs present in the training data are supported.
"""

    with open(REPORT_OUT, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Report saved to:   {REPORT_OUT}")

    print("\n" + "=" * 60)
    print("Phase 6 — Prediction pipeline verified successfully.")
    print("=" * 60)
