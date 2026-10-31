"""
backend/main.py
ATM Cash Demand Predictor API — FastAPI application entry point.

Run from project root:
    python -m uvicorn backend.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app_state import state
from backend.schemas import HealthResponse, RootResponse, ModelInfoResponse
from backend.routes import prediction, atm, analytics, custom_datasets
from ml.predict import VALID_ATMS


# ---------------------------------------------------------------------------
# Lifespan: load ML artifacts once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and datasets at startup; release on shutdown."""
    print("[startup] Loading ML model and datasets ...")
    state.load()
    print("[startup] Ready.")
    yield
    print("[shutdown] Cleaning up.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ATM Cash Demand Predictor API",
    version="1.0.0",
    description=(
        "AI-powered REST API for ATM cash-demand forecasting. "
        "Predicts daily total cash withdrawals for supported ATMs using "
        "machine learning models trained on historical transaction data."
    ),
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Core routes
# ---------------------------------------------------------------------------
@app.get("/", response_model=RootResponse, tags=["General"])
def root():
    """API root — confirms the service is running."""
    return RootResponse(
        message="ATM Cash Demand Predictor API is running",
        active_model=state.model_name if state.is_ready else None,
    )


@app.get("/health", response_model=HealthResponse, tags=["General"])
def health():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_loaded=state.is_ready,
        active_model=state.model_name if state.is_ready else None,
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["General"])
def model_info():
    """Return metadata about the active production model and dataset horizon."""
    return ModelInfoResponse(
        model_name=state.model_name,
        model_path=state.model_path,
        dataset_coverage={
            "start_date": str(state.min_date.date()) if state.min_date is not None else "Unknown",
            "end_date": str(state.max_date.date()) if state.max_date is not None else "Unknown",
        },
        supported_atms=VALID_ATMS,
    )


# ---------------------------------------------------------------------------
# Feature routers (Only active, implemented routes)
# ---------------------------------------------------------------------------
app.include_router(prediction.router)
app.include_router(atm.router)
app.include_router(analytics.router)
app.include_router(custom_datasets.router)

