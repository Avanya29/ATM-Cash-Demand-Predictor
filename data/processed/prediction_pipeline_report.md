# Prediction Pipeline Report

## Purpose
Load the trained production pipeline (Random Forest, selected on Common-Calendar validation split)
and generate ATM cash-demand predictions using only historically available information.

## Input
| Field | Value |
|---|---|
| Feature dataset | `data/processed/atm_features_model_ready.csv` |
| Cleaned dataset | `data/processed/atm_transactions_cleaned.csv` |
| Selected Production Model | `models/random_forest_pipeline.joblib` |
| Benchmark Model Artifacts | `models/gradient_boosting_pipeline.joblib`, `models/linear_regression_pipeline.joblib` |

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

## Active Production Model
`models/random_forest_pipeline.joblib` — a scikit-learn `Pipeline` containing `ColumnTransformer` + `RandomForestRegressor(n_estimators=300, min_samples_leaf=2)`.
Selected via pre-registered Common Calendar validation benchmark (2016 split MAE: $2,565.97).

*Note: Gradient Boosting (`models/gradient_boosting_pipeline.joblib`) is maintained as an active benchmark model for macro-shock and expanding-window studies.*

## Output
A single float representing the predicted `Total amount Withdrawn` (USD) for the requested ATM and date.

## Example Prediction
| Field | Value |
|---|---|
| ATM Name | Mount Road ATM |
| Forecast Date | 2017-06-15 |
| Production Model | Random Forest (`models/random_forest_pipeline.joblib`) |
| Predicted Demand (USD) | 4,375.62 |
| Actual Demand (USD, reference only) | 1,915.76 |
| Gradient Boosting Benchmark (USD) | 3,466.29 |

## Limitations
1. **Lag/rolling features require history**: At minimum 14 prior observations per ATM are needed. Cold-start predictions for a brand-new ATM with no history are not supported without modification.
2. **Context features for future dates**: `Festival Religion`, `Working Day`, and `Holiday Sequence` are derived from the historical dataset by seasonal proxy. For genuine future dates, a business calendar should supply these values directly.
3. **Dataset time coverage**: The model was trained on 2011–2017 data. Structural demand shifts after 2017 are not captured.
4. **ATM scope**: Only the 5 ATMs present in the training data are supported.
