# Baseline Evaluation Report

## Dataset Information
- **Source**: `data/processed/atm_features_model_ready.csv`
- **Total ATMs**: 5
- **Total Rows**: 11519

## Methodology
- **Split Strategy**: Chronological split per ATM to prevent data leakage and preserve temporal ordering. Random shuffling is strictly forbidden in time-series forecasting to ensure no future data leaks into the past.
- **Split Proportions**: 70% Train, 15% Validation, 15% Test.

## Date Ranges
- **Train**: 2011-01-15 to 2015-08-03
- **Validation**: 2015-05-19 to 2016-08-04
- **Test**: 2016-05-13 to 2017-09-29

## Baseline Definitions
- **Naive Previous Day**: Predicted demand = `demand_lag_1`
- **7-Day Historical Average**: Predicted demand = `demand_rolling_mean_7`

## Overall Metrics
| Model | Dataset | MAE | RMSE | MAPE | WAPE |
| --- | --- | --- | --- | --- | --- |
| Naive Previous Day | Validation | 3304.3099 | 4529.3178 | 5.2195 | 0.4499 |
| 7-Day Historical Average | Validation | 2717.5956 | 3653.7719 | 7.6389 | 0.3700 |
| Naive Previous Day | Test | 3082.6388 | 4419.1805 | 6.5502 | 0.4829 |
| 7-Day Historical Average | Test | 2652.5003 | 3704.8831 | 13.0644 | 0.4155 |

## Per-ATM Test Metrics
| ATM Name | Model | MAE | RMSE | MAPE | WAPE |
| --- | --- | --- | --- | --- | --- |
| Airport ATM | Naive Previous Day | 2377.4638 | 3134.9945 | 5.9821 | 0.5272 |
| Airport ATM | 7-Day Historical Average | 2219.4270 | 2879.7636 | 10.1613 | 0.4921 |
| Big Street ATM | Naive Previous Day | 1928.8920 | 2521.5569 | 5.6987 | 0.3672 |
| Big Street ATM | 7-Day Historical Average | 1657.3519 | 2177.5625 | 7.3386 | 0.3155 |
| Christ College ATM | Naive Previous Day | 5096.0930 | 6549.0190 | 3.0793 | 0.4500 |
| Christ College ATM | 7-Day Historical Average | 4142.7812 | 5342.9470 | 14.8511 | 0.3659 |
| KK Nagar ATM | Naive Previous Day | 3700.4544 | 5300.7140 | 15.8018 | 0.5583 |
| KK Nagar ATM | 7-Day Historical Average | 3151.7241 | 4379.3773 | 29.4597 | 0.4755 |
| Mount Road ATM | Naive Previous Day | 2235.3431 | 3085.2029 | 1.9103 | 0.5574 |
| Mount Road ATM | 7-Day Historical Average | 2039.7571 | 2700.4286 | 2.8337 | 0.5086 |

## Observations
- The 7-Day Historical Average generally provides a smoother and more robust baseline, capturing the typical weekly demand.
- Naive Previous Day struggles with strong day-to-day volatility but adapts instantly to sudden structural shifts.
- Forecasting difficulty varies considerably by ATM location, as seen in the per-ATM WAPE scores.

## Limitations
- These are purely historical baselines. They do not incorporate calendar features (like Day of Week or Month), contextual features (like Working Day or Festivals), or capture any complex seasonalities. Advanced ML models will address these gaps.
