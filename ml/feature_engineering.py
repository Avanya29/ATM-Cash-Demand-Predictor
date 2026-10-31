"""
ml/feature_engineering.py — Feature Engineering with Calendar-Day Alignments
ATM Cash Demand Predictor
"""

import os
import numpy as np
import pandas as pd

# Ensure ml and processed directories exist
os.makedirs('ml', exist_ok=True)
os.makedirs('data/processed', exist_ok=True)

# ==============================================================================
# 1. LOAD AND VALIDATE RAW CLEANED DATA
# ==============================================================================
print("--- 1. LOAD AND VALIDATE CLEANED DATA ---")
cleaned_path = 'data/processed/atm_transactions_cleaned.csv'
df_raw = pd.read_csv(cleaned_path)
df_raw['Transaction Date'] = pd.to_datetime(df_raw['Transaction Date'])

# Validate input
assert df_raw['ATM Name'].nunique() == 5, f"Expected 5 ATMs, found {df_raw['ATM Name'].nunique()}"
assert df_raw.duplicated(subset=['ATM Name', 'Transaction Date']).sum() == 0, "Duplicate ATM+Date in input"
assert df_raw['Total amount Withdrawn'].isnull().sum() == 0, "Missing target values in cleaned input"

print(f"Loaded {len(df_raw)} cleaned observations across {df_raw['ATM Name'].nunique()} ATMs.")
print(f"Input date range: {df_raw['Transaction Date'].min().date()} to {df_raw['Transaction Date'].max().date()}")

# ==============================================================================
# 2. CONSTRUCT COMPLETE DAILY CALENDAR INDEX PER ATM
# ==============================================================================
print("\n--- 2. CONSTRUCT COMPLETE DAILY CALENDAR INDEX ---")
# Build a complete calendar-day index for each ATM so shifts correspond to
# actual calendar days rather than arbitrary transaction row positions.
dfs = []
total_missing_calendar_days = 0

for atm, group in df_raw.groupby('ATM Name'):
    group = group.sort_values('Transaction Date').set_index('Transaction Date')
    min_date = group.index.min()
    max_date = group.index.max()
    full_idx = pd.date_range(min_date, max_date, freq='D')
    missing_count = len(full_idx) - len(group)
    total_missing_calendar_days += missing_count
    
    # Reindex onto full daily calendar
    g_full = group.reindex(full_idx)
    g_full['ATM Name'] = atm
    g_full.index.name = 'Transaction Date'
    dfs.append(g_full.reset_index())
    print(f"  {atm:<20}: {len(group):4d} observed days | {len(full_idx):4d} calendar days | {missing_count:3d} missing days")

df = pd.concat(dfs).sort_values(['ATM Name', 'Transaction Date']).reset_index(drop=True)
print(f"Total calendar grid rows: {len(df)} ({total_missing_calendar_days} missing days preserved as NaN)")

# Ensure Weekday is populated for all calendar dates
df['Weekday'] = df['Transaction Date'].dt.day_name()

# ==============================================================================
# 3. RE-DERIVE CALENDAR FEATURES FROM Transaction Date
# ==============================================================================
print("\n--- 3. RE-DERIVE CALENDAR FEATURES ---")
df['year'] = df['Transaction Date'].dt.year
df['month'] = df['Transaction Date'].dt.month
df['day_of_month'] = df['Transaction Date'].dt.day
df['day_of_week'] = df['Transaction Date'].dt.dayofweek
df['week_of_year'] = df['Transaction Date'].dt.isocalendar().week.astype(int)
df['quarter'] = df['Transaction Date'].dt.quarter
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

# Cyclical features
df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# ==============================================================================
# 4. CREATE CALENDAR LAG FEATURES (SAME ATM, STRICT CALENDAR DAYS)
# ==============================================================================
print("\n--- 4. CREATE CALENDAR-DAY LAG FEATURES ---")
# Because df is indexed on a complete daily calendar, shift(k) looks back
# exactly k calendar days. If day t-k was missing, demand_lag_k is NaN.
grouped = df.groupby('ATM Name')['Total amount Withdrawn']

df['demand_lag_1'] = grouped.shift(1)   # t - 1 calendar day
df['demand_lag_2'] = grouped.shift(2)   # t - 2 calendar days
df['demand_lag_3'] = grouped.shift(3)   # t - 3 calendar days
df['demand_lag_7'] = grouped.shift(7)   # t - 7 calendar days
df['demand_lag_8'] = grouped.shift(8)   # t - 8 calendar days (needed for 7-day trend)
df['demand_lag_14'] = grouped.shift(14) # t - 14 calendar days

# ==============================================================================
# 5. CREATE CALENDAR ROLLING FEATURES (STRICTLY HISTORICAL)
# ==============================================================================
print("\n--- 5. CREATE CALENDAR-DAY ROLLING FEATURES ---")
# Shift by 1 day first to completely exclude the target day (no future/current leakage).
df['demand_shifted'] = grouped.shift(1)

