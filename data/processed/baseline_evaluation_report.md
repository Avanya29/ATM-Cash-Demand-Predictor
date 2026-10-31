# Baseline Evaluation Report (Common Calendar-Date Split)

## Methodology Overview
- **Primary Benchmark (Common Calendar Cutoff)**: To eliminate cross-ATM macro leakage and evaluate all 5 ATMs across the exact same economic and calendar horizon, unified date cutoffs are enforced:
  - **Training Period**: `Transaction Date <= 2015-12-31` (8,596 rows across 5 ATMs)
  - **Validation Period**: `2016-01-01` to `2016-12-31` (914 rows across 5 ATMs)
  - **Test Period**: `2017-01-01` to `2017-09-29` (786 rows across 5 ATMs)
- **Secondary Diagnostic Benchmark**: The legacy per-ATM 70/15/15 ratio split is retained for diagnostic comparison.

## Eligible Rows and Date Ranges by ATM (Common Calendar Split)
| ATM Name | Total Rows | Train Rows | Val Rows | Test Rows | Train Range | Val Range | Test Range |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Airport ATM | 1895 | 1694 | 120 | 81 | 2011-01-15 to 2015-12-31 | 2016-01-03 to 2016-10-28 | 2017-01-23 to 2017-09-29 |
| Big Street ATM | 2099 | 1694 | 233 | 172 | 2011-01-15 to 2015-12-31 | 2016-01-01 to 2016-11-25 | 2017-01-31 to 2017-09-29 |
| Christ College ATM | 2164 | 1751 | 236 | 177 | 2011-01-15 to 2015-12-31 | 2016-01-01 to 2016-11-08 | 2017-02-03 to 2017-09-29 |
| KK Nagar ATM | 2151 | 1747 | 229 | 175 | 2011-01-15 to 2015-12-31 | 2016-01-01 to 2016-12-01 | 2017-01-11 to 2017-09-29 |
| Mount Road ATM | 1987 | 1710 | 96 | 181 | 2011-01-15 to 2015-12-02 | 2016-02-06 to 2016-11-08 | 2017-02-15 to 2017-09-29 |

## Baseline Model Definitions
1. **Naive Previous Day**: Predicted demand = `demand_lag_1` (demand on calendar date t - 1).
2. **7-Day Historical Average**: Predicted demand = `demand_rolling_mean_7` (moving average of observed demand over prior 7 calendar days t-7 to t-1).

## Primary Common-Calendar Baseline Metrics
*Evaluated on exactly 914 validation rows and 786 test rows.*

| Model | Dataset | Rows | MAE | RMSE | MAPE | WAPE |
| --- | --- | --- | --- | --- | --- | --- |
| Naive Previous Day | Validation | 914 | 3233.9702 | 4448.6636 | 3.9860 | 0.4355 |
| 7-Day Historical Average | Validation | 914 | 2643.1562 | 3606.4943 | 3.7599 | 0.3560 |
| Naive Previous Day | Test | 786 | 3525.6360 | 5085.7194 | 1.4392 | 0.4710 |
| 7-Day Historical Average | Test | 786 | 2969.4012 | 4133.4141 | 1.5750 | 0.3967 |

### Understanding Percentage Error Metrics (MAPE vs WAPE)
> **Note on MAPE sensitivity**: Unweighted Mean Absolute Percentage Error (MAPE) divides errors by individual daily actual demands (|y - y_hat| / y). On days with very small withdrawals (e.g. $50–$200), even moderate errors produce extreme individual percentage errors (>300%), causing unweighted arithmetic averages to report MAPE > 100%.
> **Weighted Absolute Percentage Error (WAPE)** (sum(|y - y_hat|) / sum(y)) weights each error by transaction volume and is the authoritative percentage error metric for cash demand operations.

## Per-ATM Test Performance (Common Calendar 2017 Test Set)
*Each ATM is evaluated on its exact eligible 2017 test rows.*

| ATM Name | Model | Rows | MAE | RMSE | MAPE | WAPE |
| --- | --- | --- | --- | --- | --- | --- |
| Airport ATM | Naive Previous Day | 81 | 2621.0040 | 3269.4647 | 4.3113 | 0.4008 |
| Airport ATM | 7-Day Historical Average | 81 | 2440.6374 | 3028.6259 | 4.6016 | 0.3732 |
| Big Street ATM | Naive Previous Day | 172 | 2006.7364 | 2617.3406 | 0.5388 | 0.3491 |
| Big Street ATM | 7-Day Historical Average | 172 | 1741.7151 | 2215.8558 | 0.5709 | 0.3030 |
| Christ College ATM | Naive Previous Day | 177 | 5895.5289 | 7383.0191 | 1.8830 | 0.4916 |
| Christ College ATM | 7-Day Historical Average | 177 | 4509.7926 | 5752.8715 | 2.3032 | 0.3760 |
| KK Nagar ATM | Naive Previous Day | 175 | 4597.7536 | 6409.0094 | 1.2701 | 0.5360 |
| KK Nagar ATM | 7-Day Historical Average | 175 | 3940.3611 | 5218.8094 | 1.3228 | 0.4594 |
| Mount Road ATM | Naive Previous Day | 181 | 2019.7483 | 2829.5249 | 0.7392 | 0.4933 |
| Mount Road ATM | 7-Day Historical Average | 181 | 1927.5483 | 2593.2262 | 0.7065 | 0.4708 |

## Secondary Diagnostic: Per-ATM Ratio Split Metrics (70/15/15)
*Retained for diagnostic comparison against prior iterations (Validation=1,545 rows, Test=1,547 rows).*

| Model | Dataset | Rows | MAE | RMSE | MAPE | WAPE |
| --- | --- | --- | --- | --- | --- | --- |
| Naive Previous Day | Validation | 1545 | 3406.7361 | 4622.8019 | 2.6655 | 0.3991 |
| 7-Day Historical Average | Validation | 1545 | 2750.0621 | 3661.7928 | 3.3615 | 0.3222 |
| Naive Previous Day | Test | 1547 | 3206.7821 | 4504.5856 | 3.5909 | 0.4556 |
| 7-Day Historical Average | Test | 1547 | 2684.0662 | 3696.6314 | 4.2696 | 0.3813 |

## Key Observations
1. **Unified Horizon Parity**: Under the common calendar split, all 5 ATMs are tested exclusively in 2017. The 7-Day Historical Average achieves a Test MAE of 2,969.40 and WAPE of 0.3967 on the unified 786 test rows.
2. **Baseline Dominance of 7-Day Average**: Across both validation and test sets, the 7-Day Historical Average substantially outperforms the Naive Previous Day model (Test MAE 2,969.40 vs 3,525.64, Test WAPE 0.3967 vs 0.4710), confirming strong weekly demand stability.
3. **Data Leakage Elimination**: Because all training dates terminate strictly on or before 2015-12-31, models trained on this split cannot peek into 2016 or 2017 data for any ATM.
