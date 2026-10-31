import React, { useState } from 'react';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Cpu, 
  Menu, 
  X,
  Globe2,
  Sparkles,
  Zap
} from 'lucide-react';
import { CURRENT_REGION } from '../config/regionConfig';

export const NavigationRail = ({ activeView, setActiveView, modelInfo, backendHealthy, connectionStatus = 'connecting' }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      id: 'overview',
      label: 'Intelligence Overview',
      shortLabel: 'Overview',
      icon: Activity,
      description: 'Fleet metrics & 3D hero',
    },
    {
      id: 'forecast',
      label: 'Forecast Studio',
      shortLabel: 'Forecast',
      icon: Target,
      badge: 'Interactive',
      description: 'Daily demand inference',
    },
    {
      id: 'explorer',
      label: 'Demand Explorer',
      shortLabel: 'Explorer',
      icon: TrendingUp,
      description: 'Trends & seasonality',
    },
    {
      id: 'observatory',
      label: 'Model Observatory',
      shortLabel: 'Observatory',
      icon: Cpu,
      description: 'Empirical benchmarking',
    },
  ];

  const isOnline = backendHealthy || connectionStatus === 'online';
  const isConnecting = !isOnline && connectionStatus === 'connecting';

  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="mobile-header">
        <div className="logo-group">
          <ModeLogoMark />
          <div>
            <div className="logo-title">ATM CASH DEMAND PREDICTOR</div>
            <div className="logo-sub">Financial Intelligence Platform</div>
          </div>
        </div>
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Rail */}
      <aside className={`nav-rail ${mobileOpen ? 'open' : ''}`}>
        <div className="nav-brand">
          <div className="logo-container">
            <ModeLogoMark />
            <div className="brand-text">
              <span className="brand-name">ATM CASH DEMAND</span>
              <span className="brand-descriptor">PREDICTOR // FINTECH AI</span>
            </div>
          </div>
        </div>

        <nav className="nav-menu" aria-label="Platform Modules">
          <div className="nav-section-title">PLATFORM MODULES</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                type="button"
                key={item.id}
                id={`nav-item-${item.id}`}
                data-nav-id={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="nav-item-icon-wrapper">
                  <Icon size={18} />
                </div>
                <div className="nav-item-text">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-desc">{item.description}</span>
                </div>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
                {isActive && <div className="nav-active-pill" />}
              </button>
            );
          })}
        </nav>

        {/* System & Telemetry Status Footer */}
        <div className="nav-footer">
          <div className="system-status-box">
            <div className="status-top-row">
              <div className="status-indicator-group">
                <span className={`status-dot ${isOnline ? 'online' : isConnecting ? 'connecting' : 'offline'}`} />
                <span className="status-label-text">
                  {isOnline ? 'API Operational' : isConnecting ? 'Connecting...' : 'API Disconnected'}
                </span>
              </div>
              <span className="version-tag font-mono">v2.0-mode</span>
            </div>

            <div className="status-detail-row">
              <Cpu size={12} className="text-lime flex-shrink-0" />
              <span className="status-detail-text">
                Model: <strong>{modelInfo?.model_name || 'Random Forest'}</strong>
              </span>
            </div>

            <div className="status-detail-row">
              <Globe2 size={12} className="text-lime flex-shrink-0" />
              <span className="status-detail-text">
                Region: <strong>{CURRENT_REGION.currencyCode} (${CURRENT_REGION.currencySymbol})</strong>
              </span>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #073D2E;
          color: #F5F3E9;
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(199, 243, 107, 0.2);
        }
        .logo-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-title {
          font-weight: 700;
          font-size: 13.5px;
          letter-spacing: 0.02em;
          color: #FFFFFF;
        }
        .logo-sub {
          font-size: 11px;
          color: #C7F36B;
        }
        .mobile-toggle-btn {
          background: #064B36;
          border: 1px solid rgba(199, 243, 107, 0.3);
          color: #C7F36B;
          padding: 6px;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .mobile-backdrop {
          display: none;
        }

        .nav-rail {
          width: 270px;
          background: #073D2E;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          min-height: 100vh;
          position: sticky;
          top: 0;
          border-right: 1px solid rgba(199, 243, 107, 0.15);
        }

        .nav-brand {
          padding: 26px 22px 22px;
          border-bottom: 1px solid rgba(199, 243, 107, 0.12);
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #FFFFFF;
          line-height: 1.2;
        }
        .brand-descriptor {
          font-size: 10px;
          color: #C7F36B;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-top: 3px;
        }

        .nav-menu {
          padding: 24px 14px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nav-section-title {
          font-size: 10px;
          font-weight: 800;
          color: #A3BFB1;
          letter-spacing: 0.1em;
          padding: 4px 12px 10px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          color: #E8F0E5;
          cursor: pointer;
          text-align: left;
          width: 100%;
          position: relative;
          transition: all var(--transition-fast);
          user-select: none;
        }
        .nav-item:hover {
          background: rgba(232, 240, 229, 0.08);
          color: #FFFFFF;
        }
        .nav-item.active {
          background: #C7F36B;
          color: #073D2E;
          font-weight: 700;
        }

        .nav-item-icon-wrapper {
          color: #A3BFB1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition-fast);
        }
        .nav-item:hover .nav-item-icon-wrapper {
          color: #C7F36B;
        }
        .nav-item.active .nav-item-icon-wrapper {
          color: #073D2E;
        }

        .nav-item-text {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .nav-item-label {
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.25;
        }
        .nav-item-desc {
          font-size: 11px;
          color: #A3BFB1;
          margin-top: 2px;
        }
        .nav-item.active .nav-item-desc {
          color: rgba(7, 61, 46, 0.8);
        }

        .nav-item-badge {
          background: rgba(199, 243, 107, 0.2);
          color: #C7F36B;
          border: 1px solid #C7F36B;
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }
        .nav-item.active .nav-item-badge {
          background: #073D2E;
          color: #C7F36B;
          border-color: #073D2E;
        }

        .nav-footer {
          padding: 16px;
          border-top: 1px solid rgba(199, 243, 107, 0.12);
        }
        .system-status-box {
          background: #064B36;
          border: 1px solid rgba(199, 243, 107, 0.2);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .status-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .status-indicator-group {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 600;
          color: #FFFFFF;
        }
        .status-dot {
          width: 7.5px;
          height: 7.5px;
          border-radius: 50%;
        }
        .status-dot.online {
          background: #C7F36B;
          box-shadow: 0 0 8px #C7F36B;
        }
        .status-dot.connecting {
          background: #F59E0B;
          box-shadow: 0 0 6px #F59E0B;
        }
        .status-dot.offline {
          background: #EF4444;
        }
        .version-tag {
          font-size: 9.5px;
          color: #C7F36B;
          background: rgba(199, 243, 107, 0.12);
          padding: 1px 6px;
          border-radius: 4px;
        }
        .status-detail-row {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          color: #E8F0E5;
        }
        .status-detail-text strong {
          color: #FFFFFF;
        }

        @media (max-width: 768px) {
          .mobile-header { display: flex; }
          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(7, 61, 46, 0.6);
            backdrop-filter: blur(4px);
            z-index: 99;
          }
          .nav-rail {
            position: fixed;
            top: 0;
            left: -290px;
            bottom: 0;
            z-index: 100;
            transition: left var(--transition-smooth);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }
          .nav-rail.open {
            left: 0;
          }
        }
      `}</style>
    </>
  );
};

// Mode-Inspired Creative Logo Mark
const ModeLogoMark = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="10" fill="#064B36" stroke="#C7F36B" strokeWidth="1.5" />
    <path 
      d="M7 23C10 23 12 17 16 17C20 17 22 10 25 8" 
      stroke="#C7F36B" 
      strokeWidth="2.8" 
      strokeLinecap="round" 
    />
    <path 
      d="M16 17C18 17 19 22 24 22" 
      stroke="#D3F47A" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeDasharray="2 3"
    />
    <circle cx="25" cy="8" r="2.8" fill="#C7F36B" />
    <circle cx="24" cy="22" r="2.2" fill="#D3F47A" />
  </svg>
);
