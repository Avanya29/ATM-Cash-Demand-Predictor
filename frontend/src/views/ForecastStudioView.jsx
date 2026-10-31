import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Target, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Cpu,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  Clock,
  Layers,
  Zap,
  Calculator,
  Sliders,
  DollarSign,
  UploadCloud,
  FileText,
  Download,
  Database,
  BarChart2,
  TrendingUp,
  Check,
  AlertCircle,
  Award,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { api } from '../api/client';

// Lazy-load 3D demand visual for performance
const Prediction3DColumn = lazy(() => import('../components/Prediction3DColumn').then(m => ({ default: m.Prediction3DColumn })));

export const ForecastStudioView = ({ initialAtm }) => {
  // Mode selection: Mode 1 (Historical ML Forecast) or Mode 2 (General Demand Estimator)
  const [forecastMode, setForecastMode] = useState('historical-ml');

  // Mode 1: Historical ML state
  const [atms, setAtms] = useState([
    'Airport ATM',
    'Big Street ATM',
    'Christ College ATM',
    'KK Nagar ATM',
    'Mount Road ATM'
  ]);
  const [selectedAtm, setSelectedAtm] = useState(initialAtm || 'Mount Road ATM');
  const [forecastDate, setForecastDate] = useState('2017-06-15');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  // Mode B: Custom Bank Dataset state
  const [customFile, setCustomFile] = useState(null);
  const [customDatasetId, setCustomDatasetId] = useState(null);
  const [customFileInfo, setCustomFileInfo] = useState(null);
  const [customQuality, setCustomQuality] = useState(null);
  const [customMapping, setCustomMapping] = useState({
    date_col: 'date',
    atm_id_col: 'atm_id',
    amount_col: 'withdrawal_amount',
    atm_name_col: 'atm_name',
    bank_name_col: 'bank_name',
  });
  const [customDetectedCols, setCustomDetectedCols] = useState([]);
  const [customUploadLoading, setCustomUploadLoading] = useState(false);
  const [customUploadError, setCustomUploadError] = useState(null);

  const [customTrainingLoading, setCustomTrainingLoading] = useState(false);
  const [customTrainingResult, setCustomTrainingResult] = useState(null);
  const [customTrainingError, setCustomTrainingError] = useState(null);

  const [customSelectedAtm, setCustomSelectedAtm] = useState('');
  const [customForecastDate, setCustomForecastDate] = useState('');
  const [customPredictLoading, setCustomPredictLoading] = useState(false);
  const [customPredictResult, setCustomPredictResult] = useState(null);
  const [customPredictError, setCustomPredictError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFile(file);
    setCustomUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const firstLine = text.split('\n')[0];
        const cols = firstLine.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        setCustomDetectedCols(cols);
      } catch (err) {
        console.error('Error reading CSV header:', err);
      }
    };
    reader.readAsText(file.slice(0, 4096));
  };

  const handleUploadSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!customFile) {
      setCustomUploadError('Please select a CSV file to upload.');
      return;
    }
    setCustomUploadLoading(true);
    setCustomUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', customFile);
      formData.append('date_col', customMapping.date_col);
      formData.append('atm_id_col', customMapping.atm_id_col);
      formData.append('amount_col', customMapping.amount_col);
      if (customMapping.atm_name_col) formData.append('atm_name_col', customMapping.atm_name_col);
      if (customMapping.bank_name_col) formData.append('bank_name_col', customMapping.bank_name_col);

      const res = await api.uploadCustomDataset(formData);
      setCustomDatasetId(res.dataset_id);
      setCustomFileInfo({
        filename: res.filename,
        file_size_kb: res.file_size_kb,
        detected_columns: res.detected_columns,
      });
      setCustomQuality(res.quality_report);
      setCustomDetectedCols(res.detected_columns || []);

      if (res.quality_report?.unique_atms?.length > 0) {
        setCustomSelectedAtm(res.quality_report.unique_atms[0]);
      }
      if (res.quality_report?.date_coverage?.end_date) {
        setCustomForecastDate(res.quality_report.date_coverage.end_date);
      }
      setCustomTrainingResult(null);
      setCustomPredictResult(null);
    } catch (err) {
      setCustomUploadError(err.detail || err.message || 'Dataset upload and validation failed.');
    } finally {
      setCustomUploadLoading(false);
    }
  };

  const handleLoadSampleDataset = async () => {
    setCustomUploadLoading(true);
    setCustomUploadError(null);
    try {
      const formData = new FormData();
      const res = await api.uploadCustomDataset(formData);
      setCustomDatasetId(res.dataset_id);
      setCustomFileInfo({
        filename: res.filename,
        file_size_kb: res.file_size_kb,
        detected_columns: res.detected_columns,
      });
      setCustomQuality(res.quality_report);
      setCustomDetectedCols(res.detected_columns || []);

      if (res.quality_report?.unique_atms?.length > 0) {
        setCustomSelectedAtm(res.quality_report.unique_atms[0]);
      }
      if (res.quality_report?.date_coverage?.end_date) {
        setCustomForecastDate(res.quality_report.date_coverage.end_date);
      }
      setCustomTrainingResult(null);
      setCustomPredictResult(null);
    } catch (err) {
      setCustomUploadError(err.detail || err.message || 'Failed to load sample dataset.');
    } finally {
      setCustomUploadLoading(false);
    }
  };

  const handleCustomTrain = async () => {
    if (!customDatasetId) return;
    setCustomTrainingLoading(true);
    setCustomTrainingError(null);
    try {
      const res = await api.trainCustomDataset(customDatasetId);
      setCustomTrainingResult(res);
    } catch (err) {
      setCustomTrainingError(err.detail || err.message || 'Model training failed.');
    } finally {
      setCustomTrainingLoading(false);
    }
  };

  const handleCustomPredict = async (e) => {
    if (e) e.preventDefault();
    if (!customDatasetId || !customSelectedAtm || !customForecastDate) return;
    setCustomPredictLoading(true);
    setCustomPredictError(null);
    setCustomPredictResult(null);
    try {
      const res = await api.predictCustomDataset(customDatasetId, customSelectedAtm, customForecastDate);
      setCustomPredictResult(res);
    } catch (err) {
      setCustomPredictError({
        status: err.status,
        message: err.detail || err.message || 'Custom dataset prediction failed.',
      });
    } finally {
      setCustomPredictLoading(false);
    }
  };

  const handleResetCustomDataset = () => {
    setCustomFile(null);
    setCustomDatasetId(null);
    setCustomFileInfo(null);
    setCustomQuality(null);
    setCustomTrainingResult(null);
    setCustomPredictResult(null);
    setCustomUploadError(null);
    setCustomTrainingError(null);
    setCustomPredictError(null);
  };

  // Mode 2: General Demand Estimator state (Scenario-Based)
  const [locationType, setLocationType] = useState('Shopping Mall');
  const [dailyTransactions, setDailyTransactions] = useState('120');
  const [avgWithdrawal, setAvgWithdrawal] = useState('75');
  const [dayOfWeek, setDayOfWeek] = useState('Friday');
  const [holidayEvent, setHolidayEvent] = useState('Regular Working Day');
  const [surgePercentage, setSurgePercentage] = useState('0');
  const [scenarioSubmitted, setScenarioSubmitted] = useState(true);

  const locationTypes = [
    'Airport',
    'Shopping Mall',
    'College',
    'Market',
    'Residential Area',
    'Office Area',
    'Other'
  ];

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const holidayEvents = [
    'Regular Working Day',
    'Weekend / Normal Rest Day',
    'Public / Bank Holiday',
    'Major Festival / Event'
  ];

  const scenarioPresets = [
    { label: 'Airport Transit Hub', location: 'Airport', tx: '250', avg: '120', dow: 'Friday', holiday: 'Regular Working Day', surge: '0' },
    { label: 'Weekend Shopping Mall', location: 'Shopping Mall', tx: '180', avg: '85', dow: 'Saturday', holiday: 'Weekend / Normal Rest Day', surge: '15' },
    { label: 'College Campus ATM', location: 'College', tx: '95', avg: '40', dow: 'Wednesday', holiday: 'Regular Working Day', surge: '0' },
    { label: 'Festival Market Day', location: 'Market', tx: '320', avg: '110', dow: 'Sunday', holiday: 'Major Festival / Event', surge: '25' },
    { label: 'Corporate Office Area', location: 'Office Area', tx: '140', avg: '90', dow: 'Monday', holiday: 'Regular Working Day', surge: '0' },
  ];

  const applyScenarioPreset = (p) => {
    setLocationType(p.location);
    setDailyTransactions(p.tx);
    setAvgWithdrawal(p.avg);
    setDayOfWeek(p.dow);
    setHolidayEvent(p.holiday);
    setSurgePercentage(p.surge);
    setScenarioSubmitted(true);
  };

  // Quick verified scenario presets for Mode 1
  const presets = [
    { label: 'Mount Road (2017-06-15)', atm: 'Mount Road ATM', date: '2017-06-15', type: 'valid' },
    { label: 'Big Street (2017-07-31)', atm: 'Big Street ATM', date: '2017-07-31', type: 'valid' },
    { label: 'KK Nagar (2017-04-18)', atm: 'KK Nagar ATM', date: '2017-04-18', type: 'valid' },
    { label: 'Missing Lag Test (2016-12-15)', atm: 'Mount Road ATM', date: '2016-12-15', type: 'outage' },
    { label: 'Future Horizon Test (2026-10-27)', atm: 'Mount Road ATM', date: '2026-10-27', type: 'future' },
  ];

  useEffect(() => {
    async function init() {
      try {
        const [atmRes, infoRes] = await Promise.all([
          api.getAtms().catch(() => null),
          api.getModelInfo().catch(() => null)
        ]);
        if (atmRes?.atms) setAtms(atmRes.atms);
        if (infoRes) setModelInfo(infoRes);
      } catch (e) {
        console.error(e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (initialAtm) {
      setSelectedAtm(initialAtm);
    }
  }, [initialAtm]);

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.predict(selectedAtm, forecastDate);
      setResult(data);
    } catch (err) {
      setError({
        status: err.status,
        message: err.detail || err.message || 'Forecast computation failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setSelectedAtm(preset.atm);
    setForecastDate(preset.date);
    setError(null);
    setResult(null);
  };

  // Animated counter for prediction output (Mode 1)
  const animatedPredictedAmount = useAnimatedCounter(result?.predicted_demand ? Math.round(result.predicted_demand) : 0);

  // Mode 2 validation & arithmetic calculation (Deterministic Scenario Model)
  const parsedTx = parseFloat(dailyTransactions);
  const parsedAvg = parseFloat(avgWithdrawal);
  const parsedSurge = parseFloat(surgePercentage || '0');

  const txError = dailyTransactions.trim() === ''
    ? 'Expected daily transaction count is required.'
    : isNaN(parsedTx)
    ? 'Transaction count must be a valid number.'
    : parsedTx < 0
    ? 'Transaction count cannot be negative.'
    : null;

  const avgError = avgWithdrawal.trim() === ''
    ? 'Average withdrawal amount is required.'
    : isNaN(parsedAvg)
    ? 'Average withdrawal amount must be a valid number.'
    : parsedAvg < 0
    ? 'Average withdrawal amount cannot be negative.'
    : null;

  const surgeError = isNaN(parsedSurge)
    ? 'Increase percentage must be a valid number.'
    : parsedSurge < 0
    ? 'Increase percentage cannot be negative.'
    : parsedSurge > 500
    ? 'Increase percentage cannot exceed 500%.'
    : null;

  const isScenarioValid = !txError && !avgError && !surgeError;

  const baseScenarioDemand = isScenarioValid ? parsedTx * parsedAvg : 0;
  const surgeMultiplier = isScenarioValid ? parsedSurge / 100 : 0;
  const surgeDollarAmount = baseScenarioDemand * surgeMultiplier;
  const totalScenarioDemand = baseScenarioDemand + surgeDollarAmount;

  // Animated counter for Mode 2 output
  const animatedScenarioAmount = useAnimatedCounter(
    isScenarioValid && scenarioSubmitted ? Math.round(totalScenarioDemand) : 0
  );

  // Animated counter for Mode B (Custom Bank Dataset)
  const animatedCustomAmount = useAnimatedCounter(
    customPredictResult?.predicted_demand ? Math.round(customPredictResult.predicted_demand) : 0
  );

  return (
    <div className="view-container">
      {/* Studio Header */}
      <div className="studio-header">
        <div>
          <h1 className="editorial-heading">Forecast Studio</h1>
          <p className="section-subheading">
            {forecastMode === 'historical-ml'
              ? 'Interactive single-date cash demand estimation powered by production-calibrated machine learning.'
              : forecastMode === 'custom-bank'
              ? 'Multi-bank cash demand forecasting: upload proprietary ATM transaction datasets, audit data quality, train isolated ML models, and generate demand forecasts.'
              : 'Scenario-based cash demand estimator for hypothetical, new, or uncatalogued ATM locations.'}
          </p>
        </div>

        <div className="studio-badges">
          {forecastMode === 'historical-ml' ? (
            <>
              <span className="pill pill-forest font-mono">
                <Cpu size={12} /> Model: {modelInfo?.model_name || 'Random Forest'}
              </span>
              <span className="pill pill-mint font-mono">
                <Calendar size={12} /> Horizon: 2011–2017
              </span>
            </>
          ) : forecastMode === 'custom-bank' ? (
            <>
              <span className="pill pill-forest font-mono">
                <UploadCloud size={12} /> Mode: Multi-Bank Dataset
              </span>
              <span className="pill pill-mint font-mono">
                <Database size={12} /> {customQuality ? `${customQuality.unique_atms_count} ATMs • ${customQuality.clean_records} Rows` : 'No Dataset Active'}
              </span>
              {customTrainingResult && (
                <span className="pill pill-lime font-mono">
                  <Award size={12} /> {customTrainingResult.selected_model}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="pill pill-forest font-mono">
                <Calculator size={12} /> Mode: Scenario Estimator
              </span>
              <span className="pill pill-mint font-mono">
                <Building2 size={12} /> Scope: Any ATM Location
              </span>
            </>
          )}
        </div>
      </div>

      {/* Forecast Studio Mode Selector */}
      <div className="mode-tab-bar" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          id="tab-btn-historical-ml"
          className={`mode-tab-item ${forecastMode === 'historical-ml' ? 'active' : ''}`}
          onClick={() => setForecastMode('historical-ml')}
        >
          <Cpu size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          <span>Mode A: Historical ML Forecast (5 Spar Nord ATMs)</span>
        </button>
        <button
          type="button"
          id="tab-btn-custom-bank"
          className={`mode-tab-item ${forecastMode === 'custom-bank' ? 'active' : ''}`}
          onClick={() => setForecastMode('custom-bank')}
        >
          <UploadCloud size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          <span>Mode B: Upload Your Bank Dataset</span>
        </button>
        <button
          type="button"
          id="tab-btn-general-estimator"
          className={`mode-tab-item ${forecastMode === 'general-estimator' ? 'active' : ''}`}
          onClick={() => setForecastMode('general-estimator')}
        >
          <Calculator size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          <span>Mode C: General Demand Estimator</span>
        </button>
      </div>

      {/* MODE 1: HISTORICAL ML FORECAST */}
      {forecastMode === 'historical-ml' && (
        <div className="studio-layout">
        {/* Left Column: Settings Panel */}
        <div className="fintech-card controls-card">
          <div className="card-heading">
            <Target size={18} className="text-forest" />
            <span className="heading-text">Prediction Settings</span>
          </div>

          <form onSubmit={handlePredict} className="controls-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="atm-select">
                Select ATM Terminal
              </label>
              <select
                id="atm-select"
                className="input-control font-mono"
                value={selectedAtm}
                onChange={(e) => setSelectedAtm(e.target.value)}
              >
                {atms.map((atm) => (
                  <option key={atm} value={atm}>{atm}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date-input">
                Select Forecast Date (YYYY-MM-DD)
              </label>
              <input
                id="date-input"
                type="date"
                className="input-control font-mono"
                min="2011-01-15"
                max="2017-09-29"
                value={forecastDate}
                onChange={(e) => setForecastDate(e.target.value)}
                required
              />
              <span className="input-hint">
                Supported dataset horizon: 2011-01-15 to 2017-09-29
              </span>
            </div>

            <div className="presets-box">
              <span className="presets-label">QUICK VERIFICATION PRESETS:</span>
              <div className="presets-list">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`preset-btn ${p.type}`}
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-lime w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  Running Model Pipeline...
                </>
              ) : (
                <>
                  Estimate Cash Demand
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="methodology-guardrail card-mint">
            <ShieldAlert size={18} className="text-forest flex-shrink-0" />
            <p className="guardrail-text">
              <strong>Zero-Fabrication Guarantee:</strong> The forecasting engine strictly validates prior calendar lookback lags ($t-1$, $t-2$, $t-7$, $t-14$). Dates with cash outages or dates beyond the historical window are rejected to prevent fabricated numbers.
            </p>
          </div>
        </div>

        {/* Right Column: Prediction Result & 3D Interactive Panel */}
        <div className="fintech-card results-card">
          <div className="card-heading">
            <Sparkles size={18} className="text-forest" />
            <span className="heading-text">Estimated Demand Output</span>
          </div>

          <div className="results-display-area">
            {/* Loading State */}
            {loading && (
              <div className="loading-state">
                <RefreshCw size={36} className="spin text-forest mb-3" />
                <h4 className="loading-title">Calculating Cash Demand</h4>
                <p className="loading-desc">
                  Extracting strictly prior calendar-day lags ($t-1$ to $t-14$), day-of-week seasonality, and feeding into {modelInfo?.model_name || 'Random Forest'}...
                </p>
              </div>
            )}

            {/* Empty Guidance State */}
            {!loading && !result && !error && (
              <div className="empty-state">
                <div className="empty-icon-circle">
                  <Target size={30} className="text-forest" />
                </div>
                <h4 className="empty-title">Ready for Forecast Inference</h4>
                <p className="empty-desc">
                  Select a target ATM location and historical date, then click <strong>Estimate Cash Demand</strong>. You can also pick any of the quick verification presets on the left.
                </p>
                <div className="empty-tips">
                  <div className="tip-item">
                    <CheckCircle2 size={14} className="text-forest" />
                    <span>Uses previous withdrawal history without data leakage</span>
                  </div>
                  <div className="tip-item">
                    <CheckCircle2 size={14} className="text-forest" />
                    <span>Includes day-of-week seasonality and holiday indicators</span>
                  </div>
                </div>
              </div>
            )}

            {/* Success State with 3D Column */}
            {!loading && result && (
              <div className="prediction-success-card">
                <div className="result-status-banner">
                  <CheckCircle2 size={16} />
                  <span>Forecast Generated Successfully</span>
                </div>

                <div className="result-kpi-block card-forest">
                  <div className="kpi-left">
                    <span className="result-kpi-label">ESTIMATED WITHDRAWAL DEMAND</span>
                    <div className="result-amount-row">
                      <span className="result-currency-symbol text-lime">$</span>
                      <span className="result-amount tabular-nums text-lime">
                        {animatedPredictedAmount.toLocaleString()}
                      </span>
                      <span className="result-currency-code">USD</span>
                    </div>
                    <div className="kpi-sub-note">
                      Exact inference: ${result.predicted_demand.toFixed(2)}
                    </div>
                  </div>

                  {/* 3D Visual Column reflecting demand volume (Lazy Loaded) */}
                  <div className="kpi-3d-visual">
                    <Suspense fallback={
                      <div className="prediction-3d-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={22} className="spin text-lime" />
                      </div>
                    }>
                      <Prediction3DColumn predictedDemand={result.predicted_demand} />
                    </Suspense>
                  </div>
                </div>

                <div className="result-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">ATM Terminal</span>
                    <span className="detail-value">{result.atm_name}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Forecast Date</span>
                    <span className="detail-value font-mono">{result.forecast_date}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Model Pipeline</span>
                    <span className="detail-value text-forest font-semibold">
                      {result.model_used || 'Random Forest'}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Feature Lookback</span>
                    <span className="detail-value">Strictly &lt; {result.forecast_date}</span>
                  </div>
                </div>

                <div className="replenishment-advice-box card-mint">
                  <div className="advice-title">Replenishment Decision Support</div>
                  <p className="advice-desc">
                    <strong>Statistical illustration only:</strong> Based on the predicted demand of ${Math.round(result.predicted_demand).toLocaleString()} USD, an illustrative staging buffer can be estimated using historical ATM withdrawal variance. Because the dataset does not contain physical vault balances or live dispatch logs, this calculation provides statistical guidance rather than verified operational dispatch instructions.
                  </p>
                </div>
              </div>
            )}

            {/* Error / Boundary Notice State */}
            {!loading && error && (
              <div className="prediction-error-card">
                <div className="error-status-banner">
                  <AlertTriangle size={17} />
                  <span>Verification Boundary Notice (HTTP {error.status || '422'})</span>
                </div>

                <div className="error-body">
                  <h4 className="error-heading">Prediction Request Ineligible</h4>
                  <p className="error-message">{error.message}</p>
                </div>

                <div className="error-explanation-box">
                  <span className="explanation-title">Why did this happen?</span>
                  <p className="explanation-text">
                    {error.message.includes('outside the supported') || error.message.includes('beyond the supported')
                      ? 'The requested date is beyond the Spar Nord Bank 2011–2017 dataset horizon. Genuine future dates require real-time transaction telemetry from live ATM systems.'
                      : error.message.includes('missing historical calendar lag')
                      ? 'Historical transaction observations are unavailable for the required lag dates during the preceding 14 calendar days. Because the feature engineering pipeline requires actual historical observations to compute rolling and lag demand features, the model intentionally refuses to zero-fill missing values.'
                      : 'Please verify input format or choose an eligible date within the 2011–2017 historical window.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* MODE B: UPLOAD YOUR BANK DATASET */}
      {forecastMode === 'custom-bank' && (
        <div className="custom-bank-container">
          {/* Top Step Progress Bar */}
          <div className="custom-stepper-bar">
            <div className={`step-badge ${customDatasetId ? 'completed' : 'active'}`}>
              <span className="step-badge-num">1</span>
              <span>Upload Dataset</span>
            </div>
            <ChevronRight size={14} className="stepper-arrow" />
            <div className={`step-badge ${customQuality ? (customTrainingResult ? 'completed' : 'active') : 'pending'}`}>
              <span className="step-badge-num">2 & 3</span>
              <span>Validation & Analysis</span>
            </div>
            <ChevronRight size={14} className="stepper-arrow" />
            <div className={`step-badge ${customTrainingResult ? (customPredictResult ? 'completed' : 'active') : 'pending'}`}>
              <span className="step-badge-num">4</span>
              <span>Model Training</span>
            </div>
            <ChevronRight size={14} className="stepper-arrow" />
            <div className={`step-badge ${customPredictResult ? 'completed' : 'pending'}`}>
              <span className="step-badge-num">5 & 6</span>
              <span>Forecast & Results</span>
            </div>
          </div>

          {/* If no dataset uploaded yet: Step 1 Upload Workflow */}
          {!customDatasetId ? (
            <div className="fintech-card" style={{ padding: '32px' }}>
              <div className="card-heading" style={{ marginBottom: '24px' }}>
                <UploadCloud size={20} className="text-forest" />
                <div>
                  <span className="heading-text" style={{ fontSize: '18px' }}>Step 1: Upload Your Bank ATM Dataset</span>
                  <p className="section-subheading" style={{ margin: 0 }}>
                    Support your institution's historical ATM transaction records. Custom models are trained in an isolated environment without Spar Nord contamination.
                  </p>
                </div>
              </div>

              {/* Sample Template & Quick Demo Actions Banner */}
              <div className="sample-template-banner">
                <div className="template-info">
                  <FileSpreadsheet size={24} className="text-forest" />
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--forest-green)' }}>
                      Need a reference format or want to test immediately?
                    </h4>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#4A5568' }}>
                      Download the official multi-bank CSV template, or load our pre-configured Nordic Bank sample dataset with 1 click.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a 
                    href={api.getCustomTemplateUrl()} 
                    download="atm_bank_demand_template.csv" 
                    className="btn btn-secondary"
                    style={{ fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} />
                    Download CSV Template
                  </a>
                  <button
                    type="button"
                    onClick={handleLoadSampleDataset}
                    disabled={customUploadLoading}
                    className="btn btn-lime"
                    style={{ fontSize: '12.5px' }}
                  >
                    {customUploadLoading ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    Load Sample Bank Dataset (Demo)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone & File Input */}
              <form onSubmit={handleUploadSubmit} className="upload-form-box">
                <div className="dropzone-area">
                  <input
                    type="file"
                    id="csv-file-input"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="csv-file-input" className="dropzone-label">
                    <UploadCloud size={38} className="dropzone-icon" />
                    <span className="dropzone-title">
                      {customFile ? customFile.name : 'Choose a CSV file or drag and drop here'}
                    </span>
                    <span className="dropzone-sub">
                      {customFile ? `${(customFile.size / 1024).toFixed(1)} KB selected` : 'Supports standard daily ATM transaction CSV files (up to 50MB)'}
                    </span>
                    <span className="btn btn-secondary" style={{ marginTop: '10px', fontSize: '12px' }}>
                      Browse Local Files
                    </span>
                  </label>
                </div>

                {/* Column Specifications & Mapping */}
                <div className="specs-and-mapping-grid">
                  {/* Column Specification Guide */}
                  <div className="column-specs-card">
                    <h5 className="specs-title">
                      <Info size={14} /> Column Specifications
                    </h5>
                    <div className="specs-group">
                      <span className="specs-group-label required">Required Fields:</span>
                      <ul className="specs-list">
                        <li><code>date</code>: YYYY-MM-DD daily observation timestamp</li>
                        <li><code>atm_id</code>: Unique identifier for each physical ATM</li>
                        <li><code>withdrawal_amount</code>: Total cash withdrawn for the day</li>
                      </ul>
                    </div>
                    <div className="specs-group">
                      <span className="specs-group-label optional">Optional Fields:</span>
                      <ul className="specs-list">
                        <li><code>atm_name</code>: Descriptive human-readable ATM label</li>
                        <li><code>bank_name</code>: Name of your banking institution</li>
                        <li><code>transaction_count</code>, <code>cash_balance</code>, <code>location</code></li>
                      </ul>
                    </div>
                  </div>

                  {/* Column Name Mapping */}
                  <div className="column-mapping-card">
                    <h5 className="specs-title">
                      <Sliders size={14} /> Column Name Mapping (Optional Custom Headers)
                    </h5>
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 12px' }}>
                      If your CSV headers differ from standard names, select your fields below:
                    </p>
                    <div className="mapping-grid">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Date Column *</label>
                        {customDetectedCols.length > 0 ? (
                          <select 
                            className="input-control font-mono"
                            value={customMapping.date_col}
                            onChange={(e) => setCustomMapping({...customMapping, date_col: e.target.value})}
                          >
                            {customDetectedCols.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            className="input-control font-mono"
                            value={customMapping.date_col}
                            onChange={(e) => setCustomMapping({...customMapping, date_col: e.target.value})}
                            placeholder="date"
                          />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>ATM ID Column *</label>
                        {customDetectedCols.length > 0 ? (
                          <select 
                            className="input-control font-mono"
                            value={customMapping.atm_id_col}
                            onChange={(e) => setCustomMapping({...customMapping, atm_id_col: e.target.value})}
                          >
                            {customDetectedCols.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            className="input-control font-mono"
                            value={customMapping.atm_id_col}
                            onChange={(e) => setCustomMapping({...customMapping, atm_id_col: e.target.value})}
                            placeholder="atm_id"
                          />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Withdrawal Amount Column *</label>
                        {customDetectedCols.length > 0 ? (
                          <select 
                            className="input-control font-mono"
                            value={customMapping.amount_col}
                            onChange={(e) => setCustomMapping({...customMapping, amount_col: e.target.value})}
                          >
                            {customDetectedCols.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            className="input-control font-mono"
                            value={customMapping.amount_col}
                            onChange={(e) => setCustomMapping({...customMapping, amount_col: e.target.value})}
                            placeholder="withdrawal_amount"
                          />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>ATM Name Column (Optional)</label>
                        {customDetectedCols.length > 0 ? (
                          <select 
                            className="input-control font-mono"
                            value={customMapping.atm_name_col || ''}
                            onChange={(e) => setCustomMapping({...customMapping, atm_name_col: e.target.value})}
                          >
                            <option value="">None / Use ATM ID</option>
                            {customDetectedCols.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            className="input-control font-mono"
                            value={customMapping.atm_name_col || ''}
                            onChange={(e) => setCustomMapping({...customMapping, atm_name_col: e.target.value})}
                            placeholder="atm_name"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {customUploadError && (
                  <div className="field-error-banner" style={{ marginTop: '16px' }}>
                    <AlertCircle size={15} />
                    <span>{customUploadError}</span>
                  </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="submit"
                    className="btn btn-lime"
                    disabled={!customFile || customUploadLoading}
                    style={{ minWidth: '180px' }}
                  >
                    {customUploadLoading ? (
                      <>
                        <RefreshCw size={15} className="spin" />
                        Validating Data Quality...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        Upload & Audit Quality
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Uploaded Dataset Workflow: Steps 2 to 6 */
            <div className="uploaded-workflow-container">
              {/* Active Dataset Overview Bar */}
              <div className="dataset-active-bar fintech-card">
                <div className="active-file-meta">
                  <div className="meta-icon-box">
                    <Database size={20} className="text-forest" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="file-title">{customFileInfo?.filename || 'Bank Dataset'}</span>
                      <span className="pill pill-forest font-mono">{customFileInfo?.file_size_kb || 0} KB</span>
                      <span className="pill pill-mint font-mono">{customQuality?.bank_name || 'Bank Portfolio'}</span>
                    </div>
                    <span className="file-sub">
                      Uploaded Session ID: <code>{customDatasetId}</code> • Isolated custom model sandbox
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetCustomDataset}
                  style={{ fontSize: '12px' }}
                >
                  <RefreshCw size={13} />
                  Upload Different Dataset
                </button>
              </div>

              {/* Step 2 & 3: Data Quality Report & Analysis */}
              <div className="fintech-card" style={{ padding: '28px', marginTop: '20px' }}>
                <div className="card-heading">
                  <ShieldAlert size={18} className="text-forest" />
                  <span className="heading-text">Steps 2 & 3: Data Validation Audit & Statistical Analysis</span>
                </div>

                {/* KPI Summary Grid */}
                <div className="custom-analysis-grid">
                  <div className="analysis-kpi-card">
                    <span className="kpi-label">TOTAL UPLOADED</span>
                    <span className="kpi-val font-mono">{customQuality?.total_uploaded_records?.toLocaleString() || 0}</span>
                    <span className="kpi-sub">Total records received</span>
                  </div>
                  <div className="analysis-kpi-card">
                    <span className="kpi-label">CLEAN OBSERVATIONS</span>
                    <span className="kpi-val font-mono text-forest">{customQuality?.clean_records?.toLocaleString() || 0}</span>
                    <span className="kpi-sub">Ready for time-series splits</span>
                  </div>
                  <div className="analysis-kpi-card">
                    <span className="kpi-label">UNIQUE ATMS</span>
                    <span className="kpi-val font-mono">{customQuality?.unique_atms_count || 0}</span>
                    <span className="kpi-sub">Distinct physical terminals</span>
                  </div>
                  <div className="analysis-kpi-card">
                    <span className="kpi-label">AVERAGE DAILY DEMAND</span>
                    <span className="kpi-val font-mono">${Math.round(customQuality?.average_daily_demand || 0).toLocaleString()}</span>
                    <span className="kpi-sub">Mean daily withdrawal</span>
                  </div>
                  <div className="analysis-kpi-card">
                    <span className="kpi-label">TOTAL WITHDRAWAL VOLUME</span>
                    <span className="kpi-val font-mono">${Math.round(customQuality?.total_withdrawal_volume || 0).toLocaleString()}</span>
                    <span className="kpi-sub">Portfolio cash dispensed</span>
                  </div>
                  <div className="analysis-kpi-card">
                    <span className="kpi-label">MISSING DATA RATE</span>
                    <span className="kpi-val font-mono">{customQuality?.missing_data_percentage || 0}%</span>
                    <span className="kpi-sub">Excluded incomplete rows</span>
                  </div>
                </div>

                {/* Quality Check Badges & Coverage */}
                <div className="quality-audit-breakdown" style={{ marginTop: '20px' }}>
                  <h5 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: 'var(--forest-green)' }}>
                    Quality Validation Diagnostics:
                  </h5>
                  <div className="quality-flags-row">
                    <div className={`quality-badge ${customQuality?.invalid_dates === 0 ? 'pass' : 'warn'}`}>
                      {customQuality?.invalid_dates === 0 ? <Check size={13} /> : <AlertTriangle size={13} />}
                      <span>Invalid Dates: {customQuality?.invalid_dates || 0}</span>
                    </div>
                    <div className={`quality-badge ${customQuality?.missing_amounts === 0 ? 'pass' : 'warn'}`}>
                      {customQuality?.missing_amounts === 0 ? <Check size={13} /> : <AlertTriangle size={13} />}
                      <span>Missing Amounts: {customQuality?.missing_amounts || 0}</span>
                    </div>
                    <div className={`quality-badge ${customQuality?.missing_atm_ids === 0 ? 'pass' : 'warn'}`}>
                      {customQuality?.missing_atm_ids === 0 ? <Check size={13} /> : <AlertTriangle size={13} />}
                      <span>Missing ATM IDs: {customQuality?.missing_atm_ids || 0}</span>
                    </div>
                    <div className={`quality-badge ${customQuality?.negative_amounts === 0 ? 'pass' : 'fail'}`}>
                      {customQuality?.negative_amounts === 0 ? <Check size={13} /> : <AlertTriangle size={13} />}
                      <span>Negative Amounts: {customQuality?.negative_amounts || 0}</span>
                    </div>
                    <div className={`quality-badge ${customQuality?.duplicate_records === 0 ? 'pass' : 'warn'}`}>
                      {customQuality?.duplicate_records === 0 ? <Check size={13} /> : <AlertTriangle size={13} />}
                      <span>Duplicate Records: {customQuality?.duplicate_records || 0}</span>
                    </div>
                    <div className="quality-badge pass">
                      <Calendar size={13} />
                      <span>Horizon: {customQuality?.date_coverage?.start_date} to {customQuality?.date_coverage?.end_date} ({customQuality?.date_coverage?.total_span_days} days)</span>
                    </div>
                  </div>

                  {/* ATM Observation Distribution */}
                  {customQuality?.atm_distribution && (
                    <div style={{ marginTop: '14px', background: '#F8FAF7', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(7,61,46,0.08)' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--forest-green)', display: 'block', marginBottom: '6px' }}>
                        ATM Observation Counts in Dataset:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {Object.entries(customQuality.atm_distribution).map(([atm, count]) => (
                          <span key={atm} className="pill pill-forest font-mono" style={{ fontSize: '11px' }}>
                            {customQuality.atm_names?.[atm] || atm}: {count} daily records
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rigorous Zero-Fill Refusal Notice */}
                  <div className="zero-fill-notice" style={{ marginTop: '14px' }}>
                    <Info size={14} className="text-forest" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                      <strong>Strict Time-Series Integrity Policy:</strong> Missing demand observations are strictly filtered and never converted into synthetic zeros. Zero-filling artificially distorts rolling averages and misleads machine learning regressors.
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 4: Model Training and Selection */}
              <div className="fintech-card" style={{ padding: '28px', marginTop: '20px' }}>
                <div className="card-heading">
                  <Award size={18} className="text-forest" />
                  <span className="heading-text">Step 4: Chronological Model Training & Algorithm Selection</span>
                </div>

                {!customTrainingResult ? (
                  <div className="training-cta-box">
                    <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#4A5568', lineHeight: 1.6 }}>
                      Train competitive time-series forecasting models using a <strong>chronological 70% Train / 15% Validation / 15% Test split</strong> (strictly avoiding random time-series leakage). The training pipeline constructs calendar and lookback lag features ($t-1, t-2, t-7, t-14$) looking strictly backward, benchmarks <strong>Naive Baseline</strong>, <strong>7-Day Moving Average</strong>, <strong>Random Forest</strong>, and <strong>Gradient Boosting</strong>, and selects the model with the lowest Validation MAE.
                    </p>
                    {customTrainingError && (
                      <div className="field-error-banner" style={{ marginBottom: '16px' }}>
                        <AlertCircle size={15} />
                        <span>{customTrainingError}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-lime"
                      onClick={handleCustomTrain}
                      disabled={customTrainingLoading}
                      style={{ fontSize: '13.5px', padding: '12px 24px' }}
                    >
                      {customTrainingLoading ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          Training & Benchmarking Models...
                        </>
                      ) : (
                        <>
                          <Cpu size={15} />
                          Train & Benchmark ML Models
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Winning Model Announcement Banner */}
                    <div className="model-winner-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="winner-trophy-circle">
                          <Award size={20} color="#073D2E" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--forest-green)' }}>
                              Selected Production Model: {customTrainingResult.selected_model}
                            </span>
                            <span className="pill pill-lime font-mono">Validation Winner</span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#52665A' }}>
                            Selected exclusively by Validation MAE (${customTrainingResult.validation_mae} USD). Tested on untouched test period ({customTrainingResult.test_period}).
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#52665A', display: 'block', fontWeight: 700 }}>
                          Improvement vs 7-Day Baseline
                        </span>
                        <span className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: customTrainingResult.improvement_vs_baseline_pct >= 0 ? 'var(--forest-green)' : '#DC2626' }}>
                          {customTrainingResult.improvement_vs_baseline_pct > 0 ? `+${customTrainingResult.improvement_vs_baseline_pct}%` : `${customTrainingResult.improvement_vs_baseline_pct}%`}
                        </span>
                      </div>
                    </div>

                    {/* Benchmark Comparison Table */}
                    <div className="table-responsive" style={{ marginTop: '16px' }}>
                      <table className="custom-benchmark-table">
                        <thead>
                          <tr>
                            <th>Model Architecture</th>
                            <th>Validation MAE (Selection)</th>
                            <th>Test MAE (Untouched)</th>
                            <th>Test RMSE</th>
                            <th>Test WAPE</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customTrainingResult.comparison_table?.map((m) => {
                            const isWinner = m.model === customTrainingResult.selected_model;
                            return (
                              <tr key={m.model} className={isWinner ? 'winner-row' : ''}>
                                <td style={{ fontWeight: isWinner ? 700 : 500 }}>
                                  {m.model}
                                  {isWinner && <span className="pill pill-lime" style={{ marginLeft: 8, fontSize: '10px', padding: '2px 6px' }}>Selected</span>}
                                </td>
                                <td className="font-mono">${m.val_mae.toFixed(2)}</td>
                                <td className="font-mono">${m.test_mae.toFixed(2)}</td>
                                <td className="font-mono">${m.test_rmse.toFixed(2)}</td>
                                <td className="font-mono">{(m.test_wape * 100).toFixed(2)}%</td>
                                <td>
                                  <span className={`pill ${isWinner ? 'pill-forest' : m.status === 'Baseline' ? 'pill-slate' : 'pill-mint'}`} style={{ fontSize: '10px' }}>
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748B' }}>
                      <span>Chronological Train: {customTrainingResult.train_rows} rows • Val: {customTrainingResult.val_rows} rows • Test: {customTrainingResult.test_rows} rows</span>
                      <button
                        type="button"
                        onClick={handleCustomTrain}
                        className="btn btn-secondary"
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        <RefreshCw size={12} /> Retrain
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 5 & 6: Forecast Generation & Results Dashboard */}
              <div className="studio-layout" style={{ marginTop: '20px' }}>
                {/* Left: Step 5 Forecast Generation Form */}
                <div className="fintech-card controls-card">
                  <div className="card-heading">
                    <Target size={18} className="text-forest" />
                    <span className="heading-text">Step 5: Generate Bank Forecast</span>
                  </div>

                  {!customTrainingResult ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      <AlertCircle size={24} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
                      Please train and select models in Step 4 to unlock forecast generation.
                    </div>
                  ) : (
                    <form onSubmit={handleCustomPredict} className="controls-form">
                      {/* Select ATM */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="custom-atm-select">
                          Select Bank ATM
                        </label>
                        <select
                          id="custom-atm-select"
                          className="input-control font-mono"
                          value={customSelectedAtm}
                          onChange={(e) => setCustomSelectedAtm(e.target.value)}
                        >
                          {customQuality?.unique_atms?.map((atm) => (
                            <option key={atm} value={atm}>
                              {customQuality.atm_names?.[atm] ? `${customQuality.atm_names[atm]} (${atm})` : atm}
                            </option>
                          ))}
                        </select>
                        <span className="input-hint">Target cash dispenser from uploaded portfolio</span>
                      </div>

                      {/* Forecast Date */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="custom-date-input">
                          Forecast Date (YYYY-MM-DD)
                        </label>
                        <input
                          id="custom-date-input"
                          type="date"
                          className="input-control font-mono"
                          value={customForecastDate}
                          onChange={(e) => setCustomForecastDate(e.target.value)}
                        />
                        <span className="input-hint">
                          Dataset span: {customQuality?.date_coverage?.start_date} to {customQuality?.date_coverage?.end_date}
                        </span>
                      </div>

                      {/* Date Presets from Uploaded Data */}
                      <div className="presets-box">
                        <span className="presets-label">QUICK DATE PRESETS:</span>
                        <div className="presets-list">
                          {customQuality?.date_coverage?.end_date && (
                            <button
                              type="button"
                              className="preset-btn valid"
                              onClick={() => setCustomForecastDate(customQuality.date_coverage.end_date)}
                            >
                              Latest Test ({customQuality.date_coverage.end_date})
                            </button>
                          )}
                          {customQuality?.date_coverage?.start_date && (
                            <button
                              type="button"
                              className="preset-btn outage"
                              onClick={() => setCustomForecastDate(customQuality.date_coverage.start_date)}
                            >
                              Early Lag Check ({customQuality.date_coverage.start_date})
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-lime w-full"
                        disabled={customPredictLoading || !customSelectedAtm || !customForecastDate}
                      >
                        {customPredictLoading ? (
                          <>
                            <RefreshCw size={15} className="spin" />
                            Generating Forecast...
                          </>
                        ) : (
                          <>
                            <Zap size={15} />
                            Generate Bank Forecast
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Right: Step 6 Results Dashboard */}
                <div className="fintech-card results-card">
                  <div className="card-heading">
                    <BarChart2 size={18} className="text-forest" />
                    <span className="heading-text">Step 6: Forecast Results Dashboard</span>
                  </div>

                  {customPredictLoading && (
                    <div className="prediction-loading-state">
                      <RefreshCw size={28} className="spin text-forest" />
                      <span className="loading-label">Executing isolated inference pipeline...</span>
                    </div>
                  )}

                  {!customPredictLoading && !customPredictResult && !customPredictError && (
                    <div className="prediction-empty-state">
                      <div className="empty-state-icon-box">
                        <Target size={28} className="text-forest" />
                      </div>
                      <h4 className="empty-title">Ready for Bank Forecast</h4>
                      <p className="empty-desc">
                        Select an ATM and target forecast date above, then click <strong>Generate Bank Forecast</strong> to view demand predictions, evaluation metrics, and historical trend charts.
                      </p>
                    </div>
                  )}

                  {!customPredictLoading && customPredictError && (
                    <div className="prediction-error-card">
                      <div className="error-status-banner">
                        <AlertTriangle size={17} />
                        <span>Historical Lag Boundary Notice (HTTP {customPredictError.status || '422'})</span>
                      </div>
                      <div className="error-body">
                        <h4 className="error-heading">Cannot Compute Forecast</h4>
                        <p className="error-message">{customPredictError.message}</p>
                      </div>
                      <div className="error-explanation-box">
                        <span className="explanation-title">Why did this happen?</span>
                        <p className="explanation-text">
                          The feature engineering pipeline requires actual historical observations during the preceding 14 calendar days ($t-1, t-2, t-7, t-14$) to calculate lag and rolling features. To maintain rigorous machine learning integrity, missing demand observations are never zero-filled.
                        </p>
                      </div>
                    </div>
                  )}

                  {!customPredictLoading && customPredictResult && (
                    <div className="results-content-box">
                      {/* KPI Banner */}
                      <div className="kpi-banner">
                        <div className="kpi-meta">
                          <span className="kpi-tag">PREDICTED DAILY WITHDRAWAL DEMAND</span>
                          <span className="kpi-atm-label">
                            {customPredictResult.atm_name} ({customPredictResult.atm_id})
                          </span>
                        </div>
                        <div className="kpi-number-row font-mono">
                          <span className="currency-symbol">$</span>
                          <span className="kpi-big-number">
                            {animatedCustomAmount.toLocaleString()}
                          </span>
                          <span className="currency-code">USD</span>
                        </div>
                        <div className="kpi-footer-row">
                          <span>Target Forecast Date: <strong>{customPredictResult.forecast_date}</strong></span>
                          <span>Model: <strong>{customPredictResult.model_used}</strong></span>
                        </div>
                      </div>

                      {/* Evaluation Metrics Grid */}
                      <div className="metrics-grid-3" style={{ marginTop: '16px' }}>
                        <div className="mini-metric-card">
                          <span className="metric-label">VALIDATION MAE</span>
                          <span className="metric-value font-mono">${customPredictResult.validation_mae.toFixed(2)}</span>
                          <span className="metric-sub">Selection benchmark</span>
                        </div>
                        <div className="mini-metric-card">
                          <span className="metric-label">TEST MAE</span>
                          <span className="metric-value font-mono">${customPredictResult.test_mae.toFixed(2)}</span>
                          <span className="metric-sub">Untouched evaluation</span>
                        </div>
                        <div className="mini-metric-card">
                          <span className="metric-label">TEST WAPE</span>
                          <span className="metric-value font-mono">{(customPredictResult.test_wape * 100).toFixed(1)}%</span>
                          <span className="metric-sub">Weighted error rate</span>
                        </div>
                      </div>

                      {/* Historical Demand & Forecast Chart */}
                      {customPredictResult.historical_series?.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--forest-green)' }}>
                              Recent Historical Demand & Predicted Horizon (Last 30 Days):
                            </span>
                            <span className="pill pill-forest font-mono" style={{ fontSize: '10px' }}>
                              30 Observations
                            </span>
                          </div>
                          <div style={{ height: 220, width: '100%', background: '#FBF9F4', borderRadius: '8px', padding: '10px 0 0', border: '1px solid rgba(7,61,46,0.08)' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={customPredictResult.historical_series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="customDemandGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2BD99F" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#2BD99F" stopOpacity={0.0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(7,61,46,0.08)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52665A' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#52665A' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                <Tooltip
                                  formatter={(val) => [`$${Number(val).toLocaleString()} USD`, 'Actual Demand']}
                                  contentStyle={{ background: '#073D2E', borderRadius: '8px', border: '1px solid #C7F36B', color: '#F5F3E9', fontSize: '11px' }}
                                />
                                <Area type="monotone" dataKey="demand" stroke="#073D2E" strokeWidth={2} fillOpacity={1} fill="url(#customDemandGrad)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Provenance & Isolation Governance Banner */}
                      <div className="governance-provenance-box" style={{ marginTop: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <CheckCircle2 size={14} className="text-forest" />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--forest-green)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Model Isolation & Dataset Provenance Verified
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#4A5568', lineHeight: 1.5 }}>
                          {customPredictResult.training_provenance} The original Spar Nord historical dataset (10,296 records, 2011–2017) and its production benchmarks remain strictly isolated and unaffected.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: GENERAL DEMAND ESTIMATOR (SCENARIO-BASED) */}
      {forecastMode === 'general-estimator' && (
        <div className="studio-layout">
          {/* Left Column: Scenario Parameters */}
          <div className="fintech-card controls-card">
            <div className="card-heading">
              <Sliders size={18} className="text-forest" />
              <span className="heading-text">Scenario Assumptions</span>
            </div>

            {/* Quick Presets */}
            <div className="presets-box" style={{ marginBottom: '18px' }}>
              <span className="presets-label">REALISTIC SCENARIO PRESETS:</span>
              <div className="presets-list">
                {scenarioPresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="preset-btn valid"
                    onClick={() => applyScenarioPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setScenarioSubmitted(true); }} className="controls-form" noValidate>
              {/* 1. ATM Location Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-location">
                  ATM Location Type
                </label>
                <select
                  id="scenario-location"
                  className="input-control font-mono"
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                >
                  {locationTypes.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <span className="input-hint">Contextual documentation metadata (not an empirical ML multiplier)</span>
              </div>

              {/* 2. Expected Daily Transactions */}
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-tx">
                  Expected Daily Transactions
                </label>
                <input
                  id="scenario-tx"
                  type="number"
                  min="0"
                  step="1"
                  className={`input-control font-mono ${txError ? 'input-error' : ''}`}
                  value={dailyTransactions}
                  onChange={(e) => { setDailyTransactions(e.target.value); setScenarioSubmitted(true); }}
                  placeholder="e.g. 120"
                />
                {txError && <span className="field-error-text">{txError}</span>}
                <span className="input-hint">Estimated count of withdrawal operations per day</span>
              </div>

              {/* 3. Average Withdrawal Amount (USD) */}
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-avg">
                  Average Withdrawal Amount (USD)
                </label>
                <div className="input-currency-wrapper">
                  <span className="currency-prefix">$</span>
                  <input
                    id="scenario-avg"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`input-control font-mono pl-prefix ${avgError ? 'input-error' : ''}`}
                    value={avgWithdrawal}
                    onChange={(e) => { setAvgWithdrawal(e.target.value); setScenarioSubmitted(true); }}
                    placeholder="e.g. 75.00"
                  />
                </div>
                {avgError && <span className="field-error-text">{avgError}</span>}
                <span className="input-hint">Mean cash dispensed per transaction</span>
              </div>

              {/* 4. Day of the Week */}
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-dow">
                  Day of Week
                </label>
                <select
                  id="scenario-dow"
                  className="input-control font-mono"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                >
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="input-hint">Contextual planning schedule</span>
              </div>

              {/* 5. Holiday / Event Context */}
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-holiday">
                  Holiday / Event Context
                </label>
                <select
                  id="scenario-holiday"
                  className="input-control font-mono"
                  value={holidayEvent}
                  onChange={(e) => setHolidayEvent(e.target.value)}
                >
                  {holidayEvents.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="input-hint">Operational calendar context</span>
              </div>

              {/* 6. Expected Transaction Increase Percentage */}
              <div className="form-group">
                <label className="form-label" htmlFor="scenario-surge">
                  Expected Transaction Increase (%) <span className="optional-tag">Optional</span>
                </label>
                <div className="input-currency-wrapper">
                  <input
                    id="scenario-surge"
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    className={`input-control font-mono pr-suffix ${surgeError ? 'input-error' : ''}`}
                    value={surgePercentage}
                    onChange={(e) => { setSurgePercentage(e.target.value); setScenarioSubmitted(true); }}
                    placeholder="0"
                  />
                  <span className="currency-suffix">%</span>
                </div>
                {surgeError && <span className="field-error-text">{surgeError}</span>}
                <span className="input-hint">Applies transparently: Base × (1 + % / 100)</span>
              </div>

              <button
                type="submit"
                id="btn-update-scenario"
                className="btn btn-lime w-full"
                disabled={!isScenarioValid}
              >
                Update Scenario Estimate
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="methodology-guardrail card-mint" style={{ marginTop: '20px' }}>
              <Info size={18} className="text-forest flex-shrink-0" />
              <p className="guardrail-text">
                <strong>Scenario Modeling Notice:</strong> This mode computes deterministic arithmetic ($T \times W$). It does not invoke the Random Forest model and introduces no synthetic data into historical benchmarks. Location type, weekday, and holiday selections provide contextual documentation.
              </p>
            </div>
          </div>

          {/* Right Column: Estimated Demand Output */}
          <div className="fintech-card results-card">
            <div className="card-heading">
              <Calculator size={18} className="text-forest" />
              <span className="heading-text">Estimated Demand Output</span>
              <span className="pill pill-mint font-mono" style={{ marginLeft: 'auto' }}>
                Scenario-Based Estimate
              </span>
            </div>

            <div className="results-display-area">
              {isScenarioValid && scenarioSubmitted ? (
                <div className="prediction-output-flow">
                  {/* Hero Amount Display */}
                  <div className="result-kpi-block card-forest">
                    <div className="kpi-left">
                      <span className="result-kpi-label font-mono">SCENARIO-BASED DEMAND ESTIMATE</span>
                      <div className="result-amount-row">
                        <span className="result-currency-symbol text-lime font-mono">$</span>
                        <span className="result-amount tabular-nums text-lime font-mono">
                          {animatedScenarioAmount.toLocaleString()}
                        </span>
                        <span className="result-currency-code font-mono">USD</span>
                      </div>
                      <div className="kpi-sub-note font-mono">
                        {parsedTx.toLocaleString()} transactions × ${parsedAvg.toFixed(2)}
                        {parsedSurge > 0 ? ` (+${parsedSurge}% increase)` : ''}
                      </div>
                    </div>

                    <div className="scenario-visual-badge">
                      <div className="scenario-badge-circle">
                        <Calculator size={28} className="text-lime" />
                      </div>
                      <span className="scenario-badge-label font-mono">Deterministic Arithmetic</span>
                    </div>
                  </div>

                  {/* Scenario Assumptions Summary Grid */}
                  <div className="result-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Location Type</span>
                      <span className="detail-value">{locationType}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Day of Week</span>
                      <span className="detail-value">{dayOfWeek}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Calendar Context</span>
                      <span className="detail-value">{holidayEvent}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Expected Daily Transactions</span>
                      <span className="detail-value font-mono">{parsedTx.toLocaleString()} tx/day</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Average Withdrawal Amount</span>
                      <span className="detail-value font-mono">${parsedAvg.toFixed(2)} USD</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Base Unadjusted Demand</span>
                      <span className="detail-value font-mono">
                        ${baseScenarioDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {parsedSurge > 0 && (
                      <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-label">Applied Increase Percentage</span>
                        <span className="detail-value font-mono text-forest">
                          +{parsedSurge}% (+${surgeDollarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Transparent Calculation Walkthrough */}
                  <div className="scenario-calc-explanation-box">
                    <div className="calc-exp-header">
                      <Info size={16} className="text-forest" />
                      <span>Transparent Calculation Walkthrough</span>
                    </div>
                    <div className="calc-steps-list font-mono">
                      <div className="calc-step-row">
                        <span className="step-num">Step 1:</span>
                        <span className="step-desc">
                          Base Demand = Expected Transactions ({parsedTx.toLocaleString()}) × Average Withdrawal (${parsedAvg.toFixed(2)}) = <strong>${baseScenarioDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
                        </span>
                      </div>
                      {parsedSurge > 0 ? (
                        <>
                          <div className="calc-step-row">
                            <span className="step-num">Step 2:</span>
                            <span className="step-desc">
                              Increase Adjustment = ${baseScenarioDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {parsedSurge}% = <strong>+${surgeDollarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
                            </span>
                          </div>
                          <div className="calc-step-row highlight">
                            <span className="step-num">Step 3:</span>
                            <span className="step-desc">
                              Total Estimated Demand = Base (${baseScenarioDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + Increase (${surgeDollarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) = <strong>${totalScenarioDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="calc-step-row highlight">
                          <span className="step-num">Step 2:</span>
                          <span className="step-desc">
                            No increase adjustment applied (0%). Total Estimated Demand = <strong>${totalScenarioDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scientific Integrity Governance Notice */}
                  <div className="scenario-governance-card">
                    <div className="gov-header">
                      <ShieldAlert size={16} className="text-forest" />
                      <span>Scientific Integrity & Methodology Governance</span>
                    </div>
                    <p className="gov-text">
                      • <strong>Non-ML Arithmetic:</strong> This figure is a <em>Scenario-Based Estimate</em> calculated directly from user inputs ($T \times W$). It is not generated by the Random Forest model and must not be cited as machine learning inference.
                      <br />
                      • <strong>Contextual Parameters:</strong> ATM location type, day of week, and holiday event provide operational documentation for planning scenarios; they are not calibrated empirical multipliers.
                      <br />
                      • <strong>Benchmark Integrity:</strong> No synthetic values from this calculator are mixed with or added to the 10,296 historical Spar Nord training records or model evaluation benchmarks.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prediction-error-card">
                  <div className="error-status-banner">
                    <AlertTriangle size={17} />
                    <span>Invalid Scenario Inputs</span>
                  </div>
                  <div className="error-body">
                    <h4 className="error-heading">Please Correct Scenario Parameters</h4>
                    <p className="error-message">
                      {txError || avgError || surgeError || 'Please provide valid non-negative numbers for transactions and withdrawal amounts.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .studio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 4px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .studio-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .studio-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 28px;
          align-items: start;
        }

        .controls-card,
        .results-card {
          padding: 28px;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-forest);
        }
        .heading-text {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-dark);
          letter-spacing: -0.01em;
        }

        .controls-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 11.5px;
          font-weight: 800;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .input-hint {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .presets-box {
          background: #F5F3E9;
          border: 1px solid var(--border-forest);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .presets-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          display: block;
          margin-bottom: 10px;
        }
        .presets-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .preset-btn {
          text-align: left;
          background: #FFFFFF;
          border: 1px solid var(--border-forest);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--text-charcoal);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .preset-btn:hover {
          border-color: #073D2E;
          color: #073D2E;
          background: #E8F0E5;
          transform: translateX(2px);
        }
        .preset-btn.outage {
          border-left: 3.5px solid #D97706;
        }
        .preset-btn.future {
          border-left: 3.5px solid #DC2626;
        }
        .preset-btn.valid {
          border-left: 3.5px solid #073D2E;
        }

        .w-full { width: 100%; }

        .methodology-guardrail {
          display: flex;
          gap: 12px;
          border-radius: var(--radius-md);
          padding: 14px 16px;
          margin-top: 20px;
        }
        .guardrail-text {
          font-size: 12px;
          color: #2F4D3C;
          line-height: 1.55;
        }
        .guardrail-text strong {
          color: #073D2E;
        }

        .results-display-area {
          min-height: 400px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 36px 20px;
        }
        .empty-icon-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #E8F0E5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .loading-title,
        .empty-title {
          font-size: 18px;
          font-family: var(--font-display);
          color: var(--text-dark);
          margin-bottom: 6px;
        }
        .loading-desc,
        .empty-desc {
          font-size: 13px;
          color: var(--text-muted);
          max-width: 440px;
          line-height: 1.6;
          margin-bottom: 18px;
        }
        .empty-tips {
          display: flex;
          flex-direction: column;
          gap: 7px;
          text-align: left;
          background: #F5F3E9;
          border: 1px solid var(--border-forest);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          font-size: 12px;
          color: var(--text-charcoal);
        }
        .tip-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .prediction-success-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .result-status-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #073D2E;
          background: #C7F36B;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
        }

        .result-kpi-block {
          border-radius: var(--radius-lg);
          padding: 26px 30px;
          display: grid;
          grid-template-columns: 1fr 180px;
          align-items: center;
          gap: 20px;
        }
        .kpi-left {
          display: flex;
          flex-direction: column;
        }
        .result-kpi-label {
          font-size: 11px;
          font-weight: 800;
          color: #A3BFB1;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .result-amount-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-top: 6px;
        }
        .result-currency-symbol {
          font-size: 28px;
          font-weight: 700;
        }
        .result-amount {
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .result-currency-code {
          font-size: 14px;
          font-weight: 700;
          color: #A3BFB1;
        }
        .kpi-sub-note {
          font-size: 11px;
          color: #A3BFB1;
          margin-top: 8px;
          font-family: var(--font-mono);
        }
        .kpi-3d-visual {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .detail-item {
          background: #F5F3E9;
          border: 1px solid var(--border-forest);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .detail-label {
          font-size: 10.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        .detail-value {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-dark);
        }

        .replenishment-advice-box {
          padding: 14px 18px;
          border-left: 4px solid #073D2E;
        }
        .advice-title {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--text-dark);
          margin-bottom: 4px;
        }
        .advice-desc {
          font-size: 12px;
          color: #2F4D3C;
          line-height: 1.55;
        }

        .prediction-error-card {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          border-radius: var(--radius-md);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .error-status-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 800;
          color: #92400E;
        }
        .error-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .error-heading {
          font-size: 15px;
          font-weight: 800;
          color: #78350F;
        }
        .error-message {
          font-size: 13px;
          color: #92400E;
          line-height: 1.5;
        }
        .error-explanation-box {
          background: #FFFFFF;
          border: 1px solid #FDE68A;
          border-radius: var(--radius-sm);
          padding: 14px 16px;
        }
        .explanation-title {
          font-size: 11px;
          font-weight: 800;
          color: #92400E;
          display: block;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mode-tab-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #E8F0E5;
          padding: 6px;
          border-radius: 12px;
          margin-bottom: 24px;
          overflow-x: auto;
        }
        .mode-tab-item {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          background: transparent;
          font-family: var(--font-body);
          font-size: 13.5px;
          font-weight: 600;
          color: #4A5568;
          padding: 11px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          text-align: center;
        }
        .mode-tab-item:hover {
          color: var(--forest-green);
        }
        .mode-tab-item.active {
          background: #FFFFFF;
          color: var(--forest-green);
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(7, 61, 46, 0.08);
        }

        .input-currency-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .currency-prefix {
          position: absolute;
          left: 12px;
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--forest-green);
          font-size: 14px;
          pointer-events: none;
        }
        .currency-suffix {
          position: absolute;
          right: 12px;
          font-family: var(--font-mono);
          font-weight: 700;
          color: #64748B;
          font-size: 13px;
          pointer-events: none;
        }
        .input-control.pl-prefix {
          padding-left: 28px;
        }
        .input-control.pr-suffix {
          padding-right: 32px;
        }
        .input-control.input-error {
          border-color: #EF4444;
          background-color: #FEF2F2;
        }
        .field-error-text {
          display: block;
          color: #DC2626;
          font-size: 11.5px;
          margin-top: 4px;
          font-weight: 600;
        }
        .optional-tag {
          font-size: 10px;
          font-weight: 600;
          color: #64748B;
          background: #E2E8F0;
          padding: 1px 6px;
          border-radius: 4px;
          margin-left: 6px;
        }

        .scenario-visual-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          justify-content: center;
          padding-left: 16px;
          border-left: 1px solid rgba(255, 255, 255, 0.12);
        }
        .scenario-badge-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(199, 243, 107, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scenario-badge-label {
          font-size: 10px;
          color: #A3BFB1;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .scenario-calc-explanation-box {
          background: #F8FAF8;
          border: 1px solid rgba(7, 61, 46, 0.12);
          border-radius: var(--radius-sm);
          padding: 16px;
        }
        .calc-exp-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          color: var(--forest-green);
          margin-bottom: 10px;
        }
        .calc-steps-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
        }
        .calc-step-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
          color: #334155;
        }
        .calc-step-row.highlight {
          color: var(--forest-green);
          background: #E8F0E5;
          padding: 6px 8px;
          border-radius: 6px;
        }
        .step-num {
          font-weight: 700;
          flex-shrink: 0;
        }
        .step-desc {
          flex: 1;
        }

        .scenario-governance-card {
          background: #F5F3E9;
          border: 1px solid rgba(7, 61, 46, 0.12);
          border-radius: var(--radius-sm);
          padding: 16px 18px;
        }
        .gov-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          color: var(--forest-green);
          margin-bottom: 8px;
        }
        .gov-text {
          font-family: var(--font-body);
          font-size: 12px;
          color: #334155;
          line-height: 1.6;
          margin: 0;
        }
        .gov-text strong {
          color: var(--forest-green);
        }

        /* Mode B: Multi-Bank Studio Styles */
        .custom-bank-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .custom-stepper-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          border: 1px solid var(--border-forest);
          border-radius: 12px;
          padding: 12px 20px;
          overflow-x: auto;
        }
        .step-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
          white-space: nowrap;
        }
        .step-badge.active {
          color: var(--forest-green);
          font-weight: 700;
        }
        .step-badge.completed {
          color: #059669;
        }
        .step-badge-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
        }
        .step-badge.active .step-badge-num {
          background: var(--forest-green);
          color: #C7F36B;
        }
        .step-badge.completed .step-badge-num {
          background: #059669;
          color: #FFFFFF;
        }
        .stepper-arrow {
          color: #CBD5E1;
          flex-shrink: 0;
        }

        .sample-template-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: #F4FAF5;
          border: 1px solid rgba(7, 61, 46, 0.16);
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .template-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .dropzone-area {
          border: 2px dashed rgba(7, 61, 46, 0.25);
          border-radius: 12px;
          padding: 36px 24px;
          text-align: center;
          background: #FBF9F4;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dropzone-area:hover {
          border-color: var(--forest-green);
          background: #F2F8F3;
        }
        .dropzone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        .dropzone-icon {
          color: var(--forest-green);
          margin-bottom: 12px;
        }
        .dropzone-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 4px;
        }
        .dropzone-sub {
          font-size: 12.5px;
          color: #64748B;
        }

        .specs-and-mapping-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 24px;
        }
        .column-specs-card, .column-mapping-card {
          background: #FFFFFF;
          border: 1px solid rgba(7, 61, 46, 0.12);
          border-radius: 10px;
          padding: 18px 20px;
        }
        .specs-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--forest-green);
          margin: 0 0 12px;
        }
        .specs-group {
          margin-bottom: 10px;
        }
        .specs-group-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: block;
          margin-bottom: 4px;
        }
        .specs-group-label.required { color: #047857; }
        .specs-group-label.optional { color: #64748B; }
        .specs-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 12px;
          color: #334155;
          line-height: 1.6;
        }
        .specs-list code {
          background: #E8F0E5;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--forest-green);
        }
        .mapping-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .dataset-active-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #FFFFFF;
          border: 1px solid var(--border-forest);
          border-radius: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .active-file-meta {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .meta-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #E8F0E5;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .file-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-dark);
        }
        .file-sub {
          font-size: 11.5px;
          color: #64748B;
        }

        .custom-analysis-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .analysis-kpi-card {
          background: #FBF9F4;
          border: 1px solid rgba(7, 61, 46, 0.08);
          border-radius: 10px;
          padding: 14px 18px;
        }
        .analysis-kpi-card .kpi-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 4px;
        }
        .analysis-kpi-card .kpi-val {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-dark);
          display: block;
          margin-bottom: 2px;
        }
        .analysis-kpi-card .kpi-sub {
          font-size: 11px;
          color: #94A3B8;
        }

        .quality-flags-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .quality-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 8px;
        }
        .quality-badge.pass {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .quality-badge.warn {
          background: #FFFBEB;
          color: #92400E;
          border: 1px solid #FDE68A;
        }
        .quality-badge.fail {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .zero-fill-notice {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #FFFBEB;
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 8px;
          padding: 10px 14px;
        }

        .training-cta-box {
          background: #F4FAF5;
          border: 1px solid rgba(7, 61, 46, 0.12);
          border-radius: 10px;
          padding: 24px;
        }
        .model-winner-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #E8F0E5;
          border: 1px solid rgba(7, 61, 46, 0.18);
          border-radius: 10px;
          padding: 16px 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .winner-trophy-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #C7F36B;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .custom-benchmark-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        .custom-benchmark-table th {
          text-align: left;
          padding: 10px 14px;
          background: #073D2E;
          color: #F5F3E9;
          font-weight: 700;
          font-size: 11.5px;
          letter-spacing: 0.02em;
        }
        .custom-benchmark-table td {
          padding: 11px 14px;
          border-bottom: 1px solid rgba(7, 61, 46, 0.08);
          color: #1E2922;
        }
        .custom-benchmark-table tr.winner-row {
          background: rgba(199, 243, 107, 0.14);
          font-weight: 600;
        }
        .custom-benchmark-table tr:hover:not(.winner-row) {
          background: #F8FAF7;
        }

        .governance-provenance-box {
          background: #F5F3E9;
          border: 1px solid rgba(7, 61, 46, 0.14);
          border-radius: 8px;
          padding: 12px 16px;
        }

        @media (max-width: 980px) {
          .studio-layout { grid-template-columns: 1fr; }
          .result-kpi-block { grid-template-columns: 1fr; }
          .specs-and-mapping-grid { grid-template-columns: 1fr; }
          .custom-analysis-grid { grid-template-columns: 1fr; }
          .mapping-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
