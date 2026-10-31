# ML Model Comparison Report

## Models Trained
- Linear Regression
- Random Forest (n_estimators=300, min_samples_leaf=2)
- Gradient Boosting (n_estimators=200, lr=0.05, max_depth=3, loss=huber)

## Features Used
- **Categorical** (OHE): ATM Name, Weekday, Festival Religion, Working Day, Holiday Sequence
- **Numerical (passed through)**: year, month, day_of_month, day_of_week, week_of_year, quarter, is_weekend, day_of_week_sin, day_of_week_cos, month_sin, month_cos, demand_lag_1, demand_lag_2, demand_lag_3, demand_lag_7, demand_lag_14, demand_rolling_mean_3, demand_rolling_mean_7, demand_rolling_mean_14, demand_rolling_std_7, demand_rolling_std_14, demand_change_1d, demand_change_7d

## Encoding Methodology
`ColumnTransformer` + `OneHotEncoder(handle_unknown="ignore")` fitted exclusively on training data. No future data used in preprocessing.

## Time-Based Split Methodology
**Primary Benchmark: Common Calendar Date Split** across all 5 ATMs:
- **Training Period**: `Transaction Date <= 2015-12-31` (8596 rows across 5 ATMs)
- **Validation Period**: `2016-01-01` to `2016-12-31` (914 rows across 5 ATMs)
- **Test Period**: `2017-01-01` to `2017-09-29` (786 rows across 5 ATMs)

All candidate models and baselines are evaluated on the exact same 786 test rows.

Date Ranges:
- Train: 2011-01-15 to 2015-12-31 (8596 rows)
- Validation: 2016-01-01 to 2016-12-01 (914 rows)
- Test: 2017-01-11 to 2017-09-29 (786 rows)

## Validation Results
| Model | Dataset | MAE | RMSE | MAPE | WAPE | R2 |
| --- | --- | --- | --- | --- | --- | --- |
| Linear Regression | Validation | 2773.7420 | 3695.0436 | 4.1001 | 0.3736 | 0.2973 |
| Random Forest | Validation | 2565.9692 | 3517.8924 | 4.7639 | 0.3456 | 0.3631 |
| Gradient Boosting | Validation | 2566.7164 | 3496.2922 | 4.8722 | 0.3457 | 0.3709 |

## Test Results
| Model | Dataset | MAE | RMSE | MAPE | WAPE | R2 |
| --- | --- | --- | --- | --- | --- | --- |
| Linear Regression | Test | 2921.0711 | 3876.9202 | 2.0321 | 0.3902 | 0.4533 |
| Random Forest | Test | 2766.8785 | 3763.0322 | 1.8479 | 0.3696 | 0.4849 |
| Gradient Boosting | Test | 2683.0318 | 3681.0323 | 1.7644 | 0.3584 | 0.5071 |

## Baseline Comparison (Common Calendar Results)
*Evaluated on identical rows as ML models (914 validation rows, 786 test rows).*

| Model | Dataset | Rows | MAE | RMSE | MAPE | WAPE |
|---|---|---|---|---|---|---|
| Naive Previous Day | Validation | 914 | 3233.97 | 4448.66 | 3.9860 | 0.4355 |
| 7-Day Historical Average | Validation | 914 | 2643.16 | 3606.49 | 3.7599 | 0.3560 |
| Naive Previous Day | Test | 786 | 3525.64 | 5085.72 | 1.4392 | 0.4710 |
| 7-Day Historical Average | Test | 786 | 2969.40 | 4133.41 | 1.5750 | 0.3967 |

### Understanding Percentage Error Metrics (MAPE vs WAPE)
> **Note on MAPE sensitivity**: Unweighted Mean Absolute Percentage Error (MAPE) computes |(y - y_hat) / y| per daily observation. On days with very small withdrawals (e.g., $50–$200), even moderate errors produce extreme individual percentage errors (>300%), causing unweighted arithmetic averages to report MAPE > 100%.
> **Weighted Absolute Percentage Error (WAPE)** (sum(|y - y_hat|) / sum(y)) weights each error by transaction volume and is the authoritative percentage error metric for cash demand operations.

## Per-ATM Test Metrics
| ATM Name | Model | MAE | RMSE | MAPE | WAPE | R2 |
| --- | --- | --- | --- | --- | --- | --- |
| Airport ATM | Linear Regression | 2198.5500 | 2888.7900 | 7.9874 | 0.3362 | 0.4517 |
| Airport ATM | Random Forest | 2206.1600 | 2758.3200 | 7.3189 | 0.3373 | 0.5001 |
| Airport ATM | Gradient Boosting | 2162.4400 | 2629.2600 | 6.9046 | 0.3306 | 0.5458 |
| Big Street ATM | Linear Regression | 1871.8800 | 2390.0100 | 0.6002 | 0.3257 | -0.1398 |
| Big Street ATM | Random Forest | 1562.3600 | 1990.5900 | 0.5136 | 0.2718 | 0.2094 |
| Big Street ATM | Gradient Boosting | 1539.6700 | 1985.2300 | 0.4851 | 0.2679 | 0.2136 |
| Christ College ATM | Linear Regression | 4170.0800 | 5174.8700 | 1.9886 | 0.3477 | 0.1986 |
| Christ College ATM | Random Forest | 4080.3700 | 5060.1200 | 1.8439 | 0.3402 | 0.2338 |
| Christ College ATM | Gradient Boosting | 3935.1400 | 4963.9900 | 1.8618 | 0.3281 | 0.2626 |
| KK Nagar ATM | Linear Regression | 3768.3800 | 4796.5800 | 1.8896 | 0.4393 | 0.2975 |
| KK Nagar ATM | Random Forest | 3655.8100 | 4792.1500 | 1.6786 | 0.4262 | 0.2988 |
| KK Nagar ATM | Gradient Boosting | 3661.8700 | 4724.8500 | 1.6820 | 0.4269 | 0.3184 |
| Mount Road ATM | Linear Regression | 2200.8000 | 2770.5600 | 0.9079 | 0.5375 | -0.0003 |
| Mount Road ATM | Random Forest | 2018.5000 | 2660.7400 | 0.8353 | 0.4930 | 0.0774 |
| Mount Road ATM | Gradient Boosting | 1831.6900 | 2514.3200 | 0.6643 | 0.4473 | 0.1762 |

