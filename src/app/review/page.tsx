'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';

interface TransactionData {
  amount: string;
  savings: string;
  recipientAmount: string;
  xrpAmount: string;
  snapshot: {
    input: {
      usdAmount: number;
      recipientPhone: string;
      xrpRate: number;
      country: string;
      senderName: string;
      senderEmail: string;
      recipientName: string;
      addToVault: boolean;
    };
    calculation: {
      xrpAmount: number;
      fixedFeeUSD: number;
      westernUnionFee: number;
      savings: number;
      recipientAmount: number;
    };
    ledgerTime: string;
    fxSource: string;
  };
}

export default function ReviewPage(): React.JSX.Element {
  const router = useRouter();
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem('transactionData');
    if (storedData) {
      setTransactionData(JSON.parse(storedData));
    } else {
      router.push('/remittance');
    }
  }, [router]);

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate processing
    setTimeout(() => {
      router.push('/processing');
    }, 1000);
  };

  const handleBack = () => {
    router.push('/remittance');
  };

  if (!transactionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <a href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <a href="/remittance" className="ml-4 text-gray-500 hover:text-gray-700">
                  Send Money
                </a>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-4 text-sm font-medium text-gray-500">Review</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Review Your Transaction</h2>
            <p className="text-gray-600">Please review the details below before confirming your payment</p>
          </div>

          {/* Transaction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Sender Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sender Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{transactionData.snapshot.input.senderName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{transactionData.snapshot.input.senderEmail}</p>
                </div>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipient Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{transactionData.snapshot.input.recipientName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium">{transactionData.snapshot.input.recipientPhone}</p>
                </div>
                <div>
                  <span className="text-gray-600">Country:</span>
                  <p className="font-medium">{transactionData.snapshot.input.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount to Send:</span>
                  <span className="font-semibold text-green-600">${transactionData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recipient Gets:</span>
                  <span className="font-semibold text-blue-600">KES {transactionData.recipientAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">XRP Amount:</span>
                  <span className="font-semibold text-orange-600">{transactionData.xrpAmount} XRP</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee:</span>
                  <span className="font-medium">${transactionData.snapshot.calculation.fixedFeeUSD}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Fee:</span>
                  <span className="font-medium">~$0.0002</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-gray-900">${(parseFloat(transactionData.amount) + transactionData.snapshot.calculation.fixedFeeUSD).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Comparison */}
          <div className="bg-green-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 mb-2">Western Union Fee:</p>
                <p className="text-2xl font-bold text-red-600">${transactionData.snapshot.calculation.westernUnionFee}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-2">XRP Remittance Fee:</p>
                <p className="text-2xl font-bold text-green-600">${transactionData.snapshot.calculation.fixedFeeUSD}</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-center text-lg font-semibold text-green-700">
                You save ${transactionData.savings} compared to Western Union!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBack}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Back to Edit
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Confirm & Pay'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 