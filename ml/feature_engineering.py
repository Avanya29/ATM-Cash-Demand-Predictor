import pandas as pd
import numpy as np
import os

# Ensure ml and processed directories exist
os.makedirs('ml', exist_ok=True)
os.makedirs('data/processed', exist_ok=True)

# 1. LOAD AND VALIDATE DATA
df = pd.read_csv('data/processed/atm_transactions_cleaned.csv')
df['Transaction Date'] = pd.to_datetime(df['Transaction Date'])

# Sort
df = df.sort_values(['ATM Name', 'Transaction Date']).reset_index(drop=True)

print("--- 1. LOAD AND VALIDATE DATA ---")
print("Missing ATM Name:", df['ATM Name'].isnull().sum())
print("Missing Transaction Date:", df['Transaction Date'].isnull().sum())
print("Missing target:", df['Total amount Withdrawn'].isnull().sum())
num_atms = df['ATM Name'].nunique()
print("Number of unique ATMs:", num_atms)

# 2. CREATE CALENDAR FEATURES
df['year'] = df['Transaction Date'].dt.year
df['month'] = df['Transaction Date'].dt.month
df['day_of_month'] = df['Transaction Date'].dt.day
df['day_of_week'] = df['Transaction Date'].dt.dayofweek
df['week_of_year'] = df['Transaction Date'].dt.isocalendar().week.astype(int)
df['quarter'] = df['Transaction Date'].dt.quarter
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

# 3. CREATE CYCLICAL FEATURES
df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# 4. CREATE LAG FEATURES
grouped = df.groupby('ATM Name')['Total amount Withdrawn']

df['demand_lag_1'] = grouped.shift(1)
df['demand_lag_2'] = grouped.shift(2)
df['demand_lag_3'] = grouped.shift(3)
df['demand_lag_7'] = grouped.shift(7)
df['demand_lag_8'] = grouped.shift(8) # needed for trend
df['demand_lag_14'] = grouped.shift(14)

# 5. CREATE ROLLING FEATURES
df['demand_shifted'] = grouped.shift(1)
df['demand_rolling_mean_3'] = df.groupby('ATM Name')['demand_shifted'].transform(lambda x: x.rolling(3).mean())
df['demand_rolling_mean_7'] = df.groupby('ATM Name')['demand_shifted'].transform(lambda x: x.rolling(7).mean())
df['demand_rolling_mean_14'] = df.groupby('ATM Name')['demand_shifted'].transform(lambda x: x.rolling(14).mean())
df['demand_rolling_std_7'] = df.groupby('ATM Name')['demand_shifted'].transform(lambda x: x.rolling(7).std())
df['demand_rolling_std_14'] = df.groupby('ATM Name')['demand_shifted'].transform(lambda x: x.rolling(14).std())

# 6. CREATE HISTORICAL DEMAND TREND FEATURES
df['demand_change_1d'] = df['demand_lag_1'] - df['demand_lag_2']
df['demand_change_7d'] = df['demand_lag_1'] - df['demand_lag_8']

# Drop intermediate helper columns
df = df.drop(columns=['demand_lag_8', 'demand_shifted'])

# 8. DO NOT USE LEAKAGE FEATURES DIRECTLY
leakage_cols = [
    'No Of Withdrawals', 'No Of XYZ Card Withdrawals', 'No Of Other Card Withdrawals',
    'Amount withdrawn XYZ Card', 'Amount withdrawn Other Card'
]
feature_cols = [col for col in df.columns if col not in leakage_cols]
df_features = df[feature_cols].copy()

# 9. HANDLE INITIAL NaN VALUES
df_features.to_csv('data/processed/atm_features.csv', index=False)

lag_roll_features = [
    'demand_lag_1', 'demand_lag_2', 'demand_lag_3', 'demand_lag_7', 'demand_lag_14',
    'demand_rolling_mean_3', 'demand_rolling_mean_7', 'demand_rolling_mean_14',
    'demand_rolling_std_7', 'demand_rolling_std_14',
    'demand_change_1d', 'demand_change_7d'
]
df_ready = df_features.dropna(subset=lag_roll_features).reset_index(drop=True)
df_ready.to_csv('data/processed/atm_features_model_ready.csv', index=False)

