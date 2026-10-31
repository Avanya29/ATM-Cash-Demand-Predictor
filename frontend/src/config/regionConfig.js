/**
 * frontend/src/config/regionConfig.js
 * 
 * Region and Currency Presentation Configuration
 * 
 * Designed for future international expansion (e.g., India-readiness with INR)
 * while preserving the authentic geographical origin and currency of the current dataset.
 * 
 * Current Dataset Origin:
 *   - Provider: Spar Nord Bank ATM Network (Denmark)
 *   - Dataset Currency: USD ($)
 *   - Horizon: 2011-01-15 to 2017-09-29
 * 
 * Future Target Regions:
 *   - India (INR, ₹): Supports Indian metropolitan ATM networks with lakh/crore grouping
 *     when Indian transaction telemetry is connected.
 */

export const SUPPORTED_REGIONS = {
  SPAR_NORD_USD: {
    id: 'SPAR_NORD_USD',
    name: 'Metropolitan Fleet (Spar Nord Dataset)',
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    datasetOrigin: 'Spar Nord Bank Network, Denmark (Normalized to USD)',
    isDatasetActive: true,
    isFutureReady: false,
    formatAmount: (val, options = {}) => {
      const num = Number(val);
      if (isNaN(num)) return '—';
      const decimals = options.decimals !== undefined ? options.decimals : 2;
      return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    formatCompact: (val) => {
      const num = Number(val);
      if (isNaN(num)) return '—';
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
      return `$${num.toFixed(0)}`;
    }
  },

  INDIA_INR: {
    id: 'INDIA_INR',
    name: 'India Regional Fleet (Future Ready)',
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    datasetOrigin: 'Configured for RBI-compliant Indian ATM telemetry feeds (Pending Dataset Integration)',
    isDatasetActive: false,
    isFutureReady: true,
    formatAmount: (val, options = {}) => {
      const num = Number(val);
      if (isNaN(num)) return '—';
      const decimals = options.decimals !== undefined ? options.decimals : 2;
      return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    formatCompact: (val) => {
      const num = Number(val);
      if (isNaN(num)) return '—';
      if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
      if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
      return `₹${num.toFixed(0)}`;
    }
  }
};

// Current active presentation profile matches actual dataset
export const CURRENT_REGION = SUPPORTED_REGIONS.SPAR_NORD_USD;

export function formatCurrency(amount, decimals = 2) {
  return CURRENT_REGION.formatAmount(amount, { decimals });
}

export function formatCompactCurrency(amount) {
  return CURRENT_REGION.formatCompact(amount);
}
