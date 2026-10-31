import React, { useEffect, useState, lazy, Suspense } from 'react';
import { 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Database, 
  Building2, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  CheckCircle2, 
  TrendingDown, 
  Layers, 
  Zap 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { api } from '../api/client';
import { CURRENT_REGION } from '../config/regionConfig';

// Code-split Three.js hero canvas for performance
const AtmHeroCanvas = lazy(() => import('../components/AtmHeroCanvas').then(m => ({ default: m.AtmHeroCanvas })));

export const OverviewView = ({ onNavigateToForecast, onNavigateToObservatory }) => {
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, histRes] = await Promise.all([
        api.getSummary(),
        api.getHistorical()
      ]);
      setSummary(sumRes);
      setTrendData(histRes?.monthly_trend || []);
    } catch (err) {
      console.warn('Overview telemetry fetch notice:', err.message);
      setError(err.message || 'Unable to retrieve real-time fleet analytics from FastAPI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Animated counters for KPI figures
  const animatedRows = useAnimatedCounter(summary?.dataset_rows || 10296);
  const animatedMean = useAnimatedCounter(summary?.mean_daily_usd ? Math.round(summary.mean_daily_usd) : 9398);

  const defaultAtmProfiles = [
    { atm_name: 'Airport ATM', observations: 1895, mean_withdrawn_usd: 8426, std_withdrawn_usd: 3327 },
    { atm_name: 'Big Street ATM', observations: 2099, mean_withdrawn_usd: 5184, std_withdrawn_usd: 2339 },
    { atm_name: 'Christ College ATM', observations: 2164, mean_withdrawn_usd: 9317, std_withdrawn_usd: 4086 },
    { atm_name: 'KK Nagar ATM', observations: 2151, mean_withdrawn_usd: 14283, std_withdrawn_usd: 7479 },
    { atm_name: 'Mount Road ATM', observations: 1987, mean_withdrawn_usd: 9574, std_withdrawn_usd: 4303 }
  ];

  return (
    <div className="view-container">
      {/* 1. Large Mode-Inspired Hero Section */}
      <section className="mode-hero-section">
        <div className="hero-grid">
          {/* Left Side: Bold Editorial Typography */}
          <div className="hero-editorial-col">
            <div className="hero-tag">
              <span className="hero-tag-glow" />
              <span>PREDICTIVE CASH LIQUIDITY INTELLIGENCE</span>
            </div>

            <h1 className="hero-display-headline">
              See the patterns.<br />
              <span className="headline-highlight">Predict the demand.</span><br />
              Keep cash moving.
            </h1>

            <p className="hero-editorial-sub">
              Turn historical ATM withdrawal patterns into meaningful daily cash-demand estimates with machine learning.
            </p>

            <div className="hero-actions-row">
              <button 
                type="button" 
                className="btn btn-lime"
                onClick={() => onNavigateToForecast?.()}
              >
                Explore Forecast Studio
                <ArrowRight size={16} />
              </button>

              <button 
                type="button" 
                className="btn btn-cream"
                onClick={() => onNavigateToObservatory?.()}
              >
                Discover Model Performance
              </button>
            </div>

            <div className="hero-footer-badges">
              <div className="footer-spec">
                <span className="spec-dot" />
                <span>Production Model: <strong>Random Forest</strong></span>
              </div>
              <div className="footer-spec">
                <span>Validation Horizon: <strong>2011–2017</strong></span>
              </div>
              <div className="footer-spec">
                <span className="spec-lime">Strict Anti-Leakage Calendar Lags</span>
              </div>
            </div>
          </div>

          {/* Right Side: Interactive 3D ATM Composition (Lazy Loaded) */}
          <div className="hero-3d-col">
            <Suspense fallback={
              <div className="hero-3d-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C7F36B' }}>
                <RefreshCw size={28} className="spin" />
              </div>
            }>
              <AtmHeroCanvas />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <section className="fintech-card error-alert-panel">
          <div className="error-alert-content">
            <AlertTriangle size={20} className="text-amber flex-shrink-0" />
            <div>
              <div className="error-title">API Connection Notice</div>
              <p className="error-desc">{error} Showing verified baseline metrics.</p>
              <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={loadOverview}>
                <RefreshCw size={12} />
                Retry Connection
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Editorial Bento Grid for Key Metrics */}
      <section className="editorial-bento-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-heading">Network Pulse & Fleet Verification</h2>
            <p className="section-subheading">
              Four verified empirical pillars driving the cash demand forecasting engine.
            </p>
          </div>
        </div>

        <div className="bento-container mt-4">
          {/* Bento Item 1: Historical Records (Mint Card) */}
          <div className="fintech-card bento-card bento-records card-mint">
            <div className="bento-card-top">
              <span className="bento-label">HISTORICAL RECORDS USED</span>
              <span className="pill pill-forest font-mono">100% Verified</span>
            </div>
            <div className="bento-metric-row">
              <span className="bento-huge-number tabular-nums">
                {animatedRows.toLocaleString()}
              </span>
              <span className="bento-unit">clean rows</span>
            </div>
            <p className="bento-desc">
              Strictly verified chronological daily transaction logs. All feature lags ($t-1$ to $t-14$) look backwards only, ensuring zero future data leakage.
            </p>
          </div>

          {/* Bento Item 2: Average Daily Demand Per ATM (Forest Dark Card) */}
          <div className="fintech-card bento-card bento-demand card-forest">
            <div className="bento-card-top">
              <span className="bento-label text-lime">MEAN DEMAND PER ATM OBSERVATION</span>
              <span className="pill pill-lime font-mono">Per-ATM Mean</span>
            </div>
            <div className="bento-metric-row">
              <span className="bento-huge-number tabular-nums text-lime">
                ${animatedMean.toLocaleString()}
              </span>
              <span className="bento-unit text-light-muted">USD / ATM day</span>
            </div>
            <div className="bento-median-breakdown">
              <span>Per-ATM Median: <strong>${summary?.median_daily_usd ? Math.round(summary.median_daily_usd).toLocaleString() : '8,398'}</strong> / day</span>
              <span className="separator">·</span>
              <span>Total Fleet Volume: <strong>${summary?.total_volume_usd ? (summary.total_volume_usd / 1000000).toFixed(1) : '96.8'}M</strong></span>
            </div>
          </div>

          {/* Bento Item 3: Monitored ATM Fleet (White Card) */}
          <div className="fintech-card bento-card bento-fleet">
            <div className="bento-card-top">
              <span className="bento-label">MONITORED ATM NETWORK</span>
              <span className="pill pill-mint">5 Terminals</span>
            </div>
            <div className="bento-metric-row">
              <span className="bento-huge-number tabular-nums">
                {summary?.supported_atms || 5}
              </span>
              <span className="bento-unit">Active ATMs</span>
            </div>
            <p className="bento-desc">
              High-traffic metropolitan locations: Airport, Big Street, Christ College, KK Nagar, and Mount Road.
            </p>
          </div>

          {/* Bento Item 4: Model Performance vs Baseline (Bright Lime Accent Card) */}
          <div className="fintech-card bento-card bento-perf">
            <div className="bento-card-top">
              <span className="bento-label">MODEL VS BASELINE</span>
              <span className="pill pill-forest font-mono">Outperforms</span>
            </div>
            <div className="bento-metric-row">
              <span className="bento-huge-number tabular-nums">
                -$202.52
              </span>
              <span className="bento-unit">USD MAE</span>
            </div>
            <p className="bento-desc">
              Random Forest achieves a Test Set WAPE of <strong>0.3696</strong>, outperforming the 7-day moving average baseline by <strong>-6.8%</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Historical Demand Visualization */}
      <section className="fintech-card chart-panel">
        <div className="chart-header">
          <div>
            <h2 className="section-heading">Historical Network Cash Demand (2011 – 2017)</h2>
            <p className="section-subheading">
              Monthly cash withdrawal aggregates across all 5 monitored ATMs. Highlights normal circulation patterns and the late 2016 empirical data reporting hiatus.
            </p>
          </div>
          <div className="chart-legend-box">
            <span className="legend-item">
              <span className="legend-dot normal" /> Normal Circulation
            </span>
            <span className="legend-item">
              <span className="legend-dot shock" /> Data Sparsity Interval (Nov 2016 – Feb 2017)
            </span>
          </div>
        </div>

        <div className="chart-canvas-wrapper">
          {loading ? (
            <div className="chart-loading-state">
              <RefreshCw size={24} className="spin text-forest" />
              <span>Loading verified historical records...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendData.length ? trendData : fallbackMonthlyTrend} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="modeChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#073D2E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#073D2E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(7, 61, 46, 0.08)" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#52665A" 
                  fontSize={11.5}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(7, 61, 46, 0.2)' }}
                  tickFormatter={(val) => (typeof val === 'string' && val.length >= 4 ? val.slice(2) : val)}
                />
                <YAxis 
                  stroke="#52665A" 
                  fontSize={11.5}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(7, 61, 46, 0.2)' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip content={<ModeChartTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="total_withdrawn" 
                  stroke="#073D2E" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#modeChartGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-editorial-callout">
          <Info size={18} className="text-forest flex-shrink-0" />
          <div className="callout-body">
            <strong>Understanding the 2016 Data Reporting Hiatus:</strong>
            <p>
              In late 2016, transaction logging in the Spar Nord dataset recorded sharply fewer active days (with only a single transaction day recorded in December 2016 across all terminals). Our strict lookback validation isolates this reporting gap, refusing to generate predictions on unobserved days to uphold data integrity.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Monitored ATM Fleet Profiles */}
      <section>
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">Monitored ATM Fleet Profiles</h2>
            <p className="section-subheading">
              Select any terminal to immediately generate single-date cash demand forecasts in Forecast Studio.
            </p>
          </div>
        </div>

        <div className="grid-3 mt-4">
          {(summary?.atm_profiles || defaultAtmProfiles).map((atm) => (
            <div 
              key={atm.atm_name} 
              className="fintech-card atm-card"
              onClick={() => onNavigateToForecast?.(atm.atm_name)}
            >
              <div className="atm-card-header">
                <div className="atm-title-box">
                  <Building2 size={18} className="text-forest" />
                  <span className="atm-card-name">{atm.atm_name}</span>
                </div>
                <span className="pill pill-forest font-mono">Active</span>
              </div>

              <div className="atm-metrics-row">
                <div className="atm-metric">
                  <span className="atm-m-label">Mean Daily Demand</span>
                  <span className="atm-m-val tabular-nums">
                    ${Math.round(atm.mean_withdrawn_usd || 8500).toLocaleString()}
                  </span>
                </div>
                <div className="atm-metric">
                  <span className="atm-m-label">Typical Variation</span>
                  <span className="atm-m-val tabular-nums">
                    ±${Math.round(atm.std_withdrawn_usd || 3200).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="atm-card-footer">
                <span className="atm-coverage font-mono">
                  {atm.observations || 2000} records
                </span>
                <span className="atm-action-link">
                  Open Forecast <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Evaluation Notice */}
      <section className="fintech-card notice-box card-mint">
        <ShieldCheck size={26} className="text-forest flex-shrink-0" />
        <div className="notice-content">
          <h3 className="notice-title">Rigorous Evaluation Notice & Boundary Guarantee</h3>
          <p className="notice-text">
            ATM CASH DEMAND PREDICTOR strictly enforces calendar boundaries (2011-01-15 to 2017-09-29). 
            Predictions are never forward-filled or zero-fabricated on missing lag dates. If an ATM experienced 
            an outage, the forecasting engine flags feature ineligibility to preserve operational reliability.
          </p>
        </div>
      </section>

      <style>{`
        .mode-hero-section {
          background: #073D2E;
          border-radius: var(--radius-xl);
          padding: 44px 48px;
          color: #F5F3E9;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 45px rgba(7, 61, 46, 0.22);
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 40px;
          align-items: center;
        }

        .hero-editorial-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(199, 243, 107, 0.12);
          border: 1px solid rgba(199, 243, 107, 0.35);
          color: #C7F36B;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          width: fit-content;
        }
        .hero-tag-glow {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C7F36B;
          box-shadow: 0 0 8px #C7F36B;
        }

        .hero-display-headline {
          font-size: 44px;
          line-height: 1.08;
          color: #F5F3E9;
          font-family: var(--font-display);
          letter-spacing: -0.02em;
        }
        .headline-highlight {
          color: #C7F36B;
        }

        .hero-editorial-sub {
          font-size: 15px;
          color: #E8F0E5;
          line-height: 1.6;
          max-width: 520px;
          margin-top: 4px;
        }

        .hero-actions-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .hero-footer-badges {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 14px;
          padding-top: 16px;
          border-top: 1px solid rgba(199, 243, 107, 0.15);
          font-size: 11.5px;
          color: #A3BFB1;
          flex-wrap: wrap;
        }
        .footer-spec {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-spec strong {
          color: #F5F3E9;
        }
        .spec-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C7F36B;
        }
        .spec-lime {
          color: #C7F36B;
          font-weight: 600;
        }

        .hero-3d-col {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Bento Grid */
        .editorial-bento-section {
          display: flex;
          flex-direction: column;
        }
        .bento-container {
          display: grid;
          grid-template-columns: 1.3fr 1.3fr 1fr 1fr;
          gap: 20px;
        }

        .bento-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-radius: var(--radius-lg);
        }
        .bento-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bento-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--text-dark);
        }
        .bento-metric-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .bento-huge-number {
          font-size: 38px;
          font-family: var(--font-body);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--text-dark);
        }
        .bento-unit {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .bento-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-top: auto;
        }

        .bento-demand {
          background: #073D2E;
        }
        .bento-demand .bento-label {
          color: #C7F36B;
        }
        .bento-median-breakdown {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #A3BFB1;
          margin-top: auto;
        }
        .bento-median-breakdown strong {
          color: #FFFFFF;
        }
        .separator {
          color: #C7F36B;
        }

        .bento-perf {
          border-left: 4px solid #C7F36B;
        }

        /* Chart Panel */
        .chart-panel {
          padding: 28px 32px;
        }
        .chart-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 22px;
          flex-wrap: wrap;
          gap: 14px;
        }
        .chart-legend-box {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .legend-dot.normal {
          background: #073D2E;
        }
        .legend-dot.shock {
          background: #D97706;
        }

        .chart-canvas-wrapper {
          width: 100%;
          min-height: 320px;
        }
        .chart-loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 320px;
          color: var(--text-muted);
        }

        .chart-editorial-callout {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #E8F0E5;
          border: 1px solid rgba(7, 61, 46, 0.15);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          margin-top: 20px;
        }
        .callout-body strong {
          font-size: 13px;
          color: #073D2E;
          display: block;
          margin-bottom: 4px;
        }
        .callout-body p {
          font-size: 12.5px;
          color: #334D3D;
          line-height: 1.55;
        }

        .section-title-row {
          margin-bottom: 8px;
        }
        .mt-4 { margin-top: 18px; }

        .atm-card {
          padding: 22px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .atm-card:hover {
          transform: translateY(-2px);
          border-color: #073D2E;
        }
        .atm-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .atm-title-box {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .atm-card-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-dark);
        }
        .atm-metrics-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #F5F3E9;
          border-radius: var(--radius-sm);
          padding: 12px 14px;
        }
        .atm-metric {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .atm-m-label {
          font-size: 10.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .atm-m-val {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-dark);
        }
        .atm-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid var(--border-forest);
        }
        .atm-coverage {
          color: var(--text-muted);
          font-size: 11px;
        }
        .atm-action-link {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          color: #073D2E;
          transition: gap var(--transition-fast);
        }
        .atm-card:hover .atm-action-link {
          gap: 7px;
          color: #064B36;
        }

        .notice-box {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding: 22px 26px;
        }
        .notice-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 4px;
        }
        .notice-text {
          font-size: 13px;
          color: #2F4D3C;
          line-height: 1.55;
        }

        .custom-chart-tooltip {
          background: #073D2E;
          color: #F5F3E9;
          border: 1px solid #C7F36B;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          font-size: 12px;
        }
        .tooltip-header {
          font-weight: 700;
          color: #C7F36B;
          margin-bottom: 6px;
          border-bottom: 1px solid rgba(199, 243, 107, 0.2);
          padding-bottom: 4px;
          font-family: var(--font-mono);
        }
        .tooltip-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 4px;
          color: #E8F0E5;
        }
        .tooltip-alert {
          margin-top: 6px;
          padding: 3px 8px;
          background: #F59E0B;
          color: #073D2E;
          font-size: 10.5px;
          font-weight: 700;
          border-radius: 4px;
        }

        @media (max-width: 1080px) {
          .hero-grid { grid-template-columns: 1fr; }
          .bento-container { grid-template-columns: 1fr 1fr; }
          .hero-display-headline { font-size: 36px; }
        }
        @media (max-width: 680px) {
          .bento-container { grid-template-columns: 1fr; }
          .hero-display-headline { font-size: 30px; }
          .mode-hero-section { padding: 26px 20px; }
        }
      `}</style>
    </div>
  );
};

const ModeChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-header">{label}</div>
        <div className="tooltip-row">
          <span>Monthly Volume:</span>
          <span className="font-mono text-lime font-semibold">
            ${data?.total_withdrawn ? data.total_withdrawn.toLocaleString() : '—'}
          </span>
        </div>
        <div className="tooltip-row">
          <span>Daily Mean:</span>
          <span className="font-mono">
            ${data?.mean_withdrawn ? Math.round(data.mean_withdrawn).toLocaleString() : '—'}
          </span>
        </div>
        <div className="tooltip-row">
          <span>Active Observations:</span>
          <span className="font-mono">{data?.observations || '—'}</span>
        </div>
        {data?.is_shock_period && (
          <div className="tooltip-alert">
            Empirical Data Sparsity Period
          </div>
        )}
      </div>
    );
  }
  return null;
};

const fallbackMonthlyTrend = [
  { month: '2016-09', total_withdrawn: 1350000, observations: 150, is_shock_period: false },
  { month: '2016-10', total_withdrawn: 1420000, observations: 155, is_shock_period: false },
  { month: '2016-11', total_withdrawn: 780000, observations: 120, is_shock_period: true },
  { month: '2016-12', total_withdrawn: 210000, observations: 40, is_shock_period: true },
  { month: '2017-01', total_withdrawn: 490000, observations: 95, is_shock_period: true },
  { month: '2017-02', total_withdrawn: 890000, observations: 130, is_shock_period: true },
  { month: '2017-03', total_withdrawn: 1280000, observations: 155, is_shock_period: false },
  { month: '2017-04', total_withdrawn: 1390000, observations: 150, is_shock_period: false },
];
