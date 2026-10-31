# Feature Engineering Report

## Summary of Calendar-Day Feature Corrections
- **Grid Construction**: Each ATM's time series was reindexed onto a complete daily calendar (`freq='D'`) spanning from its earliest observation (2011-01-01) to its latest (2017-09-29), producing 2,464 calendar days per ATM (12,320 total ATM-date pairs).
- **Missing Date Semantics**: Missing calendar dates (731 days across all 5 ATMs) are preserved as `NaN` target values. They are **never** filled with zero or forward-filled without domain justification.
- **Calendar Lag Corrections**: `demand_lag_1`, `demand_lag_2`, `demand_lag_3`, `demand_lag_7`, and `demand_lag_14` now refer strictly to calendar dates $t-1, t-2, t-3, t-7, t-14$ for the same ATM. If an antecedent date was unobserved, that lag correctly evaluates to `NaN`.
- **Calendar Rolling Windows**: Rolling means and standard deviations are computed on strictly prior calendar days (shifted by 1 day to prevent target leakage). Moving averages use `min_periods=1` (`min_periods=2` for std) to aggregate observed days within the 3, 7, and 14 calendar-day windows.
- **Impact on Feature Availability**:
  - Total observed transactions in raw cleaned dataset: 11589
  - Complete calendar grid: 12320 ATM-date pairs
  - Model-ready observations: 10296
  - Rows excluded: 1293 (70 initial burn-in rows at the beginning of each series + 1223 rows where required calendar lags fell on unobserved dates).

## Features Included
- **Target Variable**: `Total amount Withdrawn`
- **Calendar Features**: `year`, `month`, `day_of_month`, `day_of_week`, `week_of_year`, `quarter`, `is_weekend`
- **Cyclical Features**: `day_of_week_sin`, `day_of_week_cos`, `month_sin`, `month_cos`
- **Context Features**: `ATM Name`, `Weekday`, `Festival Religion`, `Working Day`, `Holiday Sequence`
- **Calendar Lag Features**: `demand_lag_1`, `demand_lag_2`, `demand_lag_3`, `demand_lag_7`, `demand_lag_14`
- **Calendar Rolling Features**: `demand_rolling_mean_3`, `demand_rolling_mean_7`, `demand_rolling_mean_14`, `demand_rolling_std_7`, `demand_rolling_std_14`
- **Trend Features**: `demand_change_1d`, `demand_change_7d`

## Validation Checks Passed
1. Number of unique ATMs remains 5.
2. Target values on observed days match raw cleaned dataset exactly.
3. No duplicate ATM + Transaction Date pairs.
4. Dates are strictly chronological and monotonically increasing per ATM.
5. Calendar lag values correspond to actual historical calendar dates ($t - k$).
6. Rolling features use only strictly prior observations (no future or current-day leakage).
7. Zero infinite or NaN values in model-ready dataset.
