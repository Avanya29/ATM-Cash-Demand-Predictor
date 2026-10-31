"""
backend/app_state.py
Singleton that loads heavy ML artifacts (model + datasets) ONCE at startup,
so every API request can reuse them without reloading from disk.

Features:
- Working-directory independent path resolution (anchored to PROJECT_ROOT).
- Dynamically resolves production model from models/model_metadata.json (Random Forest).
- Supports MODEL_PATH, FEATURES_PATH, and CLEANED_PATH environment variable overrides.
"""
import os
import json
from typing import Optional
import pandas as pd
import joblib

# Anchored to the project root regardless of the current working directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class AppState:
    """Loaded once at FastAPI startup via lifespan."""

    def __init__(self):
        self.model = None
        self.model_name: str = "Unknown"
        self.model_path: str = ""
        self.hist_df: Optional[pd.DataFrame] = None
        self.cleaned_df: Optional[pd.DataFrame] = None
        self.min_date: Optional[pd.Timestamp] = None
        self.max_date: Optional[pd.Timestamp] = None

    def _resolve_model_path(self) -> tuple[str, str]:
        """
        Resolve the production model path and name:
        1. Explicit MODEL_PATH environment variable override.
        2. Read 'selected_model' from models/model_metadata.json.
        3. Fallback to models/random_forest_pipeline.joblib.
        """
        env_model_path = os.getenv("MODEL_PATH")
        if env_model_path:
            full_path = env_model_path if os.path.isabs(env_model_path) else os.path.join(PROJECT_ROOT, env_model_path)
            model_name = os.path.splitext(os.path.basename(full_path))[0].replace("_pipeline", "").replace("_", " ").title()
            return full_path, model_name

        meta_path = os.path.join(PROJECT_ROOT, "models", "model_metadata.json")
        selected_model = "Random Forest"
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                selected_model = meta.get("selected_model", "Random Forest")
            except Exception as e:
                print(f"[warning] Could not read model metadata: {e}. Defaulting to Random Forest.")

        filename = f"{selected_model.lower().replace(' ', '_')}_pipeline.joblib"
        full_path = os.path.join(PROJECT_ROOT, "models", filename)
        return full_path, selected_model

    def load(self):
        model_path, model_name = self._resolve_model_path()
        features_path = os.getenv("FEATURES_PATH") or os.path.join(PROJECT_ROOT, "data", "processed", "atm_features_model_ready.csv")
        cleaned_path = os.getenv("CLEANED_PATH") or os.path.join(PROJECT_ROOT, "data", "processed", "atm_transactions_cleaned.csv")

        if not os.path.isabs(features_path):
            features_path = os.path.join(PROJECT_ROOT, features_path)
        if not os.path.isabs(cleaned_path):
            cleaned_path = os.path.join(PROJECT_ROOT, cleaned_path)

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found: {model_path}")
        if not os.path.exists(features_path):
            raise FileNotFoundError(f"Feature dataset not found: {features_path}")
        if not os.path.exists(cleaned_path):
            raise FileNotFoundError(f"Cleaned dataset not found: {cleaned_path}")

        print(f"[startup] Loading ML model from {model_path} ...")
        self.model = joblib.load(model_path)
        self.model_name = model_name
        self.model_path = model_path

        self.hist_df = pd.read_csv(features_path)
        self.hist_df["Transaction Date"] = pd.to_datetime(self.hist_df["Transaction Date"])

        self.cleaned_df = pd.read_csv(cleaned_path)
        self.cleaned_df["Transaction Date"] = pd.to_datetime(self.cleaned_df["Transaction Date"])

        self.min_date = self.hist_df["Transaction Date"].min()
        self.max_date = self.hist_df["Transaction Date"].max()

        print(f"[startup] Active Model: {self.model_name} ({os.path.basename(self.model_path)})")
        print(f"[startup] History rows: {len(self.hist_df)} (Coverage: {self.min_date.date()} to {self.max_date.date()})")

    @property
    def is_ready(self) -> bool:
        return self.model is not None and self.hist_df is not None


# Module-level singleton — imported by route modules
state = AppState()
