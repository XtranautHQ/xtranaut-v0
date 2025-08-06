'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function SuccessPage(): React.JSX.Element {
  const router = useRouter();
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');

  useEffect(() => {
    const storedData = sessionStorage.getItem('transactionData');
    if (storedData) {
      setTransactionData(JSON.parse(storedData));
      // Generate a transaction ID
      setTransactionId(`TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
    } else {
      router.push('/');
    }
  }, [router]);

  const handleSendAnother = () => {
    sessionStorage.removeItem('transactionData');
    router.push('/remittance');
  };

  const handleViewHistory = () => {
    router.push('/history');
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-xl text-gray-600 mb-2">Your money has been sent successfully</p>
          <p className="text-gray-500">Transaction ID: {transactionId}</p>
        </div>

        {/* Transaction Summary */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Sent:</span>
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee:</span>
                  <span className="font-medium">${transactionData.snapshot.calculation.fixedFeeUSD}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-gray-900">${(parseFloat(transactionData.amount) + transactionData.snapshot.calculation.fixedFeeUSD).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-4">
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
                <div>
                  <span className="text-gray-600">Delivery Method:</span>
                  <p className="font-medium text-blue-600">M-Pesa Mobile Money</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Highlight */}
        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Congratulations!</h3>
            <p className="text-green-700 text-lg">
              You saved <span className="font-bold">${transactionData.savings}</span> compared to Western Union
            </p>
            <p className="text-green-600 text-sm mt-2">
              That's a {Math.round((parseFloat(transactionData.savings) / transactionData.snapshot.calculation.westernUnionFee) * 100)}% savings!
            </p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What Happens Next?</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <p className="text-gray-700">Your recipient will receive an SMS notification within 1-2 minutes</p>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <p className="text-gray-700">The money will be available in their M-Pesa account immediately</p>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <p className="text-gray-700">You'll receive a confirmation email with transaction details</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleSendAnother}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Send Another Payment
          </button>
          <button
            onClick={handleViewHistory}
            className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg border-2 border-blue-600 transition-colors duration-200"
          >
            View Transaction History
          </button>
          <Link
            href="/"
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 text-center"
          >
            Back to Home
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">Need help? Contact our support team</p>
          <p className="text-blue-600 font-medium">support@xrpremittance.com</p>
        </div>
      </main>
    </div>
  );
} 