'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export default function ProcessingPage(): React.JSX.Element {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [transactionData, setTransactionData] = useState<any>(null);

  const steps: ProcessingStep[] = [
    {
      id: 'validation',
      title: 'Validating Transaction',
      description: 'Checking transaction details and recipient information',
      status: 'pending'
    },
    {
      id: 'xrp-conversion',
      title: 'Converting to XRP',
      description: 'Converting USD to XRP at current market rate',
      status: 'pending'
    },
    {
      id: 'xrpl-transfer',
      title: 'XRP Ledger Transfer',
      description: 'Processing transfer on XRP Ledger network',
      status: 'pending'
    },
    {
      id: 'mpesa-payout',
      title: 'M-Pesa Payout',
      description: 'Sending funds to recipient via M-Pesa',
      status: 'pending'
    },
    {
      id: 'confirmation',
      title: 'Transaction Confirmed',
      description: 'Payment successfully completed',
      status: 'pending'
    }
  ];

  useEffect(() => {
    const storedData = sessionStorage.getItem('transactionData');
    if (storedData) {
      setTransactionData(JSON.parse(storedData));
    }

    // Simulate processing steps
    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        
        // Update step status
        steps[i].status = 'processing';
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as completed
        steps[i].status = 'completed';
        
        // If this is the last step, redirect to success
        if (i === steps.length - 1) {
          setTimeout(() => {
            router.push('/success');
          }, 1500);
        }
      }
    };

    processSteps();
  }, [router]);

  const getStepIcon = (step: ProcessingStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } else if (step.status === 'processing') {
      return (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-600 font-semibold">{index + 1}</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Processing Your Payment</h2>
          <p className="text-gray-600">Please wait while we process your transaction securely</p>
        </div>

        {/* Processing Steps */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                {getStepIcon(step, index)}
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${
                    step.status === 'completed' ? 'text-green-600' : 
                    step.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Info */}
        {transactionData && (
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-semibold text-green-600">${transactionData.amount}</p>
              </div>
              <div>
                <span className="text-gray-600">Recipient:</span>
                <p className="font-semibold">{transactionData.snapshot.input.recipientName}</p>
              </div>
              <div>
                <span className="text-gray-600">XRP Amount:</span>
                <p className="font-semibold text-orange-600">{transactionData.xrpAmount} XRP</p>
              </div>
              <div>
                <span className="text-gray-600">Recipient Gets:</span>
                <p className="font-semibold text-blue-600">KES {transactionData.recipientAmount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-yellow-800">Security Notice</h4>
              <p className="text-yellow-700 text-sm">
                Your transaction is being processed securely on the XRP Ledger. 
                Please do not close this page or refresh your browser.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 