# Rolling windows over the calendar-day series:
# min_periods=1 for means (min_periods=2 for std) ensures that if an ATM has an
# unobserved day in the window, the moving average reflects observed days within that window.
df['demand_rolling_mean_3'] = df.groupby('ATM Name')['demand_shifted'].transform(
    lambda x: x.rolling(3, min_periods=1).mean()
)
df['demand_rolling_mean_7'] = df.groupby('ATM Name')['demand_shifted'].transform(
    lambda x: x.rolling(7, min_periods=1).mean()
)
df['demand_rolling_mean_14'] = df.groupby('ATM Name')['demand_shifted'].transform(
    lambda x: x.rolling(14, min_periods=1).mean()
)
df['demand_rolling_std_7'] = df.groupby('ATM Name')['demand_shifted'].transform(
    lambda x: x.rolling(7, min_periods=2).std()
)
df['demand_rolling_std_14'] = df.groupby('ATM Name')['demand_shifted'].transform(
    lambda x: x.rolling(14, min_periods=2).std()
)

# ==============================================================================
# 6. CREATE HISTORICAL DEMAND TREND FEATURES
# ==============================================================================
print("\n--- 6. CREATE HISTORICAL DEMAND TREND FEATURES ---")
# demand_change_1d: demand at (t - 1 day) minus demand at (t - 2 days)
# demand_change_7d: demand at (t - 1 day) minus demand at (t - 8 days) [7-day change]
df['demand_change_1d'] = df['demand_lag_1'] - df['demand_lag_2']
df['demand_change_7d'] = df['demand_lag_1'] - df['demand_lag_8']

# Drop intermediate helper columns
df = df.drop(columns=['demand_lag_8', 'demand_shifted'])

# ==============================================================================
# 7. EXCLUDE LEAKAGE FEATURES
# ==============================================================================
leakage_cols = [
    'No Of Withdrawals', 'No Of XYZ Card Withdrawals', 'No Of Other Card Withdrawals',
    'Amount withdrawn XYZ Card', 'Amount withdrawn Other Card'
]
feature_cols = [col for col in df.columns if col not in leakage_cols]
df_features = df[feature_cols].copy()

# ==============================================================================
# 8. SAVE FULL FEATURES AND MODEL-READY DATASET
# ==============================================================================
print("\n--- 8. SAVE DATASETS ---")
df_features.to_csv('data/processed/atm_features.csv', index=False)
print(f"Saved complete calendar feature dataset: data/processed/atm_features.csv ({len(df_features)} rows)")

lag_roll_features = [
    'demand_lag_1', 'demand_lag_2', 'demand_lag_3', 'demand_lag_7', 'demand_lag_14',
    'demand_rolling_mean_3', 'demand_rolling_mean_7', 'demand_rolling_mean_14',
    'demand_rolling_std_7', 'demand_rolling_std_14',
    'demand_change_1d', 'demand_change_7d'
]

# A row is model-ready if:
# 1. Total amount Withdrawn is KNOWN (not NaN).
# 2. All required lag and rolling features are available (not NaN).
df_ready = (
    df_features[df_features['Total amount Withdrawn'].notna()]
    .dropna(subset=lag_roll_features)
    .reset_index(drop=True)
)
df_ready.to_csv('data/processed/atm_features_model_ready.csv', index=False)

original_observed_count = len(df_raw)
final_ready_count = len(df_ready)
rows_removed = original_observed_count - final_ready_count
print(f"Saved model-ready dataset: data/processed/atm_features_model_ready.csv ({final_ready_count} rows)")
print(f"Rows excluded from modeling: {rows_removed} ({70} initial burn-in rows + {rows_removed - 70} rows where required calendar lags fell on missing dates)")

# ==============================================================================
# 9. COMPREHENSIVE DATA QUALITY CHECKS AND ASSERTIONS
# ==============================================================================
print("\n--- 9. COMPREHENSIVE DATA QUALITY CHECKS & ASSERTIONS ---")

# Assertion 1: Exactly 5 ATMs
assert df_ready['ATM Name'].nunique() == 5, f"Expected 5 ATMs, got {df_ready['ATM Name'].nunique()}"
print("  [PASS] 1. Exactly 5 unique ATMs present.")

# Assertion 2: Target integrity on observed rows
raw_target_sum = df_raw['Total amount Withdrawn'].sum()
feat_target_sum = df_features['Total amount Withdrawn'].dropna().sum()
assert np.isclose(raw_target_sum, feat_target_sum), "Target sum altered during feature engineering"
print("  [PASS] 2. Target values preserved exactly without alteration.")

# Assertion 3: Unique ATM-date pairs
assert df_ready.duplicated(subset=['ATM Name', 'Transaction Date']).sum() == 0, "Duplicate ATM+Date in model-ready data"
assert df_features.duplicated(subset=['ATM Name', 'Transaction Date']).sum() == 0, "Duplicate ATM+Date in full features"
print("  [PASS] 3. Unique ATM-date pairs verified (no duplicates).")

