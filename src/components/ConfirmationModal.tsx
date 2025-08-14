'use client';

import { useState, useEffect } from 'react';

interface ConfirmationModalProps {
  transactionData: any;
  onClose: () => void;
}

export function ConfirmationModal({ transactionData, onClose }: ConfirmationModalProps) {
  const [ledgerTime, setLedgerTime] = useState<string>('');

  useEffect(() => {
    // Simulate ledger close time
    const now = new Date();
    const ledgerClose = new Date(now.getTime() + 3000); // 3 seconds from now
    setLedgerTime(ledgerClose.toLocaleTimeString('en-US', { 
      timeZone: 'UTC',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30  flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-50 p-6 rounded-t-lg">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-800 text-center mb-2">
            Transaction Successful!
          </h2>
          <p className="text-green-700 text-center">
            Your money has been sent successfully
          </p>
        </div>

        {/* Transaction Details */}
        <div className="p-6 space-y-4">
          {/* Main Confirmation Message */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-lg font-semibold text-blue-900 text-center">
              ${transactionData.amounts.usd.toFixed(2)} sent.
            </p>
            <p className="text-green-600 font-semibold text-center">
              ${transactionData.fees.savings.toFixed(2)} saved compared to Western Union.
            </p>
          </div>

          {/* Transaction ID */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Transaction ID:</p>
            <p className="font-mono text-sm text-gray-900">{transactionData.id}</p>
          </div>

          {/* Ledger Information */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Ledger Closed:</p>
            <p className="font-mono text-sm text-gray-900">{ledgerTime} UTC</p>
          </div>

          {/* Recipient Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Recipient Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-600">Name:</span> {transactionData.receiver.name}</p>
              <p><span className="text-gray-600">Phone:</span> {transactionData.receiver.phone}</p>
              <p><span className="text-gray-600">Country:</span> {transactionData.receiver.country.name}</p>
            </div>
          </div>

          {/* Amount Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Amount Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">USD Amount:</span>
                <span className="font-medium">${transactionData.amounts.usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">XRP Amount:</span>
                <span className="font-medium">{transactionData.amounts.xrp.toFixed(2)} XRP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Local Amount:</span>
                <span className="font-medium">
                  {formatCurrency(transactionData.amounts.local, transactionData.amounts.localCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Fee Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span className="font-medium">{transactionData.fees.platformFee} USD</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total Savings:</span>
                <span className="font-medium">${transactionData.fees.savings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Vault Information */}
          {transactionData.vault.enabled && (
            <div className="border-t pt-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-semibold text-green-800">Savings Vault</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  ${transactionData.vault.amount} added to your savings vault
                </p>
              </div>
            </div>
          )}

          {/* FX Rate Information */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Exchange Rate</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">USD to XRP:</span>
                <span className="font-medium">1 USD = {transactionData.fxRate.usdToXrp.toFixed(4)} XRP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">USD to {transactionData.amounts.localCurrency}:</span>
                <span className="font-medium">1 USD = {transactionData.fxRate.usdToLocal} {transactionData.amounts.localCurrency}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Source: {transactionData.fxRate.source}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
            <button
              onClick={() => window.location.href = '/history'}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
