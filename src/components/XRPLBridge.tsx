'use client';

import { useState, useEffect } from 'react';

type ConnectionStatus = 'connected' | 'disconnected';
type LedgerStatus = 'active' | 'inactive';

interface NetworkStats {
  currentFee: string;
  avgCloseTime: string;
  validators: string;
}

interface RecentActivity {
  lastTransaction: string;
  totalVolume: string;
  successRate: string;
}

export function XRPLBridge(): React.JSX.Element {
  const [ledgerTime, setLedgerTime] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastLedgerClose, setLastLedgerClose] = useState<string>('');

  useEffect(() => {
    // Simulate ledger close time updates
    const updateLedgerTime = (): void => {
      const now: Date = new Date();
      const formattedTime: string = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      setLedgerTime(formattedTime);
      setLastLedgerClose(formattedTime);
    };

    updateLedgerTime();
    const interval: NodeJS.Timeout = setInterval(updateLedgerTime, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const networkStats: NetworkStats = {
    currentFee: '0.25 XRP',
    avgCloseTime: '3.5 seconds',
    validators: '35+ trusted'
  };

  const recentActivity: RecentActivity = {
    lastTransaction: '2 minutes ago',
    totalVolume: '$12,450 USD',
    successRate: '99.8%'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">XRP Ledger Bridge</h3>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Ledger Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Ledger Closed:</span>
          <span className="text-sm font-mono text-gray-900">{ledgerTime}</span>
        </div>

        {/* FX Rate Source */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">FX Source:</span>
          <span className="text-sm text-gray-900">Central Bank of Kenya</span>
        </div>

        {/* Network Stats */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Network Statistics</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Current Fee:</span>
              <span>{networkStats.currentFee}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg. Close Time:</span>
              <span>{networkStats.avgCloseTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Validators:</span>
              <span>{networkStats.validators}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Recent Activity</h4>
          <div className="space-y-1 text-xs text-blue-800">
            <div className="flex justify-between">
              <span>Last Transaction:</span>
              <span>{recentActivity.lastTransaction}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Volume:</span>
              <span>{recentActivity.totalVolume}</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span>{recentActivity.successRate}</span>
            </div>
          </div>
        </div>

        {/* Bridge Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• USD → XRP conversion at market rate</p>
          <p>• Fixed 0.25 XRP network fee</p>
          <p>• Real-time settlement confirmation</p>
          <p>• Central Bank of Kenya reference rates</p>
        </div>
      </div>
    </div>
  );
} 