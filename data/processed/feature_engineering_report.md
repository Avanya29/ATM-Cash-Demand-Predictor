# Feature Engineering Report

- **Original row count**: 11589
- **Final row count (Model-Ready)**: 11519
- **Number of features**: 30
- **Target variable**: Total amount Withdrawn
- **Calendar features**: year, month, day_of_month, day_of_week, week_of_year, quarter, is_weekend
- **Cyclical features**: day_of_week_sin, day_of_week_cos, month_sin, month_cos
- **Lag features**: demand_lag_1, demand_lag_2, demand_lag_3, demand_lag_7, demand_lag_14
- **Rolling features**: demand_rolling_mean_3, demand_rolling_mean_7, demand_rolling_mean_14, demand_rolling_std_7, demand_rolling_std_14
- **Trend features**: demand_change_1d, demand_change_7d
- **Categorical features**: ATM Name, Weekday, Festival Religion, Working Day, Holiday Sequence
- **Features excluded because of leakage**: No Of Withdrawals, No Of XYZ Card Withdrawals, No Of Other Card Withdrawals, Amount withdrawn XYZ Card, Amount withdrawn Other Card
- **Rows removed**: 70 rows were removed to drop NaNs caused by the 14-day rolling windows and lags at the start of each ATM's time series.
- **Leakage checks performed**: Lags were properly grouped by ATM and shifted(1) before rolling windows to ensure the current day's demand is entirely excluded from the predictors.
- **Final modeling-ready dataset location**: data/processed/atm_features_model_ready.csv
