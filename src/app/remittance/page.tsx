'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RemittanceForm } from '@/components/RemittanceForm';
import { XRPLBridge } from '@/components/XRPLBridge';
import { MpesaIntegration } from '@/components/MpesaIntegration';
import { Header } from '@/components/Header';
import { TransactionService, TransactionData } from '@/services/transactionService';

export default function RemittancePage(): React.JSX.Element {
  const router = useRouter();
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const handleTransaction = async (data: TransactionData): Promise<void> => {
    setIsSaving(true);
    setError('');
    
    try {
      // Save transaction to MongoDB
      const result = await TransactionService.saveTransaction(data);
      
      if (result.success) {
        setTransactionData(data);
        // Store transaction ID in sessionStorage for the next page
        sessionStorage.setItem('transactionId', result.transactionId || '');
        sessionStorage.setItem('transactionData', JSON.stringify(data));
        router.push('/review');
      } else {
        setError('Failed to save transaction. Please try again.');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError('Failed to save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
                <span className="ml-4 text-sm font-medium text-gray-500">Send Money</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Remittance Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Money</h2>
                <p className="text-gray-600">Fill in the details below to send money via XRP Ledger</p>
              </div>
              
              <RemittanceForm 
                onTransaction={handleTransaction} 
                isSaving={isSaving}
                error={error}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <XRPLBridge />
            <MpesaIntegration />
            
            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="font-medium text-green-600">3-5 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Fee:</span>
                  <span className="font-medium text-blue-600">~$0.0002</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee:</span>
                  <span className="font-medium text-blue-600">$2.99</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Supported Countries:</span>
                  <span className="font-medium text-purple-600">150+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 