import React, { useState, useEffect } from 'react';
import { NavigationRail } from './components/NavigationRail';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { ForecastStudioView } from './views/ForecastStudioView';
import { DemandExplorerView } from './views/DemandExplorerView';
import { ModelObservatoryView } from './views/ModelObservatoryView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api } from './api/client';

export default function App() {
  const [activeView, setActiveView] = useState('overview');
  const [selectedAtm, setSelectedAtm] = useState('Mount Road ATM');
  const [modelInfo, setModelInfo] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'online' | 'offline'

  const checkStatus = async () => {
    try {
      setConnectionStatus('connecting');
      const [healthRes, infoRes] = await Promise.all([
        api.getHealth(),
        api.getModelInfo()
      ]);
      const isHealthy = healthRes?.status === 'healthy' || healthRes?.status === 'ok';
      setBackendHealthy(isHealthy);
      setConnectionStatus(isHealthy ? 'online' : 'offline');
      if (infoRes) setModelInfo(infoRes);
    } catch (err) {
      console.warn('Backend connection warning:', err.message);
      setBackendHealthy(false);
      setConnectionStatus('offline');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleNavigateToForecast = (atmName) => {
    if (atmName) {
      setSelectedAtm(atmName);
    }
    setActiveView('forecast');
  };

  const handleNavigateToObservatory = () => {
    setActiveView('observatory');
  };

  const getViewDetails = () => {
    switch (activeView) {
      case 'overview':
        return {
          title: 'Intelligence Overview',
          subtitle: 'Fleet status, transaction history coverage, and cash demand metrics across 5 metropolitan terminals'
        };
      case 'forecast':
        return {
          title: 'Forecast Studio',
          subtitle: 'Daily ATM cash withdrawal demand inference with lookback validation'
        };
      case 'explorer':
        return {
          title: 'Demand Explorer',
          subtitle: 'Multi-terminal historical demand trends and weekday seasonality patterns'
        };
      case 'observatory':
        return {
          title: 'Model Observatory',
          subtitle: 'Empirical model benchmarking: Common Calendar validation vs test, 4-fold expanding-window cross-validation, and shock resilience'
        };
      default:
        return {
          title: 'Intelligence Overview',
          subtitle: 'Fleet status and transaction history coverage'
        };
    }
  };

  const viewDetails = getViewDetails();

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <OverviewView 
            onNavigateToForecast={handleNavigateToForecast} 
            onNavigateToObservatory={handleNavigateToObservatory}
          />
        );
      case 'forecast':
        return <ForecastStudioView initialAtm={selectedAtm} />;
      case 'explorer':
        return <DemandExplorerView />;
      case 'observatory':
        return <ModelObservatoryView />;
      default:
        return (
          <OverviewView 
            onNavigateToForecast={handleNavigateToForecast} 
            onNavigateToObservatory={handleNavigateToObservatory}
          />
        );
    }
  };

  return (
    <div className="app-layout">
      <NavigationRail 
        activeView={activeView} 
        setActiveView={setActiveView} 
        modelInfo={modelInfo}
        backendHealthy={backendHealthy}
        connectionStatus={connectionStatus}
      />

      <div className="main-content">
        <Header 
          title={viewDetails.title}
          subtitle={viewDetails.subtitle}
          modelInfo={modelInfo} 
          backendHealthy={backendHealthy} 
          connectionStatus={connectionStatus}
          onRetryStatus={checkStatus}
        />

        <main className="view-viewport">
          <ErrorBoundary onReset={() => setActiveView('overview')}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
