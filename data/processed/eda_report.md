# Exploratory Data Analysis (EDA) Report

## A. Dataset overview
- **Rows**: 11589
- **Columns**: ['No Of Withdrawals', 'No Of XYZ Card Withdrawals', 'No Of Other Card Withdrawals', 'Total amount Withdrawn', 'Amount withdrawn XYZ Card', 'Amount withdrawn Other Card']
- **Number of ATMs**: 5
- **Date Range**: 2011-01-01 to 2017-09-29
- **Unique Dates**: 2427

## B. Target-variable distribution
The target variable `Total amount Withdrawn` is a continuous variable. The distribution is right-skewed, meaning most transactions are of smaller amounts, while there are a few very large withdrawal amounts.
- **Min**: 1.49
- **Max**: 44556.49
- **Mean**: 9003.04
- **Median**: 8085.88
- **Std Dev**: 5594.42
- **25th Percentile**: 5216.79
- **75th Percentile**: 11653.18

## C. Time trends
Aggregated daily demand shows periodic spikes. There appears to be strong weekly seasonality and potential end-of-month / beginning-of-month salary spikes.

## D. ATM comparison
- ATMs vary significantly in their average and total withdrawal demand. 
- Some ATMs like 'KK Nagar ATM' appear to have much higher volume and demand compared to others.

| ATM Name | Total | Average | Median | Observations |
| --- | --- | --- | --- | --- |
| Airport ATM | 17527217.01 | 7779.50 | 7983.03 | 2253 |
| Big Street ATM | 12065638.78 | 5125.59 | 5217.99 | 2354 |
| Christ College ATM | 22023356.17 | 9351.74 | 8932.36 | 2355 |
| KK Nagar ATM | 32314294.73 | 13628.97 | 13357.96 | 2371 |
| Mount Road ATM | 20405768.27 | 9045.11 | 9180.17 | 2256 |

## E. Weekday patterns
Withdrawal demand varies depending on the day of the week. Certain days (like weekends or start of week) show different average demands compared to mid-week days. Chronological ordering ensures we can see the weekend drop/spike clearly.

## F. Working/non-working day patterns
Average demand differs between working and non-working days. This could be due to salary days aligning with working days or people taking out cash for weekend activities.

## G. Holiday patterns
Holiday sequences (e.g. WHH vs WWW) influence the demand. Long weekends generally show different cash withdrawal patterns as people stock up on cash before banks close.

## H. Festival patterns
Different festival religions result in varying average withdrawals. 
Categories distribution:
| Religion | Count |
| --- | --- |
| NH | 10727 |
| H | 367 |
| N | 198 |
| M | 178 |
| C | 119 |

## I. Monthly patterns
Average demand shows variation across months, likely linked to festival seasons, year-end bonuses, or vacation periods. 

## J. Yearly patterns
There are observable yearly trends in total and average demand, which might be linked to inflation, increase in user base, or changes in ATM deployment.

## K. Withdrawal count relationship
The correlation between `No Of Withdrawals` and `Total amount Withdrawn` is **0.92**. This very high correlation indicates that the number of people visiting the ATM is highly predictive of the cash demand. However, this is NOT causation for forecasting because we cannot know the exact number of withdrawals in advance.

## L. Outlier observations
- **Number of potential outliers**: 434
- **Percentage of dataset**: 3.74%
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
