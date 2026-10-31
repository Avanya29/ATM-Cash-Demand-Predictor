import React from 'react';

export const MetricCard = ({ title, value, unit, subtitle, badge, badgeType = 'teal', icon: Icon }) => {
  return (
    <div className="fintech-card metric-card">
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-box">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="metric-body">
        <div className="metric-value-row">
          <span className="metric-value tabular-nums">{value}</span>
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
      </div>

      <div className="metric-footer">
        {subtitle && <span className="metric-sub">{subtitle}</span>}
        {badge && (
          <span className={`pill pill-${badgeType}`}>
            {badge}
          </span>
        )}
      </div>

      <style>{`
        .metric-card {
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #FFFFFF;
        }
        .metric-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .metric-title {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .metric-icon-box {
          color: var(--text-tertiary);
          background: #F8FAFC;
          padding: 6px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .metric-value-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .metric-value {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .metric-unit {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-tertiary);
        }
        .metric-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          font-size: 11.5px;
          gap: 8px;
        }
        .metric-sub {
          color: var(--text-tertiary);
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
};
