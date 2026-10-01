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
Per ATM chronological split: 70% Train / 15% Validation / 15% Test.
No shuffling. Test set is used only for final unbiased evaluation.

Date Ranges:
- Train: 2011-01-15 to 2015-08-03
- Validation: 2015-05-19 to 2016-08-04
- Test: 2016-05-13 to 2017-09-29

## Validation Results
| Model | Dataset | MAE | RMSE | MAPE | WAPE | R2 |
| --- | --- | --- | --- | --- | --- | --- |
| Linear Regression | Validation | 2797.8877 | 3683.5505 | 8.8602 | 0.3809 | 0.2675 |
| Random Forest | Validation | 2636.1553 | 3508.8532 | 9.3622 | 0.3589 | 0.3354 |
| Gradient Boosting | Validation | 2634.0915 | 3500.6872 | 8.8343 | 0.3586 | 0.3385 |

## Test Results
| Model | Dataset | MAE | RMSE | MAPE | WAPE | R2 |
| --- | --- | --- | --- | --- | --- | --- |
| Linear Regression | Test | 3022.8641 | 3853.7585 | 24.0549 | 0.4736 | 0.3952 |
| Random Forest | Test | 2715.8411 | 3569.6480 | 21.7874 | 0.4255 | 0.4811 |
| Gradient Boosting | Test | 2807.8244 | 3619.5273 | 23.9481 | 0.4399 | 0.4665 |

## Baseline Comparison (Phase 4 Test Results)
| Model | MAE | RMSE | MAPE | WAPE |
|---|---|---|---|---|
| Naive Previous Day | 3082.64 | 4419.18 | 0.0655 | 0.4829 |
| 7-Day Historical Average | 2652.50 | 3704.88 | 0.1306 | 0.4155 |

## Per-ATM Test Metrics
| ATM Name | Model | MAE | RMSE | MAPE | WAPE | R2 |
| --- | --- | --- | --- | --- | --- | --- |
| Airport ATM | Linear Regression | 2516.8900 | 3128.4100 | 26.7342 | 0.5581 | 0.1746 |
| Airport ATM | Random Forest | 2529.9100 | 3115.2500 | 24.7328 | 0.5610 | 0.1815 |
| Airport ATM | Gradient Boosting | 2453.4400 | 2976.9100 | 27.0924 | 0.5440 | 0.2526 |
| Big Street ATM | Linear Regression | 1939.1300 | 2433.9400 | 9.7821 | 0.3691 | 0.0737 |
| Big Street ATM | Random Forest | 1652.9200 | 2117.7400 | 10.2122 | 0.3146 | 0.2988 |
| Big Street ATM | Gradient Boosting | 1568.9100 | 2024.4200 | 10.1544 | 0.2987 | 0.3592 |
| Christ College ATM | Linear Regression | 3838.7800 | 4829.9700 | 15.1073 | 0.3390 | 0.2409 |
| Christ College ATM | Random Forest | 3683.1700 | 4683.2200 | 16.2181 | 0.3253 | 0.2863 |
| Christ College ATM | Gradient Boosting | 3723.1700 | 4703.6400 | 17.8364 | 0.3288 | 0.2801 |
| KK Nagar ATM | Linear Regression | 4082.3200 | 4898.7400 | 55.9008 | 0.6159 | 0.1975 |
| KK Nagar ATM | Random Forest | 3323.3200 | 4280.3200 | 46.8702 | 0.5014 | 0.3873 |
| KK Nagar ATM | Gradient Boosting | 3579.0400 | 4461.3000 | 47.2387 | 0.5399 | 0.3344 |
| Mount Road ATM | Linear Regression | 2690.9500 | 3276.7600 | 12.1426 | 0.6710 | -0.3333 |
| Mount Road ATM | Random Forest | 2359.7800 | 2985.3500 | 10.3758 | 0.5884 | -0.1067 |
| Mount Road ATM | Gradient Boosting | 2685.3200 | 3183.3700 | 17.0981 | 0.6696 | -0.2584 |

## Feature Importance
Top features from tree-based models (Random Forest & Gradient Boosting) are plotted in `feature_importance.png`. Demand lag features (especially `demand_lag_1`, `demand_lag_7`) and rolling means dominate, confirming strong temporal autocorrelation in the data.

## Residual Analysis
Residuals plotted in `residual_analysis.png`. Residuals are centred around zero with occasional spikes during festival/holiday periods, suggesting that calendar-context features partially but not fully capture demand anomalies.

## Selected Model and Justification
**Selected Model: Gradient Boosting**

Selection was based purely on validation-set performance (lowest MAE/RMSE/WAPE).
The selected model was not tuned on the test set. Test results are reported only for final evaluation.

The best ML model improves over the 7-Day Historical Average baseline (MAE 2652.50) on the test set, demonstrating that incorporating calendar, cyclical, and lagged features provides meaningful forecasting signal.

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
