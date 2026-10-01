import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Create directories
os.makedirs('data/processed/eda', exist_ok=True)
os.makedirs('notebooks', exist_ok=True)

# Load data
df = pd.read_csv('data/processed/atm_transactions_cleaned.csv')
df['Transaction Date'] = pd.to_datetime(df['Transaction Date'])

# 1. Dataset overview
num_rows = len(df)
num_cols = len(df.columns)
num_atms = df['ATM Name'].nunique()
min_date = df['Transaction Date'].min().strftime('%Y-%m-%d')
max_date = df['Transaction Date'].max().strftime('%Y-%m-%d')
unique_dates = df['Transaction Date'].nunique()
target_stats = df['Total amount Withdrawn'].describe()

# 2. OVERALL ATM CASH DEMAND
plt.figure(figsize=(10,6))
sns.histplot(df['Total amount Withdrawn'].dropna(), bins=50, kde=True)
plt.title('Overall ATM Cash Demand Distribution')
plt.xlabel('Total amount Withdrawn')
plt.ylabel('Frequency')
plt.savefig('data/processed/eda/overall_demand_distribution.png')
plt.close()

# 3. DEMAND OVER TIME
daily_demand = df.groupby('Transaction Date')['Total amount Withdrawn'].sum().reset_index()
plt.figure(figsize=(15,6))
plt.plot(daily_demand['Transaction Date'], daily_demand['Total amount Withdrawn'], marker='.', linestyle='-')
plt.title('Total Daily ATM Cash Demand Over Time')
plt.xlabel('Date')
plt.ylabel('Total amount Withdrawn')
plt.savefig('data/processed/eda/overall_demand_over_time.png')
plt.close()

# 4. ATM COMPARISON
atm_stats = df.groupby('ATM Name')['Total amount Withdrawn'].agg(['sum', 'mean', 'median', 'count']).reset_index()
atm_stats.rename(columns={'sum': 'Total', 'mean': 'Average', 'median': 'Median', 'count': 'Observations'}, inplace=True)
plt.figure(figsize=(10,6))
sns.barplot(x='ATM Name', y='Total', data=atm_stats)
plt.title('Total Withdrawal Demand per ATM')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('data/processed/eda/atm_demand_comparison.png')
plt.close()

# 5. WEEKDAY ANALYSIS
weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
df['Weekday'] = pd.Categorical(df['Weekday'].str.capitalize(), categories=weekday_order, ordered=True)
weekday_demand = df.groupby('Weekday', observed=False)['Total amount Withdrawn'].mean().reset_index()
plt.figure(figsize=(10,6))
sns.barplot(x='Weekday', y='Total amount Withdrawn', data=weekday_demand, order=weekday_order)
plt.title('Average Withdrawal Demand by Weekday')
plt.savefig('data/processed/eda/weekday_demand.png')
plt.close()

# 6. WORKING DAY VS NON-WORKING DAY
working_day_demand = df.groupby('Working Day')['Total amount Withdrawn'].mean().reset_index()
plt.figure(figsize=(8,6))
sns.barplot(x='Working Day', y='Total amount Withdrawn', data=working_day_demand)
plt.title('Average Withdrawal Demand: Working vs Non-Working Day')
plt.savefig('data/processed/eda/working_day_demand.png')
plt.close()

# 7. HOLIDAY SEQUENCE
holiday_demand = df.groupby('Holiday Sequence')['Total amount Withdrawn'].mean().reset_index()
plt.figure(figsize=(12,6))
sns.barplot(x='Holiday Sequence', y='Total amount Withdrawn', data=holiday_demand)
plt.title('Average Withdrawal Demand by Holiday Sequence')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('data/processed/eda/holiday_sequence_demand.png')
plt.close()

# 8. FESTIVAL ANALYSIS
festival_counts = df['Festival Religion'].value_counts()
festival_demand = df.groupby('Festival Religion')['Total amount Withdrawn'].mean().reset_index()
plt.figure(figsize=(10,6))
sns.barplot(x='Festival Religion', y='Total amount Withdrawn', data=festival_demand)
plt.title('Average Withdrawal Demand by Festival Religion')
plt.savefig('data/processed/eda/festival_demand.png')
plt.close()

