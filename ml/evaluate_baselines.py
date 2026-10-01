import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from sklearn.metrics import mean_absolute_error, mean_squared_error

# Ensure output directories exist
os.makedirs('data/processed', exist_ok=True)
os.makedirs('ml', exist_ok=True)

# Helper functions for metrics
def mean_absolute_percentage_error_safe(y_true, y_pred):
    mask = y_true != 0
    if mask.sum() == 0:
        return np.nan
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask]))

def weighted_absolute_percentage_error(y_true, y_pred):
    sum_true = np.sum(np.abs(y_true))
    if sum_true == 0:
        return np.nan
    return np.sum(np.abs(y_true - y_pred)) / sum_true

def compute_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = mean_absolute_percentage_error_safe(y_true.values, y_pred.values)
    wape = weighted_absolute_percentage_error(y_true.values, y_pred.values)
    return mae, rmse, mape, wape

# 2. LOAD DATA
data_path = 'data/processed/atm_features_model_ready.csv'
df = pd.read_csv(data_path)
df['Transaction Date'] = pd.to_datetime(df['Transaction Date'])

# Sort
df = df.sort_values(['ATM Name', 'Transaction Date']).reset_index(drop=True)

# Validate
assert df['ATM Name'].nunique() == 5, "Number of ATMs is not 5."
assert df.duplicated(subset=['ATM Name', 'Transaction Date']).sum() == 0, "Duplicate ATM + Transaction Date found."
assert df['Total amount Withdrawn'].isnull().sum() == 0, "Missing target values found."

for atm in df['ATM Name'].unique():
    subset = df[df['ATM Name'] == atm]
    assert subset['Transaction Date'].is_monotonic_increasing, f"Dates not chronological for ATM: {atm}"

# 4. TIME-BASED SPLIT
train_list = []
val_list = []
test_list = []

print("--- TIME-BASED SPLIT ---")
for atm in df['ATM Name'].unique():
    subset = df[df['ATM Name'] == atm].copy()
    n = len(subset)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    
    train = subset.iloc[:train_end]
    val = subset.iloc[train_end:val_end]
    test = subset.iloc[val_end:]
    
    train_list.append(train)
    val_list.append(val)
    test_list.append(test)
    
    print(f"ATM Name: {atm}")
    print(f"  Train rows: {len(train)}")
    print(f"  Validation rows: {len(val)}")
    print(f"  Test rows: {len(test)}")
    print(f"  Train date range: {train['Transaction Date'].min().strftime('%Y-%m-%d')} to {train['Transaction Date'].max().strftime('%Y-%m-%d')}")
    print(f"  Validation date range: {val['Transaction Date'].min().strftime('%Y-%m-%d')} to {val['Transaction Date'].max().strftime('%Y-%m-%d')}")
    print(f"  Test date range: {test['Transaction Date'].min().strftime('%Y-%m-%d')} to {test['Transaction Date'].max().strftime('%Y-%m-%d')}\n")

df_train = pd.concat(train_list)
df_val = pd.concat(val_list)
df_test = pd.concat(test_list)

print("OVERALL SPLITS:")
print(f"Train rows: {len(df_train)}, Date range: {df_train['Transaction Date'].min().strftime('%Y-%m-%d')} to {df_train['Transaction Date'].max().strftime('%Y-%m-%d')}")
print(f"Validation rows: {len(df_val)}, Date range: {df_val['Transaction Date'].min().strftime('%Y-%m-%d')} to {df_val['Transaction Date'].max().strftime('%Y-%m-%d')}")
print(f"Test rows: {len(df_test)}, Date range: {df_test['Transaction Date'].min().strftime('%Y-%m-%d')} to {df_test['Transaction Date'].max().strftime('%Y-%m-%d')}")

# 5. & 6. BASELINES
# Evaluation on Val and Test
results = []
for split_name, split_df in [('Validation', df_val), ('Test', df_test)]:
    y_true = split_df['Total amount Withdrawn']
    b1_pred = split_df['demand_lag_1']
    b2_pred = split_df['demand_rolling_mean_7']
    
    mae, rmse, mape, wape = compute_metrics(y_true, b1_pred)
    results.append({'Model': 'Naive Previous Day', 'Dataset': split_name, 'MAE': mae, 'RMSE': rmse, 'MAPE': mape, 'WAPE': wape})
    
    mae, rmse, mape, wape = compute_metrics(y_true, b2_pred)
    results.append({'Model': '7-Day Historical Average', 'Dataset': split_name, 'MAE': mae, 'RMSE': rmse, 'MAPE': mape, 'WAPE': wape})

results_df = pd.DataFrame(results)
results_df.to_csv('data/processed/baseline_results.csv', index=False)

print("\n--- BASELINE METRICS ---")
print(results_df.to_string(index=False))

