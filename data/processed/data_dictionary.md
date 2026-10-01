# Data Dictionary

| Column Name | Meaning | Datatype | Example | Role | Used for ML |
|---|---|---|---|---|---|
| ATM Name | Identifier of the ATM | Object | Mount Road ATM | Identifier | Yes (Encoded) |
| Transaction Date | Date of the transactions | Date | 2011-01-01 | Time Feature | Yes (Features extracted) |
| No Of Withdrawals | Total count of withdrawals | Int | 50 | Leakage/Stats | No (unless lagged) |
| No Of XYZ Card Withdrawals | Withdrawals by bank card | Int | 20 | Leakage | No |
| No Of Other Card Withdrawals | Withdrawals by other cards | Int | 30 | Leakage | No |
| Total amount Withdrawn | Total cash taken out | Float | 2649.31 | Target | TARGET |
| Amount withdrawn XYZ Card | Amount by bank card | Float | 892.38 | Leakage | No |
| Amount withdrawn Other Card | Amount by other cards | Float | 1756.93 | Leakage | No |
| Weekday | Day of week | Object | Saturday | Contextual | Yes |
| Festival Religion | Associated religion for festival | Object | H | Contextual | Yes |
| Working Day | Is it a working day | Object | H | Contextual | Yes |
| Holiday Sequence | Sequence pattern of holidays | Object | WHH | Contextual | Yes |
