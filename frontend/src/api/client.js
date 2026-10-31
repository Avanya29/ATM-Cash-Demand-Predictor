/**
 * frontend/src/api/client.js
 * Centralized API client module for ATM Cash Demand Predictor.
 * Communicates with FastAPI backend. Supports VITE_API_BASE_URL.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.detail || `API Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.detail = data?.detail;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkErr = new Error(
        `Unable to connect to ATM Cash Demand Predictor API at ${API_BASE}. Ensure the backend service is running on port 8000.`
      );
      networkErr.status = 0;
      throw networkErr;
    }
    throw error;
  }
}

export const api = {
  getHealth: () => request('/health'),
  getModelInfo: () => request('/model-info'),
  getAtms: () => request('/atms'),
  getSummary: () => request('/analytics/summary'),
  getHistorical: (atmName = null) => {
    const query = atmName ? `?atm_name=${encodeURIComponent(atmName)}` : '';
    return request(`/analytics/historical${query}`);
  },
  getBenchmarks: () => request('/analytics/benchmarks'),
  predict: (atmName, forecastDate) =>
    request('/predict', {
      method: 'POST',
      body: JSON.stringify({
        atm_name: atmName,
        forecast_date: forecastDate,
      }),
    }),
  // Custom multi-bank dataset API
  getCustomTemplateUrl: () => `${API_BASE}/custom-datasets/template`,
  uploadCustomDataset: (formData) =>
    request('/custom-datasets/upload', {
      method: 'POST',
      body: formData,
    }),
  getCustomDatasetSummary: (datasetId) =>
    request(`/custom-datasets/${datasetId}/summary`),
  getCustomDatasetQuality: (datasetId) =>
    request(`/custom-datasets/${datasetId}/quality`),
  trainCustomDataset: (datasetId) =>
    request(`/custom-datasets/${datasetId}/train`, {
      method: 'POST',
    }),
  predictCustomDataset: (datasetId, atmId, forecastDate) =>
    request(`/custom-datasets/${datasetId}/predict`, {
      method: 'POST',
      body: JSON.stringify({
        atm_id: atmId,
        forecast_date: forecastDate,
      }),
    }),
  getCustomDatasetHistorical: (datasetId, atmId) => {
    const query = atmId ? `?atm_id=${encodeURIComponent(atmId)}` : '';
    return request(`/custom-datasets/${datasetId}/historical${query}`);
  },
};

export default api;