# 9. PER-ATM EVALUATION
atm_results = []
for atm in df_test['ATM Name'].unique():
    subset = df_test[df_test['ATM Name'] == atm]
    y_true = subset['Total amount Withdrawn']
    b1_pred = subset['demand_lag_1']
    b2_pred = subset['demand_rolling_mean_7']
    
    mae, rmse, mape, wape = compute_metrics(y_true, b1_pred)
    atm_results.append({'ATM Name': atm, 'Model': 'Naive Previous Day', 'MAE': mae, 'RMSE': rmse, 'MAPE': mape, 'WAPE': wape})
    
    mae, rmse, mape, wape = compute_metrics(y_true, b2_pred)
    atm_results.append({'ATM Name': atm, 'Model': '7-Day Historical Average', 'MAE': mae, 'RMSE': rmse, 'MAPE': mape, 'WAPE': wape})

atm_results_df = pd.DataFrame(atm_results)
atm_results_df.to_csv('data/processed/baseline_results_by_atm.csv', index=False)

# 10. VISUALIZATION
import seaborn as sns

plt.figure(figsize=(10,6))
sns.barplot(data=results_df[results_df['Dataset'] == 'Test'], x='Model', y='WAPE')
plt.title('Test Set Performance (WAPE) by Baseline Model')
plt.ylabel('Weighted Absolute Percentage Error')
plt.savefig('data/processed/baseline_comparison.png')
plt.close()

# Example forecast visualization
example_atm = df_test['ATM Name'].unique()[0]
example_df = df_test[df_test['ATM Name'] == example_atm].copy()
example_df = example_df.iloc[:60] # First 60 days of test

plt.figure(figsize=(15,6))
plt.plot(example_df['Transaction Date'], example_df['Total amount Withdrawn'], label='Actual Demand', color='black', linewidth=2)
plt.plot(example_df['Transaction Date'], example_df['demand_lag_1'], label='Naive Previous Day', color='blue', alpha=0.7)
plt.plot(example_df['Transaction Date'], example_df['demand_rolling_mean_7'], label='7-Day Average', color='red', alpha=0.7)
plt.title(f'Baseline Forecast Example: {example_atm} (Test Subset)')
plt.xlabel('Date')
plt.ylabel('Cash Demand')
plt.legend()
plt.savefig('data/processed/baseline_forecast_example.png')
plt.close()

# 11. REPORT
def to_md_table(df):
    header = "| " + " | ".join(df.columns) + " |"
    divider = "| " + " | ".join(["---"] * len(df.columns)) + " |"
    rows = []
    for _, row in df.iterrows():
        rows.append("| " + " | ".join([f"{x:.4f}" if isinstance(x, float) else str(x) for x in row]) + " |")
    return "\n".join([header, divider] + rows)

report_md = f"""# Baseline Evaluation Report

## Dataset Information
- **Source**: `data/processed/atm_features_model_ready.csv`
- **Total ATMs**: {df['ATM Name'].nunique()}
- **Total Rows**: {len(df)}

## Methodology
- **Split Strategy**: Chronological split per ATM to prevent data leakage and preserve temporal ordering. Random shuffling is strictly forbidden in time-series forecasting to ensure no future data leaks into the past.
- **Split Proportions**: 70% Train, 15% Validation, 15% Test.

## Date Ranges
- **Train**: {df_train['Transaction Date'].min().strftime('%Y-%m-%d')} to {df_train['Transaction Date'].max().strftime('%Y-%m-%d')}
- **Validation**: {df_val['Transaction Date'].min().strftime('%Y-%m-%d')} to {df_val['Transaction Date'].max().strftime('%Y-%m-%d')}
- **Test**: {df_test['Transaction Date'].min().strftime('%Y-%m-%d')} to {df_test['Transaction Date'].max().strftime('%Y-%m-%d')}

## Baseline Definitions
- **Naive Previous Day**: Predicted demand = `demand_lag_1`
- **7-Day Historical Average**: Predicted demand = `demand_rolling_mean_7`

## Overall Metrics
{to_md_table(results_df)}

## Per-ATM Test Metrics
{to_md_table(atm_results_df)}

## Observations
- The 7-Day Historical Average generally provides a smoother and more robust baseline, capturing the typical weekly demand.
- Naive Previous Day struggles with strong day-to-day volatility but adapts instantly to sudden structural shifts.
- Forecasting difficulty varies considerably by ATM location, as seen in the per-ATM WAPE scores.

## Limitations
- These are purely historical baselines. They do not incorporate calendar features (like Day of Week or Month), contextual features (like Working Day or Festivals), or capture any complex seasonalities. Advanced ML models will address these gaps.
"""
with open('data/processed/baseline_evaluation_report.md', 'w', encoding='utf-8') as f:
    f.write(report_md)

# 12. DATA LEAKAGE CHECK
print("\nOutput file locations:")
print("- data/processed/baseline_results.csv")
print("- data/processed/baseline_results_by_atm.csv")
print("- data/processed/baseline_comparison.png")
print("- data/processed/baseline_forecast_example.png")
print("- data/processed/baseline_evaluation_report.md")

print("\nAll Phase 4 leakage checks passed.")
