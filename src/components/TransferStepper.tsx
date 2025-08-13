'use client';

import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Step {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp?: Date;
  error?: string;
  details?: any;
}

interface TransferStepperProps {
  transactionId: string;
  onComplete: (data: any) => void;
}

export function TransferStepper({ transactionId, onComplete }: TransferStepperProps) {
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'usdToXrp',
      title: 'USD to XRP Conversion',
      description: 'Converting USD to XRP at current market rate',
      status: 'pending',
    },
    {
      id: 'xrpTransfer',
      title: 'XRP Transfer',
      description: 'Sending XRP to partner wallet via XRPL',
      status: 'pending',
    },
    {
      id: 'mpesaPayout',
      title: 'M-PESA Payout',
      description: 'Processing payout to recipient via M-PESA',
      status: 'pending',
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // WebSocket message handler
  const handleWebSocketMessage = (message: any) => {    
    switch (message.type) {
      case 'status_update':
        console.log('Processing status_update:', message.data);
        updateSteps(message.data);
        
        if (message.data.status === 'completed') {
          setIsPolling(false);
          onComplete(message.data);
        } else if (message.data.status === 'failed') {
          setIsPolling(false);
        }
        break;
        
      case 'transaction_complete':
        updateSteps(message.data);
        setIsPolling(false);
        onComplete(message.data);
        break;
        
      case 'error':
        console.error('WebSocket error:', message.error);
        setIsPolling(false);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
        break;
    }
  };

  // WebSocket error handler
  const handleWebSocketError = (error: Event) => {
    console.error('WebSocket connection error:', error);
    setConnectionStatus('disconnected');
  };

  // WebSocket close handler
  const handleWebSocketClose = () => {
    console.log('WebSocket connection closed');
    setConnectionStatus('disconnected');
  };

  // Initialize WebSocket connection
  const { isConnected, isConnecting } = useWebSocket({
    transactionId,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    onClose: handleWebSocketClose,
  });

  useEffect(() => {
    if (!transactionId) return;

    // Start elapsed time counter
    const startTime = Date.now();
    const timeInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Update connection status
    if (isConnected) {
      setConnectionStatus('connected');
    } else if (isConnecting) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }

    return () => {
      clearInterval(timeInterval);
    };
  }, [transactionId, isConnected, isConnecting]);

  const updateSteps = (data: any) => {    
    const updatedSteps = steps.map(step => {
      const stepData = data.steps?.[step.id];
      
      if (stepData) {
        const newStatus = stepData.completed ? 'completed' : 
                         data.status === 'failed' ? 'failed' : 'processing';
        console.log(`Step ${step.id} status: ${step.status} -> ${newStatus}`);
        
        return {
          ...step,
          status: newStatus as 'pending' | 'processing' | 'completed' | 'failed',
          timestamp: stepData.timestamp ? new Date(stepData.timestamp) : undefined,
          error: stepData.error,
          details: step.id === 'xrpTransfer' ? data.xrplTransaction : 
                   step.id === 'mpesaPayout' ? data.mpesaTransaction : undefined,
        };
      }
      return step;
    });

    setSteps(updatedSteps);
    
    // Calculate progress with smooth transitions
    const completedSteps = updatedSteps.filter(step => step.status === 'completed').length;
    const processingSteps = updatedSteps.filter(step => step.status === 'processing').length;
    const totalSteps = updatedSteps.length;
    const newProgress = ((completedSteps + (processingSteps * 0.5)) / totalSteps) * 100;
    setProgress(newProgress);
    
    // Update current step
    const processingIndex = updatedSteps.findIndex(step => step.status === 'processing');
    if (processingIndex !== -1) {
      console.log(`Setting current step to: ${processingIndex}`);
      setCurrentStep(processingIndex);
    } else if (completedSteps === totalSteps) {
      console.log(`All steps completed, setting current step to: ${totalSteps - 1}`);
      setCurrentStep(totalSteps - 1);
    }
  };

  const getStepIcon = (step: Step, index: number) => {
    const baseClasses = "w-8 h-8 transition-all duration-300 ease-out";
    
    if (step.status === 'completed') {
      return (
        <div className={`${baseClasses} bg-green-500 rounded-full flex items-center justify-center shadow-lg`}>
          <CheckIcon className="w-5 h-5 text-white" />
        </div>
      );
    } else if (step.status === 'failed') {
      return (
        <div className={`${baseClasses} bg-red-500 rounded-full flex items-center justify-center shadow-lg`}>
          <XMarkIcon className="w-5 h-5 text-white" />
        </div>
      );
    } else if (step.status === 'processing') {
      return (
        <div className={`${baseClasses} bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse`}>
          <ClockIcon className="w-5 h-5 text-white animate-spin" />
        </div>
      );
    } else {
      return (
        <div className={`${baseClasses} bg-white border-2 border-gray-300 rounded-full flex items-center justify-center shadow-sm`}>
          <span className="text-sm font-semibold text-gray-500">{index + 1}</span>
        </div>
      );
    }
  };

  const getStepStatusColor = (step: Step) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50 shadow-green-100';
      case 'failed':
        return 'border-red-200 bg-red-50 shadow-red-100';
      case 'processing':
        return 'border-blue-200 bg-blue-50 shadow-blue-100';
      default:
        return 'border-gray-200 bg-white shadow-gray-100';
    }
  };

  const getStepTextColor = (step: Step) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-800';
      case 'failed':
        return 'text-red-800';
      case 'processing':
        return 'text-blue-800';
      default:
        return 'text-gray-700';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>;
      case 'connecting':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'disconnected':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
    }
  };


  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Enhanced Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Processing Your Transfer
        </h2>
        <div className="flex justify-center items-center space-x-4 text-sm text-gray-500">
          <p className="text-gray-600">
            Transaction ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{transactionId}</span>
          </p>
          <span>•</span>
          <span>⏱️ Elapsed: {formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-blue-600">{Math.round(progress)}%</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 via-blue-600 to-green-500 h-4 rounded-full transition-all duration-700 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {/* Progress indicator dots */}
          <div className="absolute top-0 left-0 w-full h-4 flex justify-between items-center px-2">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-white shadow-sm' : 'bg-transparent'
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Vertical Stepper */}
      <div className="flex">
        {/* Enhanced Vertical Stepper Bar */}
        <div className="flex flex-col items-center mr-8 relative">
          {/* Background progress line */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-200 h-full rounded-full"></div>
          <div 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-blue-500 to-green-500 rounded-full transition-all duration-700 ease-out"
            style={{ height: `${(progress / 100) * (steps.length * 80)}px` }}
          ></div>
          
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              {/* Step Icon with enhanced styling */}
              <div className="mb-4">
                {getStepIcon(step, index)}
              </div>
              
              {/* Step Label */}
              <div className="text-center mb-6">
                <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                  step.status === 'completed' ? 'bg-green-100 text-green-800' :
                  step.status === 'failed' ? 'bg-red-100 text-red-800' :
                  step.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  Step {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Step Details */}
        <div className="flex-1">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`mb-6 p-6 rounded-xl border-2 transition-all duration-500 ease-out transform ${
                getStepStatusColor(step)
              } ${index === currentStep ? 'ring-4 ring-blue-200 scale-105' : 'hover:scale-102'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className={`text-xl font-bold ${
                      getStepTextColor(step)
                    }`}>
                      {step.title}
                    </h3>
                    {step.status === 'processing' && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-lg">
                    {step.description}
                  </p>
                  
                  {/* Enhanced Status and Timestamp */}
                  <div className="flex items-center space-x-4 mb-4">
                    <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
                      step.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                      step.status === 'failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                      step.status === 'processing' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {step.status === 'completed' && '✅ '}
                      {step.status === 'failed' && '❌ '}
                      {step.status === 'processing' && '⏳ '}
                      {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                    </span>
                    {step.timestamp && (
                      <span className="text-gray-500 text-sm">
                        🕒 {step.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Enhanced Error Message */}
                  {step.error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-800 font-medium">Error occurred</p>
                          <p className="text-red-700 text-sm mt-1">{step.error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Step Details */}
                  {step.details && step.status === 'completed' && (
                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        📋 Transaction Details
                      </h4>
                      {step.id === 'xrpTransfer' && step.details && (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Transaction Hash:</span>
                            <span className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">{step.details.hash}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Ledger Index:</span>
                            <span className="font-mono text-gray-900">{step.details.ledgerIndex}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Network Fee:</span>
                            <span className="font-mono text-gray-900">{step.details.fee} XRP</span>
                          </div>
                        </div>
                      )}
                      {step.id === 'mpesaPayout' && step.details && (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Reference:</span>
                            <span className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">{step.details.reference}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Status:</span>
                            <span className="font-semibold text-green-600">✅ {step.details.status}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Amount:</span>
                            <span className="font-mono text-gray-900 font-semibold">KES {step.details.amount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Loading Indicator */}
      {isPolling && (
        <div className="text-center mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <div className="inline-flex items-center space-x-3 text-blue-700">
            <div className="relative">
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <span className="font-medium">Processing transaction in real-time...</span>
          </div>
          <p className="text-blue-600 text-sm mt-2">
            This may take a few moments. Please don&apos;t close this window.
          </p>
          {connectionStatus === 'disconnected' && (
            <p className="text-red-600 text-sm mt-2">
              ⚠️ Connection lost. Attempting to reconnect...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
