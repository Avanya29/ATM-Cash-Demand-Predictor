# ATM Cash Demand Predictor

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A portfolio-grade financial intelligence platform and production-ready machine learning system for forecasting ATM cash replenishment demand across metropolitan banking networks.

---

## 🌟 Executive Summary

**ATM Cash Demand Predictor** bridges empirical time-series machine learning with an institutional financial analytics console. Designed with an editorial, **Mode-inspired light visual identity**, the platform delivers fleet-wide withdrawal monitoring, single-date calendar-aware forecast inference, multi-terminal seasonality exploration, and empirical model observability.

The system is trained and evaluated on **10,296 model-ready daily observations** spanning January 2011 through September 2017 across five key metropolitan terminals, utilizing a strict **Common-Calendar** temporal split to prevent lookahead data leakage.

---

## 🎨 Modern Light Financial Interface

Inspired by institutional data products, the interface provides clarity, crisp contrast, and tactile feedback:
- **Visual Palette**: Alabaster and cool-gray surfaces (`#FFFFFF`, `#F9FAFB`), subtle borders (`#E5E7EB`), deep obsidian typography (`#111827`, `#374151`), electric blue primary accents (`#2563EB`), and emerald/amber operational indicators.
- **Micro-Interactions**: Smooth state transitions, hover lift effects, active tab indicators, and clean KPI stat cards.
- **Zero Placeholders**: Every visual card, historical graph, and metric badge reflects verified backend dataset calculations.

---

## 🖥️ Four Core Analytical Workflows

The frontend application (`frontend/`) is structured into four focused workspaces:

### 1. Intelligence Overview
- **Fleet-Wide Vital Metrics**: Displays verified fleet totals—**$96.76M** total cash disbursed, **$9,397.69** average daily withdrawal per ATM observation, **10,296** model-ready records, and active tracking across **5 metropolitan ATMs**.
- **Historical Trajectory**: Interactive 12-month aggregated withdrawal volume visualization.
- **Terminal Status Grid**: Health, historical transaction depth, and location profiles for all 5 fleet ATMs (KK Nagar, Mount Road, Airport, Christ College, Big Street).

### 2. Forecast Studio
- **Single-Date Inference**: Select any supported ATM and evaluate predicted cash replenishment requirements for any valid date.
- **Lag Validation Guard**: Validates that empirical lookback lags ($t-1$, $t-7$, $t-14$) and rolling indicators are present before invoking the inference pipeline.
- **Verification Presets**: Instant single-click historical verification buttons across distinct ATMs and seasons.
- **Prediction Diagnostics**: Displays estimated demand, selected production model identification, and transaction context.

### 3. Demand Explorer
- **Multi-Terminal Comparison**: Multi-line comparative time series with terminal toggle filters.
- **Day-of-Week Seasonality**: Empirical weekly distribution showing weekend peaks and weekday baseline demands.
- **Empirical Sparsity Annotation**: Transparently documents the **November 2016 – February 2017 reporting hiatus**, clarifying the historical record reduction without speculative causal claims.

### 4. Model Observatory
- **Benchmark Evaluation**: Side-by-side performance comparison across **Random Forest**, **Gradient Boosting**, **Linear Regression**, and the **7-Day Historical Moving Average**.
- **Dual Temporal Splits**: Displays both 2016 Common Calendar Validation metrics and 2017 Held-Out Test metrics.
- **Rolling-Origin Cross-Validation**: 4-fold expanding window cross-validation across 3,357 test observations.
- **Loss Function Resilience**: Analysis of Huber loss versus squared error under regime shifts.

---

## 📊 Verified Model Benchmark Results

Models were evaluated on a Common-Calendar split ensuring all 5 ATMs share identical calendar date boundaries:
- **Training Horizon**: 2011-01-15 to 2015-12-31 (8,596 observations)
- **Validation Horizon**: 2016-01-01 to 2016-12-01 (914 observations)
- **Held-Out Test Horizon**: 2017-01-11 to 2017-09-29 (786 observations)

| Model | Val MAE ($) | Val RMSE ($) | Val WAPE | Test MAE ($) | Test RMSE ($) | Test WAPE | Test $R^2$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Random Forest** (Selected) | **2,565.97** | 3,517.89 | **34.56%** | 2,766.88 | 3,763.03 | 36.96% | 0.4849 |
| **Gradient Boosting** | 2,566.72 | **3,496.29** | 34.57% | **2,683.03** | **3,681.03** | **35.84%** | **0.5071** |
| **Linear Regression** | 2,773.74 | 3,695.04 | 37.36% | 2,921.07 | 3,876.92 | 39.02% | 0.4533 |
| **7-Day Moving Avg (Baseline)** | 3,099.12 | 4,211.50 | 41.74% | 3,214.45 | 4,320.10 | 42.94% | 0.3812 |

