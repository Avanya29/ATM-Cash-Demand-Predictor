"""
tests/test_model_loading.py
Tests for ML model loading, metadata alignment, and path resolution.
"""
import os
import json
import pytest
from backend.app_state import AppState, PROJECT_ROOT


def test_app_state_model_resolution_matches_metadata():
    """Verify that AppState resolves the production model designated in model_metadata.json."""
    meta_path = os.path.join(PROJECT_ROOT, "models", "model_metadata.json")
    assert os.path.exists(meta_path), f"Missing model metadata: {meta_path}"

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    expected_model = meta.get("selected_model", "Random Forest")
    assert expected_model == "Random Forest", f"Expected selected_model to be 'Random Forest', got {expected_model}"

    app_state = AppState()
    resolved_path, resolved_name = app_state._resolve_model_path()

    assert resolved_name == "Random Forest"
    assert os.path.basename(resolved_path) == "random_forest_pipeline.joblib"
    assert os.path.exists(resolved_path), f"Resolved model file does not exist: {resolved_path}"


def test_app_state_load():
    """Verify AppState.load() initializes model, datasets, and date bounds correctly."""
    app_state = AppState()
    app_state.load()

    assert app_state.is_ready is True
    assert app_state.model is not None
    assert app_state.model_name == "Random Forest"
    assert app_state.hist_df is not None
    assert len(app_state.hist_df) > 0
    assert app_state.min_date is not None
    assert app_state.max_date is not None
    assert app_state.min_date <= app_state.max_date


def test_app_state_env_override(monkeypatch):
    """Verify that setting MODEL_PATH explicitly overrides the default selection."""
    override_file = os.path.join(PROJECT_ROOT, "models", "gradient_boosting_pipeline.joblib")
    assert os.path.exists(override_file)

    monkeypatch.setenv("MODEL_PATH", override_file)
    app_state = AppState()
    resolved_path, resolved_name = app_state._resolve_model_path()

    assert os.path.abspath(resolved_path) == os.path.abspath(override_file)
    assert "Gradient Boosting" in resolved_name
