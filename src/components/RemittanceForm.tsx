'use client';

import { useState } from 'react';
import { useXRP } from '@/contexts/XRPContext';

interface FormData {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  amount: string;
  country: string;
  addToVault: boolean;
}

interface FeeCalculation {
  xrpAmount: number;
  fixedFeeUSD: number;
  westernUnionFee: number;
  savings: number;
  recipientAmount: number;
}

interface TransactionSnapshot {
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
  calculation: FeeCalculation;
  ledgerTime: string;
  fxSource: string;
}

interface TransactionData {
  amount: string;
  savings: string;
  recipientAmount: string;
  xrpAmount: string;
  snapshot: TransactionSnapshot;
}

interface RemittanceFormProps {
  onTransaction: (data: TransactionData) => Promise<void>;
  isSaving?: boolean;
  error?: string;
}

export function RemittanceForm({ onTransaction, isSaving = false, error: parentError }: RemittanceFormProps): React.JSX.Element {
  const { xrpData } = useXRP();
  const [formData, setFormData] = useState<FormData>({
    senderName: '',
    senderEmail: '',
    recipientName: '',
    recipientPhone: '',
    amount: '',
    country: 'Kenya',
    addToVault: false
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Constants
  const FIXED_FEE_XRP: number = 0.25;
  const WESTERN_UNION_FEE_PERCENT: number = 8.5; // 8.5% fee for comparison

  const calculateFees = (amount: number): FeeCalculation => {
    const fixedFeeUSD: number = FIXED_FEE_XRP * xrpData.price;
    const xrpAmount: number = (amount - fixedFeeUSD) / xrpData.price;
    const westernUnionFee: number = amount * (WESTERN_UNION_FEE_PERCENT / 100);
    const savings: number = westernUnionFee - fixedFeeUSD;
    
    return {
      xrpAmount,
      fixedFeeUSD,
      westernUnionFee,
      savings: Math.max(0, savings),
      recipientAmount: amount * xrpData.usdKesRate
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    const amount: number = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      setIsProcessing(false);
      return;
    }

    if (!formData.recipientPhone || formData.recipientPhone.length < 10) {
      setError('Please enter a valid phone number');
      setIsProcessing(false);
      return;
    }

    // Simulate processing delay
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Simulate failure cases
    if (formData.recipientPhone.includes('000')) {
      setError('Invalid phone number. Please check and try again.');
      setIsProcessing(false);
      return;
    }

    if (amount > 1000) {
      setError('Insufficient funds. Maximum transfer amount is $1,000.');
      setIsProcessing(false);
      return;
    }

    const fees: FeeCalculation = calculateFees(amount);
    
    // Log transaction snapshot
    const transactionSnapshot: TransactionSnapshot = {
      input: {
        usdAmount: amount,
        recipientPhone: formData.recipientPhone,
        xrpRate: xrpData.price,
        country: formData.country,
        senderName: formData.senderName,
        senderEmail: formData.senderEmail,
        recipientName: formData.recipientName,
        addToVault: formData.addToVault
      },
      calculation: fees,
      ledgerTime: new Date().toISOString(),
      fxSource: 'Central Bank of Kenya reference rate'
    };

    // Call parent handler
    await onTransaction({
      amount: amount.toFixed(2),
      savings: fees.savings.toFixed(2),
      recipientAmount: fees.recipientAmount.toFixed(2),
      xrpAmount: fees.xrpAmount.toFixed(2),
      snapshot: transactionSnapshot
    });

    setIsProcessing(false);
    
    // Reset form only if successful
    if (!parentError) {
      setFormData({
        senderName: '',
        senderEmail: '',
        recipientName: '',
        recipientPhone: '',
        amount: '',
        country: 'Kenya',
        addToVault: false
      });
    };
  }

  const fees: FeeCalculation | null = formData.amount ? calculateFees(parseFloat(formData.amount)) : null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Money to Kenya</h2>
        <p className="text-gray-600">Fast, secure transfers via XRP Ledger</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sender Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              required
              value={formData.senderName}
              onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Email
            </label>
            <input
              type="email"
              required
              value={formData.senderEmail}
              onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email address"
            />
          </div>
        </div>

        {/* Recipient Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Name
            </label>
            <input
              type="text"
              required
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter recipient's full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Phone
            </label>
            <input
              type="tel"
              required
              value={formData.recipientPhone}
              onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+254712345678"
            />
          </div>
        </div>

        {/* Amount and Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              required
              min="1"
              max="1000"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter amount in USD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Kenya">Kenya</option>
              <option value="Uganda">Uganda</option>
              <option value="Tanzania">Tanzania</option>
              <option value="Rwanda">Rwanda</option>
            </select>
          </div>
        </div>

        {/* Additional Options */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="addToVault"
            checked={formData.addToVault}
            onChange={(e) => setFormData({ ...formData, addToVault: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="addToVault" className="ml-2 block text-sm text-gray-900">
            Save recipient for future transfers
          </label>
        </div>

        {/* Fee Calculation Display */}
        {fees && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount to Send:</span>
                  <span className="font-semibold text-green-600">${formData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recipient Gets:</span>
                  <span className="font-semibold text-blue-600">KES {fees.recipientAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">XRP Amount:</span>
                  <span className="font-semibold text-orange-600">{fees.xrpAmount.toFixed(2)} XRP</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee:</span>
                  <span className="font-medium">${fees.fixedFeeUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Fee:</span>
                  <span className="font-medium">~$0.0002</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-gray-900">${(parseFloat(formData.amount) + fees.fixedFeeUSD).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Savings Comparison */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-medium">You save:</span>
                <span className="text-green-800 font-bold">${fees.savings.toFixed(2)}</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Compared to Western Union (${fees.westernUnionFee.toFixed(2)} fee)
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || xrpData.isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Send Money'
          )}
        </button>
      </form>
    </div>
  );
} 