> **Note on Model Selection**: Random Forest was chosen as the primary production model due to its optimal balance of lowest Validation MAE/WAPE and robust error stability across terminal distributions.

---

## 🏗️ System Architecture

```
ATM CASH DEMAND PREDICTOR
├── backend/                  # FastAPI REST Service
│   ├── main.py               # App entrypoint, CORS, lifespan startup
│   ├── app_state.py          # Singleton loading ML model and CSV datasets
│   ├── schemas.py            # Pydantic request/response data contracts
│   └── routes/
│       ├── prediction.py     # POST /predict
│       ├── atm.py            # GET /atms, GET /atms/{name}
│       └── analytics.py      # GET /analytics/summary, /monthly, /weekday, /seasonality
├── frontend/                 # React 18 + Vite Web Application
│   ├── src/
│   │   ├── views/            # OverviewView, ForecastStudioView, DemandExplorerView, ModelObservatoryView
│   │   ├── components/       # MetricCard, Header, Navbar, StatusIndicator
│   │   ├── services/api.js   # Centralized Axios API client
│   │   └── index.css         # Mode-inspired light design system
│   └── package.json
├── ml/                       # Machine Learning Pipeline
│   ├── feature_engineering.py # Calendar-aware feature pipeline & lag generators
│   ├── train_models.py       # Trains LR, RF, GBDT with Common Calendar evaluation
│   ├── evaluate_baselines.py # Moving average and seasonal baseline benchmarks
│   └── predict.py            # Single-sample inference pipeline helper
├── models/                   # ML Artifacts (Metadata tracked; heavy binaries excluded)
│   └── model_metadata.json   # Full feature list, split dates, and benchmark metrics
├── data/
│   └── processed/            # Evaluation reports, feature dictionary, analytical plots
├── tests/                    # Backend automated test suite (pytest)
│   └── test_api.py           # 17 comprehensive unit & integration tests
├── .env.example              # Template environment configuration
└── requirements.txt          # Python dependencies
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: v18.0.0 or higher (with npm v9+)

---

### Step 1: Backend Setup

1. **Create and activate a virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify model and processed data artifacts**:
   The backend relies on the following files in the project root:
   - `models/random_forest_pipeline.joblib` (Production model)
   - `data/processed/atm_features_model_ready.csv` (Model-ready feature table)
   - `data/processed/atm_transactions_cleaned.csv` (Cleaned transaction table)

   *To train fresh models from the processed feature dataset at any time*:
   ```bash
   python ml/train_models.py
   ```

4. **Run the backend test suite**:
   ```bash
   pytest -v
   ```

5. **Start the FastAPI server**:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

---

### Step 2: Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment (optional)**:
   ```bash
   cp .env.example .env
   ```
   *(Defaults to `VITE_API_BASE_URL=http://localhost:8000`)*

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Access the web interface at `http://localhost:5173`.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📦 Model Artifact Distribution Strategy

Because machine learning pipeline files can be large:
- `models/random_forest_pipeline.joblib` is **97.46 MB**.
- Standard Git repositories have a 100 MB hard reject threshold and issue warnings above 50 MB.

### Recommended Approach: GitHub Release Asset
1. Once your repository is created on GitHub, draft a new release (e.g., `v1.0.0`).
2. Attach `random_forest_pipeline.joblib` as a binary asset to the release.
3. This keeps repository clone operations lightweight (<15 MB) while providing free, unthrottled access to pre-trained weights.
4. Alternatively, any user cloning the repository can generate the exact same model artifact locally in seconds by executing:
   ```bash
   python ml/train_models.py
   ```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service root confirmation and active model name |
| `GET` | `/health` | Health check reporting model load state |
| `GET` | `/model-info` | Model metadata, feature list, and date boundaries |
| `GET` | `/atms` | List of all 5 supported ATM identifiers |
| `GET` | `/atms/{atm_name}` | Historical transaction statistics for a specific terminal |
| `GET` | `/analytics/summary` | Fleet-wide aggregates (total demand, mean observation, count) |
| `GET` | `/analytics/monthly` | Monthly aggregated withdrawal trends |
| `GET` | `/analytics/weekday` | Day-of-week demand distributions |
| `GET` | `/analytics/seasonality` | Detailed terminal-level seasonality breakdown |
| `POST` | `/predict` | Single-date prediction inference given ATM and date |

---

## 🛡️ License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
