'use client';

import { useState } from 'react';

interface TransactionInput {
  usdAmount: number;
  recipientPhone: string;
  xrpRate: number;
  country: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  addToVault: boolean;
}

interface TransactionCalculation {
  xrpAmount: number;
  fixedFeeUSD: number;
  westernUnionFee: number;
  savings: number;
  recipientAmount: number;
}

interface TransactionSnapshot {
  input: TransactionInput;
  calculation: TransactionCalculation;
  ledgerTime: string;
  fxSource: string;
}

interface Transaction {
  id: number;
  timestamp: string;
  amount: string;
  savings: string;
  recipientAmount: string;
  xrpAmount: string;
  snapshot: TransactionSnapshot;
}

interface TransactionLogProps {
  transactions: Transaction[];
}

export function TransactionLog({ transactions }: TransactionLogProps): React.JSX.Element {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTransactionClick = (transaction: Transaction): void => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  };

  const handleCloseModal = (): void => {
    setShowDetails(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Log</h3>
        <span className="text-sm text-gray-500">{transactions.length} transactions</span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No transactions yet</p>
          <p className="text-xs text-gray-400">Complete a transfer to see transaction history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction: Transaction) => (
            <div
              key={transaction.id}
              onClick={() => handleTransactionClick(transaction)}
              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    ${transaction.amount} → {transaction.snapshot.input.recipientPhone}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(transaction.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    +${transaction.savings} saved
                  </p>
                  <p className="text-xs text-gray-500">
                    {transaction.snapshot.calculation.xrpAmount.toFixed(2)} XRP
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Transaction Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">${selectedTransaction.amount} USD</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Recipient:</span>
                    <span className="ml-2 font-medium">{selectedTransaction.snapshot.input.recipientName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{selectedTransaction.snapshot.input.recipientPhone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Country:</span>
                    <span className="ml-2 font-medium">{selectedTransaction.snapshot.input.country}</span>
                  </div>
                </div>
              </div>

              {/* Input Snapshot */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Input Snapshot</h4>
                <div className="space-y-1 text-xs text-blue-800">
                  <div className="flex justify-between">
                    <span>Sender Name:</span>
                    <span>{selectedTransaction.snapshot.input.senderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sender Email:</span>
                    <span>{selectedTransaction.snapshot.input.senderEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>XRP Rate Used:</span>
                    <span>${selectedTransaction.snapshot.input.xrpRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vault Addition:</span>
                    <span>{selectedTransaction.snapshot.input.addToVault ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Calculation Details */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Calculation Details</h4>
                <div className="space-y-1 text-xs text-green-800">
                  <div className="flex justify-between">
                    <span>XRP Amount:</span>
                    <span>{selectedTransaction.snapshot.calculation.xrpAmount.toFixed(2)} XRP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fixed Fee:</span>
                    <span>${selectedTransaction.snapshot.calculation.fixedFeeUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Western Union Fee:</span>
                    <span>${selectedTransaction.snapshot.calculation.westernUnionFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Savings:</span>
                    <span>${selectedTransaction.snapshot.calculation.savings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipient Amount:</span>
                    <span>KES {selectedTransaction.snapshot.calculation.recipientAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">System Information</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Ledger Time:</span>
                    <span>{new Date(selectedTransaction.snapshot.ledgerTime).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FX Source:</span>
                    <span>{selectedTransaction.snapshot.fxSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction ID:</span>
                    <span className="font-mono">{selectedTransaction.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 