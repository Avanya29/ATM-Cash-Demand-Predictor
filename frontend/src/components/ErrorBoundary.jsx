import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Runtime Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-card">
          <div className="error-boundary-icon">
            <AlertTriangle size={32} />
          </div>
          <h3 className="error-boundary-title">Module Rendering Notice</h3>
          <p className="error-boundary-desc">
            An issue occurred while loading this view. You can reload this view or switch to another module.
          </p>
          <div className="error-boundary-message">
            {this.state.error?.message || 'Unknown view state error'}
          </div>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={this.handleReset}
          >
            <RefreshCw size={15} />
            Reload Module View
          </button>

          <style>{`
            .error-boundary-card {
              background: var(--bg-surface);
              border: 1px solid var(--border-subtle);
              border-radius: var(--radius-lg);
              padding: 40px 28px;
              text-align: center;
              max-width: 560px;
              margin: 40px auto;
              box-shadow: var(--shadow-sm);
            }
            .error-boundary-icon {
              color: var(--accent-amber);
              margin-bottom: 16px;
              display: flex;
              justify-content: center;
            }
            .error-boundary-title {
              font-size: 18px;
              font-weight: 700;
              color: var(--text-primary);
              margin-bottom: 8px;
            }
            .error-boundary-desc {
              font-size: 13px;
              color: var(--text-secondary);
              line-height: 1.5;
              margin-bottom: 16px;
            }
            .error-boundary-message {
              font-family: var(--font-mono);
              font-size: 11.5px;
              background: var(--bg-subtle);
              border: 1px solid var(--border-subtle);
              padding: 10px 14px;
              border-radius: var(--radius-sm);
              color: var(--accent-rose);
              margin-bottom: 24px;
              word-break: break-all;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