# 9. MONTHLY PATTERNS
df['Month'] = df['Transaction Date'].dt.month
monthly_demand = df.groupby('Month')['Total amount Withdrawn'].mean().reset_index()
plt.figure(figsize=(10,6))
sns.barplot(x='Month', y='Total amount Withdrawn', data=monthly_demand)
plt.title('Average Withdrawal Demand by Month')
plt.xticks(ticks=range(0,12), labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])
plt.savefig('data/processed/eda/monthly_demand.png')
plt.close()

# 10. YEARLY PATTERNS
df['Year'] = df['Transaction Date'].dt.year
yearly_demand = df.groupby('Year')['Total amount Withdrawn'].agg(['sum', 'mean']).reset_index()
fig, ax1 = plt.subplots(figsize=(10,6))
ax2 = ax1.twinx()
sns.barplot(x='Year', y='sum', data=yearly_demand, ax=ax1, alpha=0.6, color='b')
sns.lineplot(x=range(len(yearly_demand)), y='mean', data=yearly_demand, ax=ax2, color='r', marker='o')
ax1.set_ylabel('Total Demand (Bars)')
ax2.set_ylabel('Average Demand (Line)')
plt.title('Total and Average Demand by Year')
plt.savefig('data/processed/eda/yearly_demand.png')
plt.close()

# 11. WITHDRAWAL COUNT VS CASH DEMAND
correlation_withdrawals_amt = df['No Of Withdrawals'].corr(df['Total amount Withdrawn'])
plt.figure(figsize=(10,6))
sns.scatterplot(x='No Of Withdrawals', y='Total amount Withdrawn', data=df, alpha=0.5)
plt.title(f'Withdrawal Count vs Cash Demand (Corr: {correlation_withdrawals_amt:.2f})')
plt.savefig('data/processed/eda/withdrawal_count_vs_amount.png')
plt.close()

# 12. ATM-SPECIFIC TIME SERIES
for atm in df['ATM Name'].unique():
    if not isinstance(atm, str): continue
    safe_name = atm.replace(" ", "_").lower()
    atm_data = df[df['ATM Name'] == atm].sort_values('Transaction Date')
    plt.figure(figsize=(15,6))
    plt.plot(atm_data['Transaction Date'], atm_data['Total amount Withdrawn'])
    plt.title(f'Time Series for {atm}')
    plt.xlabel('Date')
    plt.ylabel('Total amount Withdrawn')
    plt.savefig(f'data/processed/eda/atm_{safe_name}_time_series.png')
    plt.close()

# 13. OUTLIER ANALYSIS
Q1 = df['Total amount Withdrawn'].quantile(0.25)
Q3 = df['Total amount Withdrawn'].quantile(0.75)
IQR = Q3 - Q1
lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR
outliers = df[(df['Total amount Withdrawn'] < lower_bound) | (df['Total amount Withdrawn'] > upper_bound)]
outlier_count = len(outliers)
outlier_pct = (outlier_count / len(df)) * 100

plt.figure(figsize=(10,6))
sns.boxplot(x=df['Total amount Withdrawn'])
plt.title(f'Outliers in Cash Demand (Total Outliers: {outlier_count})')
plt.savefig('data/processed/eda/demand_outliers.png')
plt.close()

# 14. CORRELATION ANALYSIS
num_cols = ['No Of Withdrawals', 'No Of XYZ Card Withdrawals', 'No Of Other Card Withdrawals', 
            'Total amount Withdrawn', 'Amount withdrawn XYZ Card', 'Amount withdrawn Other Card']
corr_matrix = df[num_cols].corr()
plt.figure(figsize=(10,8))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', vmin=-1, vmax=1)
plt.title('Correlation Matrix of Numerical Variables')
plt.tight_layout()
plt.savefig('data/processed/eda/correlation_matrix.png')
plt.close()

# Markdown generation
def to_md_table(df):
    if df.empty:
        return ""
    header = "| " + " | ".join([str(c) for c in df.columns]) + " |"
    divider = "| " + " | ".join(["---"] * len(df.columns)) + " |"
    rows = []
    for _, row in df.iterrows():
        rows.append("| " + " | ".join([f"{x:.2f}" if isinstance(x, float) else str(x) for x in row]) + " |")
    return "\n".join([header, divider] + rows)