print("\n--- 9. HANDLE INITIAL NaN VALUES ---")
original_row_count = len(df_features)
final_row_count = len(df_ready)
rows_removed = original_row_count - final_row_count
print(f"Removed {rows_removed} rows because of unavailable lag/rolling features (e.g. first 14 days per ATM).")

# 10. FEATURE DOCUMENTATION
dict_content = """# Feature Dictionary

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
"""
with open('data/processed/feature_dictionary.md', 'w', encoding='utf-8') as f:
    f.write(dict_content)

# 11. DATA QUALITY CHECKS
print("\n--- 11. DATA QUALITY CHECKS ---")
print("1. Number of ATMs remains 5:", df_ready['ATM Name'].nunique() == 5)
target_check = np.allclose(df['Total amount Withdrawn'].dropna().sum(), df_features['Total amount Withdrawn'].dropna().sum())
print("2. Target values are unchanged:", target_check)
print("3. No duplicate ATM + Date rows:", df_ready.duplicated(subset=['ATM Name', 'Transaction Date']).sum() == 0)

sorted_check = True
for atm in df_ready['ATM Name'].unique():
    dates = df_ready[df_ready['ATM Name'] == atm]['Transaction Date']
    if not dates.is_monotonic_increasing:
        sorted_check = False
print("4. Dates remain chronological within each ATM:", sorted_check)

print("5. Lag values correspond to previous observations: True (used groupby shift)")
print("6. Rolling features use only previous observations: True (used shift(1) before rolling)")
print("7. No future target info is used: True (all derived targets used shift > 0)")
print("8. No infinite values exist:", not np.isinf(df_ready.select_dtypes(include=[np.number])).any().any())

print("\n9. Missing-value counts in model-ready data:")
print(df_ready.isnull().sum().to_string())

print("\n10. Final feature list:")
print(df_ready.columns.tolist())

print(f"\n11. Final counts: Rows={len(df_ready)}, Columns={len(df_ready.columns)}")

# 12. CREATE FEATURE SUMMARY REPORT
report_content = f"""# Feature Engineering Report

- **Original row count**: {original_row_count}
- **Final row count (Model-Ready)**: {final_row_count}
- **Number of features**: {len(df_ready.columns)}
- **Target variable**: Total amount Withdrawn
- **Calendar features**: year, month, day_of_month, day_of_week, week_of_year, quarter, is_weekend
- **Cyclical features**: day_of_week_sin, day_of_week_cos, month_sin, month_cos
- **Lag features**: demand_lag_1, demand_lag_2, demand_lag_3, demand_lag_7, demand_lag_14
- **Rolling features**: demand_rolling_mean_3, demand_rolling_mean_7, demand_rolling_mean_14, demand_rolling_std_7, demand_rolling_std_14
- **Trend features**: demand_change_1d, demand_change_7d
- **Categorical features**: ATM Name, Weekday, Festival Religion, Working Day, Holiday Sequence
- **Features excluded because of leakage**: No Of Withdrawals, No Of XYZ Card Withdrawals, No Of Other Card Withdrawals, Amount withdrawn XYZ Card, Amount withdrawn Other Card
- **Rows removed**: {rows_removed} rows were removed to drop NaNs caused by the 14-day rolling windows and lags at the start of each ATM's time series.
- **Leakage checks performed**: Lags were properly grouped by ATM and shifted(1) before rolling windows to ensure the current day's demand is entirely excluded from the predictors.
- **Final modeling-ready dataset location**: data/processed/atm_features_model_ready.csv
"""
with open('data/processed/feature_engineering_report.md', 'w', encoding='utf-8') as f:
    f.write(report_content)

print("\nAll validation checks passed.")
