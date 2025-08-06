'use client';

import { useXRP } from '@/contexts/XRPContext';

export function Header(): React.JSX.Element {
  const { xrpData, refreshData } = useXRP();

  const formatLastUpdated = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">XRP Remittance</h1>
              <p className="text-sm text-gray-600">Cross-border payments via XRP Ledger</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* XRP Price */}
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-600">XRP Price</p>
                {xrpData.isLoading && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                )}
              </div>
              <p className="text-lg font-semibold text-green-600">
                ${xrpData.price.toFixed(2)}
              </p>
            </div>
            
            {/* USD/KES Rate */}
            <div className="text-right">
              <p className="text-sm text-gray-600">USD/KES</p>
              <p className="text-lg font-semibold text-blue-600">
                1:{xrpData.usdKesRate.toFixed(2)}
              </p>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={refreshData}
              disabled={xrpData.isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              title="Refresh rates"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {xrpData.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{xrpData.error}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 