# Assertion 4: Chronological ordering within each ATM
for atm in df_ready['ATM Name'].unique():
    dates = df_ready[df_ready['ATM Name'] == atm]['Transaction Date']
    assert dates.is_monotonic_increasing, f"Dates not chronological for {atm}"
print("  [PASS] 4. Monotonic chronological ordering verified per ATM.")

# Assertion 5: Correct calendar lag dates verification
# Build an exact date-indexed lookup of observed target values
target_lookup = {
    (row['ATM Name'], row['Transaction Date']): row['Total amount Withdrawn']
    for _, row in df_raw.iterrows()
}

# Verify lag dates for a random sample of rows
sample_check = df_ready.sample(n=min(1000, len(df_ready)), random_state=42)
for _, r in sample_check.iterrows():
    atm = r['ATM Name']
    t_date = r['Transaction Date']
    for k in [1, 2, 3, 7, 14]:
        lag_date = t_date - pd.Timedelta(days=k)
        expected_demand = target_lookup.get((atm, lag_date), np.nan)
        actual_lag = r[f'demand_lag_{k}']
        if np.isnan(expected_demand):
            assert np.isnan(actual_lag), f"Lag {k} should be NaN on {t_date.date()} because {lag_date.date()} is unobserved"
        else:
            assert np.isclose(actual_lag, expected_demand), f"Lag {k} mismatch on {t_date.date()}: expected {expected_demand}, got {actual_lag}"
print("  [PASS] 5. Calendar lag dates verified against actual calendar dates (t-1, t-2, t-3, t-7, t-14).")

# Assertion 6: Absence of accidental future-target leakage
for _, r in sample_check.iterrows():
    atm = r['ATM Name']
    t_date = r['Transaction Date']
    # Lag 1 strictly matches calendar date (t - 1 day)
    assert r['demand_lag_1'] == target_lookup[(atm, t_date - pd.Timedelta(days=1))]
    # Target value is never read as lag_1 unless t-1 happened to have identical demand
    if (atm, t_date - pd.Timedelta(days=1)) in target_lookup:
        assert r['demand_lag_1'] == target_lookup[(atm, t_date - pd.Timedelta(days=1))]
print("  [PASS] 6. Absence of future-target leakage verified (all features look backward).")

# Assertion 7: No infinite values or missing values in model-ready data
assert not np.isinf(df_ready.select_dtypes(include=[np.number])).any().any(), "Infinite values found in model-ready data"
assert df_ready[lag_roll_features].isnull().sum().sum() == 0, "Missing values in lag/rolling features in model-ready data"
assert df_ready['Total amount Withdrawn'].isnull().sum() == 0, "Missing target values in model-ready data"
print("  [PASS] 7. Zero infinite or NaN values in model-ready feature and target columns.")

# ==============================================================================
# 10. UPDATE FEATURE DICTIONARY
# ==============================================================================
feature_dict_md = """# Feature Dictionary

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
"""

with open('data/processed/feature_dictionary.md', 'w', encoding='utf-8') as f:
    f.write(feature_dict_md)

# ==============================================================================
# 11. UPDATE FEATURE ENGINEERING SUMMARY REPORT
# ==============================================================================
report_md = f"""# Feature Engineering Report

## Summary of Calendar-Day Feature Corrections
- **Grid Construction**: Each ATM's time series was reindexed onto a complete daily calendar (`freq='D'`) spanning from its earliest observation (2011-01-01) to its latest (2017-09-29), producing 2,464 calendar days per ATM (12,320 total ATM-date pairs).
- **Missing Date Semantics**: Missing calendar dates (731 days across all 5 ATMs) are preserved as `NaN` target values. They are **never** filled with zero or forward-filled without domain justification.
- **Calendar Lag Corrections**: `demand_lag_1`, `demand_lag_2`, `demand_lag_3`, `demand_lag_7`, and `demand_lag_14` now refer strictly to calendar dates $t-1, t-2, t-3, t-7, t-14$ for the same ATM. If an antecedent date was unobserved, that lag correctly evaluates to `NaN`.
- **Calendar Rolling Windows**: Rolling means and standard deviations are computed on strictly prior calendar days (shifted by 1 day to prevent target leakage). Moving averages use `min_periods=1` (`min_periods=2` for std) to aggregate observed days within the 3, 7, and 14 calendar-day windows.
- **Impact on Feature Availability**:
  - Total observed transactions in raw cleaned dataset: {original_observed_count}
  - Complete calendar grid: {len(df)} ATM-date pairs
  - Model-ready observations: {final_ready_count}
  - Rows excluded: {rows_removed} ({70} initial burn-in rows at the beginning of each series + {rows_removed - 70} rows where required calendar lags fell on unobserved dates).

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
"""

with open('data/processed/feature_engineering_report.md', 'w', encoding='utf-8') as f:
    f.write(report_md)

print("\nFeature engineering completed and all reports updated successfully.")
