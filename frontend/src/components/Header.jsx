import React from 'react';
import { Calendar, Cpu, RefreshCw, Globe2, Sparkles } from 'lucide-react';
import { CURRENT_REGION } from '../config/regionConfig';

export const Header = ({ title, subtitle, modelInfo, backendHealthy, connectionStatus = 'connecting', onRetryStatus }) => {
  const isOnline = backendHealthy || connectionStatus === 'online';
  const isConnecting = !isOnline && connectionStatus === 'connecting';

  return (
    <header className="mode-header">
      <div className="header-titles">
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>

      <div className="header-metadata">
        <div className="meta-pill">
          <Calendar size={13} className="text-forest" />
          <span className="meta-label">Horizon:</span>
          <span className="meta-value tabular-nums">2011–2017</span>
        </div>

        <div className="meta-pill pill-highlight">
          <Cpu size={13} className="text-forest" />
          <span className="meta-label">Model:</span>
          <span className="meta-value font-semibold">
            {modelInfo?.model_name || 'Random Forest'}
          </span>
        </div>

        <div className="meta-pill" title="Configured for multi-region currency support">
          <Globe2 size={13} className="text-forest" />
          <span className="meta-label">Region:</span>
          <span className="meta-value">{CURRENT_REGION.currencyCode} (${CURRENT_REGION.currencySymbol})</span>
        </div>

        <div 
          className={`meta-pill status-pill ${!isOnline ? 'clickable' : ''}`}
          onClick={!isOnline && onRetryStatus ? onRetryStatus : undefined}
          title={!isOnline ? "Click to retry backend connection" : "FastAPI server operational"}
        >
          <span className={`status-indicator-dot ${isOnline ? 'active' : isConnecting ? 'warn' : 'error'}`} />
          <span className="meta-value">
            {isOnline ? 'API Operational' : isConnecting ? 'Connecting...' : 'API Disconnected (Click to Retry)'}
          </span>
          {!isOnline && <RefreshCw size={11} className="ml-1 text-muted" />}
        </div>
      </div>

      <style>{`
        .mode-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 42px;
          border-bottom: 1px solid var(--border-forest);
          background: #FFFFFF;
          position: sticky;
          top: 0;
          z-index: 40;
          gap: 16px;
        }
        .header-titles {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .header-title {
          font-size: 26px;
          font-family: var(--font-display);
          color: var(--text-dark);
          line-height: 1.15;
          letter-spacing: -0.015em;
        }
        .header-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          font-family: var(--font-body);
        }
        .header-metadata {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .meta-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #F5F3E9;
          border: 1px solid rgba(7, 61, 46, 0.14);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 12px;
          color: var(--text-charcoal);
        }
        .meta-pill.pill-highlight {
          background: #E8F0E5;
          border-color: rgba(7, 61, 46, 0.22);
        }
        .meta-pill.clickable {
          cursor: pointer;
          background: #FEF3C7;
          border-color: #FDE68A;
        }
        .meta-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .meta-value {
          color: var(--text-dark);
          font-weight: 600;
        }
        .status-indicator-dot {
          width: 7.5px;
          height: 7.5px;
          border-radius: 50%;
        }
        .status-indicator-dot.active {
          background: #073D2E;
          box-shadow: 0 0 0 2px #C7F36B;
        }
        .status-indicator-dot.warn {
          background: #F59E0B;
        }
        .status-indicator-dot.error {
          background: #DC2626;
        }

        @media (max-width: 900px) {
          .mode-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px 20px;
          }
        }
      `}</style>
    </header>
  );
};
