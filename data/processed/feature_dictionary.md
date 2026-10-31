# Feature Dictionary

TARGET:
- **Total amount Withdrawn**: (Float) Total cash withdrawn from the ATM on the given day (USD). Kept as NaN for unobserved calendar dates; never imputed with 0 or forward-filled.

SAFE FEATURES (Available prior to prediction date):

**Calendar Features** (Re-derived directly from `Transaction Date`):
- **year**: (Int) Year of transaction.
- **month**: (Int) Month (1-12).
- **day_of_month**: (Int) Day of month (1-31).
- **day_of_week**: (Int) Monday=0, Sunday=6.
- **week_of_year**: (Int) ISO week number.
- **quarter**: (Int) Quarter of the year (1-4).
- **is_weekend**: (Int) 1 if Saturday or Sunday, 0 otherwise.

**Cyclical Features**:
- **day_of_week_sin**, **day_of_week_cos**: (Float) Sine/Cosine encoding of day of week.
- **month_sin**, **month_cos**: (Float) Sine/Cosine encoding of month.

**Categorical / Context Features**:
- **ATM Name**: (String) Identifier of the ATM (5 locations).
- **Weekday**: (String) Name of the day (Monday–Sunday).
- **Festival Religion**: (String) Religious context for the festival (e.g. NH, H, C, M).
- **Working Day**: (String) W (Working Day) or H (Holiday).
- **Holiday Sequence**: (String) 3-day sequence context (e.g. WWW, WHH, HHH).

**Historical Calendar Lag Features**:
- **demand_lag_1**: (Float) Total amount Withdrawn on calendar date (t - 1 day) for the same ATM.
- **demand_lag_2**: (Float) Total amount Withdrawn on calendar date (t - 2 days) for the same ATM.
- **demand_lag_3**: (Float) Total amount Withdrawn on calendar date (t - 3 days) for the same ATM.
- **demand_lag_7**: (Float) Total amount Withdrawn on calendar date (t - 7 days) for the same ATM.
- **demand_lag_14**: (Float) Total amount Withdrawn on calendar date (t - 14 days) for the same ATM.

**Historical Calendar Rolling Features**:
- **demand_rolling_mean_3**: (Float) Moving average of cash demand over previous 3 calendar days {t-3, t-2, t-1} (excluding current day).
- **demand_rolling_mean_7**: (Float) Moving average of cash demand over previous 7 calendar days {t-7, ..., t-1} (excluding current day).
- **demand_rolling_mean_14**: (Float) Moving average of cash demand over previous 14 calendar days {t-14, ..., t-1} (excluding current day).
- **demand_rolling_std_7**: (Float) Moving sample standard deviation of cash demand over previous 7 calendar days (min 2 observations).
- **demand_rolling_std_14**: (Float) Moving sample standard deviation of cash demand over previous 14 calendar days (min 2 observations).

**Historical Trend Features**:
- **demand_change_1d**: (Float) Difference between 1-calendar-day-ago and 2-calendar-days-ago demand (`demand_lag_1 - demand_lag_2`).
- **demand_change_7d**: (Float) Difference between 1-calendar-day-ago and 8-calendar-days-ago demand (`demand_lag_1 - demand_lag_8`).

UNSAFE / LEAKAGE FEATURES (EXCLUDED):
- `No Of Withdrawals`
- `No Of XYZ Card Withdrawals`
- `No Of Other Card Withdrawals`
- `Amount withdrawn XYZ Card`
- `Amount withdrawn Other Card`
