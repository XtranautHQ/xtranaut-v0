'use client';

import { useState, useEffect } from 'react';

type ApiStatus = 'idle' | 'processing' | 'success' | 'error';

interface ApiInfo {
  environment: string;
  version: string;
  authentication: string;
}

interface TransactionStats {
  successRate: string;
  avgResponse: string;
  last24h: string;
}

interface FailureScenario {
  invalidPhone: string;
  insufficientFunds: string;
  networkTimeout: string;
}

interface RecentActivityItem {
  phone: string;
  amount: string;
  status: 'success' | 'failed';
}

export function MpesaIntegration(): React.JSX.Element {
  const [status, setStatus] = useState<ApiStatus>('idle');
  const [lastTransaction, setLastTransaction] = useState<RecentActivityItem | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);

  useEffect(() => {
    // Simulate periodic status updates
    const interval: NodeJS.Timeout = setInterval(() => {
      const statuses: ApiStatus[] = ['idle', 'processing', 'success', 'error'];
      const randomStatus: ApiStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setStatus(randomStatus);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ApiStatus): string => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: ApiStatus): React.JSX.Element => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-5 h-5 text-yellow-500 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const apiInfo: ApiInfo = {
    environment: 'Sandbox',
    version: 'v1',
    authentication: 'OAuth 2.0'
  };

  const transactionStats: TransactionStats = {
    successRate: '98.5%',
    avgResponse: '1.2s',
    last24h: '1,247 transactions'
  };

  const failureScenarios: FailureScenario = {
    invalidPhone: 'Simulated',
    insufficientFunds: 'Simulated',
    networkTimeout: 'Handled'
  };

  const recentActivity: RecentActivityItem[] = [
    { phone: '+254 700 123 456', amount: 'KES 15,845', status: 'success' },
    { phone: '+254 711 789 012', amount: 'KES 7,922', status: 'success' },
    { phone: '+254 000 000 000', amount: 'Failed', status: 'failed' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">M-PESA Integration</h3>
        <div className="flex items-center space-x-2">
          {getStatusIcon(status)}
          <span className={`text-sm font-medium ${getStatusColor(status)}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* API Status */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Daraja Sandbox API</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="text-orange-600">{apiInfo.environment}</span>
            </div>
            <div className="flex justify-between">
              <span>API Version:</span>
              <span>{apiInfo.version}</span>
            </div>
            <div className="flex justify-between">
              <span>Authentication:</span>
              <span className="text-green-600">{apiInfo.authentication}</span>
            </div>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Transaction Statistics</h4>
          <div className="space-y-1 text-xs text-blue-800">
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span>{transactionStats.successRate}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg. Response:</span>
              <span>{transactionStats.avgResponse}</span>
            </div>
            <div className="flex justify-between">
              <span>Last 24h:</span>
              <span>{transactionStats.last24h}</span>
            </div>
          </div>
        </div>

        {/* Failure Simulation */}
        <div className="bg-red-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-900 mb-2">Failure Scenarios</h4>
          <div className="space-y-1 text-xs text-red-800">
            <div className="flex justify-between">
              <span>Invalid Phone:</span>
              <span>{failureScenarios.invalidPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>Insufficient Funds:</span>
              <span>{failureScenarios.insufficientFunds}</span>
            </div>
            <div className="flex justify-between">
              <span>Network Timeout:</span>
              <span>{failureScenarios.networkTimeout}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
          <div className="space-y-1 text-xs">
            {recentActivity.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{item.phone}</span>
                <span className={item.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• STK Push integration</p>
          <p>• Real-time status updates</p>
          <p>• Automatic retry logic</p>
          <p>• Comprehensive error handling</p>
        </div>
      </div>
    </div>
  );
} 