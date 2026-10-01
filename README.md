# ATM Cash Demand Predictor

## Objective
The ATM Cash Demand Predictor aims to optimize cash management for ATMs by accurately forecasting future cash demands. It helps reduce idle cash, minimize cash-outs, and lower operational costs for banks and ATM operators.

## Architecture Overview
The project is divided into the following components:
*   **Data & ML Pipeline (`ml/`, `data/`, `notebooks/`)**: Responsible for data preprocessing, training machine learning models to predict cash demand, and assessing risk associated with cash levels.
*   **Backend API (`backend/`)**: A FastAPI-based RESTful API that handles incoming requests, integrates with the ML models to serve predictions, and manages user authentication and data persistence.
*   **Frontend UI (`frontend/`)**: The user interface for interacting with the predictor, viewing analytics, and managing ATM locations.

## Planned Technology Stack
*   **Machine Learning**: Python, pandas, numpy, scikit-learn
*   **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL (via psycopg2)
*   **Authentication**: JWT (python-jose, passlib)
*   **Frontend**: React (planned)
