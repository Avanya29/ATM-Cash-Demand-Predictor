# Feature Dictionary

TARGET:
- **Total amount Withdrawn**: (Float) Total cash withdrawn from the ATM on the given day.

SAFE FEATURES (Available before prediction):

**Calendar Features**
- **year**: (Int) The year of the transaction.
- **month**: (Int) The month (1-12) of the transaction.
- **day_of_month**: (Int) The day of the month (1-31).
- **day_of_week**: (Int) Monday=0, Sunday=6.
- **week_of_year**: (Int) ISO week number.
- **quarter**: (Int) Quarter of the year (1-4).
- **is_weekend**: (Int) 1 if Saturday/Sunday, 0 otherwise.

**Cyclical Features**
- **day_of_week_sin**, **day_of_week_cos**: (Float) Sine/Cosine encoding of day of week.
- **month_sin**, **month_cos**: (Float) Sine/Cosine encoding of month.

**Categorical / Context Features**
- **ATM Name**: (String) Identifier of the ATM.
- **Weekday**: (String) Name of the day.
- **Festival Religion**: (String) Religious context for the festival.
- **Working Day**: (String) W (Working) or H (Holiday).
- **Holiday Sequence**: (String) 3-day window context (e.g. WHH, WWW).

**Historical Lag Features**
- **demand_lag_1**, **demand_lag_2**, **demand_lag_3**, **demand_lag_7**, **demand_lag_14**: (Float) The Total amount Withdrawn 1, 2, 3, 7, and 14 days ago respectively for the same ATM.

**Historical Rolling Features**
- **demand_rolling_mean_3**, **demand_rolling_mean_7**, **demand_rolling_mean_14**: (Float) Moving average of cash demand over the previous 3, 7, 14 days (excluding current day).
- **demand_rolling_std_7**, **demand_rolling_std_14**: (Float) Moving standard deviation of cash demand over the previous 7, 14 days (excluding current day).

**Historical Trend Features**
- **demand_change_1d**: (Float) Difference between 1-day ago and 2-days ago demand.
- **demand_change_7d**: (Float) Difference between 1-day ago and 8-days ago demand.

UNSAFE / LEAKAGE FEATURES (EXCLUDED):
- No Of Withdrawals
- No Of XYZ Card Withdrawals
- No Of Other Card Withdrawals
- Amount withdrawn XYZ Card
- Amount withdrawn Other Card
