'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TransferStepper } from '@/components/TransferStepper';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Header } from '@/components/Header';

export default function TransferStatusPage() {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState<string>('');

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);


  useEffect(() => {
    async function createTransactionFromSession() {
      if (transactionId) return;
      try {
        const stored = sessionStorage.getItem('remittance_request');
        if (!stored) {
          router.replace('/');
          return;
        }
        const transactionRequest = JSON.parse(stored);

        const res = await fetch('/api/remittance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionRequest),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to start transfer');
        }
        setTransactionId(json.transactionId);
      } catch (e) {
        console.error(e);
        router.replace('/');
      }
    }
    
    createTransactionFromSession();
  }, [transactionId, router]);

  const handleComplete = (transactionData: any) => {
    const data = sessionStorage.getItem('remittance_request');
    const initTx = JSON.parse(data!);

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

  if (!transactionId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Preparing your transfer…</h1>
        <p className="text-gray-600">Please wait while we initialize your transfer.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="p-4">
        <TransferStepper transactionId={transactionId} onComplete={handleComplete} />
        
        {/* Confirmation Modal */}
        {showConfirmation && transactionData && (
          <ConfirmationModal
            transactionData={transactionData}
            onClose={() => setShowConfirmation(false)}
          />
        )}
      </div>
    </div>
  );
}


