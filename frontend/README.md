# ATM Cash Demand Predictor — Frontend Web Application

**ATM Cash Demand Predictor** is a modern, portfolio-grade financial intelligence application built with React 18, Vite, Recharts, and Lucide Icons, connected to the ATM Cash Demand Predictor FastAPI backend service.

Designed with an editorial, **Mode-inspired light visual identity**, the platform provides fleet-level analytics, single-date calendar-aware forecast inference, multi-terminal demand comparisons, and empirical model benchmarking.

---

## 🛠️ Prerequisites

- **Node.js**: v18.0.0 or higher (Tested on Node v20.x and v24.x)
- **npm**: v9.0.0 or higher
- **Backend Service**: FastAPI running at `http://localhost:8000` (see root README)

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment (Optional)
Copy the example environment configuration:
```bash
cp .env.example .env
```
Default value:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
The optimized bundle will be generated in `frontend/dist/`.

To preview the production build locally:
```bash
npm run preview
```

---

## 📊 Core Analytical Workflows

1. **Intelligence Overview**:
   - Fleet-wide KPI summaries (Total transactions, verified fleet volume, mean withdrawal per observation).
   - Monthly historical demand trend visualization.
   - Comprehensive status cards for all five supported ATMs (KK Nagar, Mount Road, Airport, Christ College, Big Street).
   - Explicit dataset coverage documentation (`2011-01-15` to `2017-09-29`).

2. **Forecast Studio**:
   - Signature single-date calendar-constrained inference workflow.
   - Terminal selection and date picker with lookback validation ($t-1$, $t-7$, $t-14$).
   - Live prediction output with currency formatting and selected model identification.
   - Quick verification presets for eligible historical dates across multiple seasons.

3. **Demand Explorer**:
   - Multi-ATM time-series comparison with toggleable terminal views.
   - Verified day-of-week seasonality curves.
   - Analytical annotations including the empirical **November 2016 – February 2017 Data Sparsity Hiatus**.

4. **Model Observatory**:
   - Full evaluation comparison across Random Forest, Gradient Boosting, Linear Regression, and 7-Day Historical Moving Average.
   - Separate Common Calendar Validation (2016) vs Held-Out Test (2017) metrics (MAE, RMSE, WAPE, $R^2$).
   - Chronological 4-Fold Expanding-Window cross-validation results across 3,357 test observations.
   - Empirical analysis of loss function resilience (Huber loss vs squared error) during reporting regime shifts.

---

## 🎨 Design Philosophy & Tokens
- **Theme**: Crisp, clean light theme inspired by Mode Analytics.
- **Surfaces**: Pure white (`#FFFFFF`) card surfaces on cool light-gray foundations (`#F9FAFB`).
- **Typography**: Inter / system font stacks with dark obsidian readability (`#111827`, `#374151`).
- **Accents**: Soft electric blue (`#2563EB`) primary interactions, emerald green (`#10B981`) for positive indicators, and warm amber (`#F59E0B`) for notices.
- **Integrity**: Every displayed metric is backed directly by the FastAPI backend dataset.