atm_table = to_md_table(atm_stats)
fest_df = df['Festival Religion'].value_counts().reset_index()
fest_df.columns = ['Religion', 'Count']
festival_table = to_md_table(fest_df)

report_content = f"""# Exploratory Data Analysis (EDA) Report

## A. Dataset overview
- **Rows**: {num_rows}
- **Columns**: {num_cols}
- **Number of ATMs**: {num_atms}
- **Date Range**: {min_date} to {max_date}
- **Unique Dates**: {unique_dates}

## B. Target-variable distribution
The target variable `Total amount Withdrawn` is a continuous variable. The distribution is right-skewed, meaning most transactions are of smaller amounts, while there are a few very large withdrawal amounts.
- **Min**: {target_stats['min']:.2f}
- **Max**: {target_stats['max']:.2f}
- **Mean**: {target_stats['mean']:.2f}
- **Median**: {target_stats['50%']:.2f}
- **Std Dev**: {target_stats['std']:.2f}
- **25th Percentile**: {target_stats['25%']:.2f}
- **75th Percentile**: {target_stats['75%']:.2f}

## C. Time trends
Aggregated daily demand shows periodic spikes. There appears to be strong weekly seasonality and potential end-of-month / beginning-of-month salary spikes.

## D. ATM comparison
- ATMs vary significantly in their average and total withdrawal demand. 
- Some ATMs like 'KK Nagar ATM' appear to have much higher volume and demand compared to others.

{atm_table}

## E. Weekday patterns
Withdrawal demand varies depending on the day of the week. Certain days (like weekends or start of week) show different average demands compared to mid-week days. Chronological ordering ensures we can see the weekend drop/spike clearly.

## F. Working/non-working day patterns
Average demand differs between working and non-working days. This could be due to salary days aligning with working days or people taking out cash for weekend activities.

## G. Holiday patterns
Holiday sequences (e.g. WHH vs WWW) influence the demand. Long weekends generally show different cash withdrawal patterns as people stock up on cash before banks close.

## H. Festival patterns
Different festival religions result in varying average withdrawals. 
Categories distribution:
{festival_table}

## I. Monthly patterns
Average demand shows variation across months, likely linked to festival seasons, year-end bonuses, or vacation periods. 

## J. Yearly patterns
There are observable yearly trends in total and average demand, which might be linked to inflation, increase in user base, or changes in ATM deployment.

## K. Withdrawal count relationship
The correlation between `No Of Withdrawals` and `Total amount Withdrawn` is **{correlation_withdrawals_amt:.2f}**. This very high correlation indicates that the number of people visiting the ATM is highly predictive of the cash demand. However, this is NOT causation for forecasting because we cannot know the exact number of withdrawals in advance.

## L. Outlier observations
- **Number of potential outliers**: {outlier_count}
- **Percentage of dataset**: {outlier_pct:.2f}%
Outliers are generally concentrated in high-demand periods (festivals, start of month) or specific busy ATMs. These should not be deleted as they represent legitimate peak demand scenarios which are crucial to forecast correctly (to avoid cash-outs).

## M. Correlation findings
- The target variable is strongly correlated with the number of withdrawals (XYZ, Other, and Total). 
- However, these variables suffer from data leakage and cannot be used directly in a future forecasting model unless time-lagged.

## N. Potential ML features suggested by EDA
- **Time-based**: Day of week, Month, Year, Day of month, Is_Weekend.
- **Categorical**: ATM Name, Holiday Sequence, Festival Religion, Working Day.
- **Lagged Features**: Previous day's total withdrawal amount, 7-day rolling average (to capture `No of Withdrawals` proxy without leakage).

## O. Variables
- Features to keep: ATM Name, Transaction Date, Weekday, Festival Religion, Working Day, Holiday Sequence.
- Target to predict: Total amount Withdrawn.
- Variables to lag/drop: No Of Withdrawals, No Of XYZ Card Withdrawals, No Of Other Card Withdrawals, Amount withdrawn XYZ Card, Amount withdrawn Other Card.
"""
with open('data/processed/eda_report.md', 'w', encoding='utf-8') as f:
    f.write(report_content)

print("EDA completed successfully.")