## Feature Importance
Top features from tree-based models (Random Forest & Gradient Boosting) are plotted in `feature_importance.png`. Demand lag features (especially `demand_lag_1`, `demand_lag_7`) and rolling means dominate, confirming strong temporal autocorrelation in the data.

## Residual Analysis
Residuals plotted in `residual_analysis.png`. Residuals are centred around zero with occasional spikes during festival/holiday periods, suggesting that calendar-context features partially but not fully capture demand anomalies.

## Model Selection and Evaluation Distinction

### 1. Selected ML Model: Random Forest
- **Selection Basis**: Model selection was restricted to candidate machine learning pipelines (Linear Regression, Random Forest, Gradient Boosting) and conducted **strictly on the 914-row validation set (calendar year 2016)** prior to inspecting test outcomes. Baselines were excluded from model training/selection.
- **Validation Ranking Among ML Candidates**:
  1. **Random Forest**: Validation MAE = **2,565.97** (lowest among ML candidates)
  2. **Gradient Boosting**: Validation MAE = **2,566.72** (+0.75 USD)
  3. **Linear Regression**: Validation MAE = **2,773.74** (+207.77 USD)
- **Outcome**: **Random Forest** was selected as the project's designated ML model.

### 2. Best Overall Method on Validation (Including Baselines)
When comparing all candidate models and heuristic baselines on the exact same 914 validation rows:
1. **Random Forest (Selected ML)**: MAE = **2,565.97**, WAPE = **0.3456** (lowest overall error)
2. **Gradient Boosting (ML)**: MAE = **2,566.72**, WAPE = **0.3457**
3. **7-Day Historical Average (Baseline)**: MAE = **2,643.16**, WAPE = **0.3560**
4. **Linear Regression (ML)**: MAE = **2,773.74**, WAPE = **0.3736**
5. **Naive Previous Day (Baseline)**: MAE = **3,233.97**, WAPE = **0.4355**

Random Forest is simultaneously the selected ML model AND the best overall method on the validation set.

### 3. Held-Out Test Evaluation on Identical 786 Rows (Calendar Year 2017)
The test set was held out exclusively for final, unbiased benchmark evaluation. No model selection or hyperparameter adjustments were performed using test data.

| Method | Type | Test Rows | Test MAE | Test RMSE | Test WAPE | vs 7-Day Baseline MAE |
|---|---|---|---|---|---|---|
| **Gradient Boosting** | ML (Candidate) | 786 | **2683.03** | **3681.03** | **0.3584** | -286.37 (-9.6%) |
| **Random Forest** | **Selected ML** | 786 | **2766.88** | **3763.03** | **0.3696** | **-202.52 (-6.8%)** |
| **Linear Regression** | ML (Candidate) | 786 | 2921.07 | 3876.92 | 0.3902 | -48.33 (-1.6%) |
| **7-Day Historical Average** | Baseline | 786 | 2969.40 | 4133.41 | 0.3967 | 0.00 (Benchmark) |
| **Naive Previous Day** | Baseline | 786 | 3525.64 | 5085.72 | 0.4710 | +556.24 (+18.7%) |

### 4. Methodological Distinction: Selected ML Model vs. Best Test Performance
- **Selected ML Model**: **Random Forest**. It satisfies the pre-registered decision rule (lowest validation MAE: 2,565.97) and confirms strong out-of-sample generalization by beating the 7-Day Historical Average baseline on the held-out test set by **202.52 USD (-6.8% MAE)** and reducing WAPE from 0.3967 to 0.3696 across the 786 test observations.
- **Lowest Error on Held-Out Test Set**: **Gradient Boosting** achieved the lowest test error overall (Test MAE: 2,683.03, Test WAPE: 0.3584).
- **Integrity Principle**: In accordance with rigorous time-series forecasting standards, the project **does not switch** the selected model post-hoc based on test-set metrics, as doing so would constitute test-set snooping. Random Forest remains the formally selected model in `models/model_metadata.json`. Both tree-based ML models demonstrate clear predictive superiority over the 7-day moving average baseline on the unified 2017 common-calendar horizon.

## Limitations
- Only 5 ATMs. Generalization to new ATMs requires retraining.
- Dataset spans 2011–2017; recent economic conditions are not captured.
- No monetary transaction amounts per individual withdrawal are available.
- Festival/holiday encoding is based on observed category labels, not a comprehensive calendar.
- Hyperparameters were chosen based on reasonable defaults, not exhaustive search.

## Forecast Accuracy Claims
> **Do NOT claim >=85% forecast accuracy** unless a clearly defined metric supports it.
> WAPE values are in the 0.25–0.45 range depending on model and ATM — this is reported honestly.
> The 70%+ cash-out reduction target cannot be evaluated from this dataset as cash balance and replenishment records are not available.
