'use client';

import { Suspense } from 'react';
import { TransferStepper } from '@/components/TransferStepper';
import { ConfirmationModal } from '@/components/ConfirmationModal';

export default function TransferStatusPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransferStatusPageContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-semibold mb-2">Processing your payment...</h1>
        <p className="text-gray-600 mb-4">Please wait while we confirm your payment and start the transfer.</p>
      </div>
    </div>
  );
}


import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function TransferStatusPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('session_id');
  const [transactionId, setTransactionId] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll for transaction creation from Stripe webhook
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const pollForTransaction = async () => {
      try {
        const response = await fetch(`/api/remittance/status/by-session/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setTransactionId(data.transactionId);
          setIsLoading(false);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error polling for transaction:', error);
        return false;
      }
    };

    const startPolling = () => {
      pollForTransaction().then((found) => {
        if (found) return;
        
        // Poll every 2 seconds for up to 2 minutes
        pollInterval = setInterval(async () => {
          const found = await pollForTransaction();
          if (found) {
            clearInterval(pollInterval);
            clearTimeout(timeout);
          }
        }, 2000);

        timeout = setTimeout(() => {
          clearInterval(pollInterval);
          setError('Transaction not found. Please contact support.');
          setIsLoading(false);
        }, 120000);
      });
    };

    startPolling();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeout) clearTimeout(timeout);
    };
  }, [sessionId]);

  const handleComplete = (transactionData: any) => {
    const data = sessionStorage.getItem('remittance_request');
    const initTx = data ? JSON.parse(data) : {};

    const finalTransactionData = {
      id: transactionData.transactionId,
      timestamp: transactionData.createdAt,
      ledgerCloseTime: transactionData.updatedAt,
      ...initTx,
      status: 'completed',
    };

    setTransactionData(finalTransactionData);
    setShowConfirmation(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold mb-2">Processing your payment...</h1>
          <p className="text-gray-600 mb-4">Please wait while we confirm your payment and start the transfer.</p>
          <div className="text-sm text-gray-500">
            Session ID: {sessionId}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4">
      <TransferStepper transactionId={transactionId} onComplete={handleComplete} />

      {/* Confirmation Modal */}
      {showConfirmation && transactionData && (
        <ConfirmationModal
          transactionData={transactionData}
          onClose={() => setShowConfirmation(false)}
        />
      )}
    </div>
  );
}
