'use client';

import { useState, useEffect } from 'react';
import { TransferStepper } from './TransferStepper';

interface RemittanceFormProps {
  xrpPrice: number;
}

interface FormData {
  senderName: string;
  senderEmail: string;
  receiverPhone: string;
  receiverName: string;
  country: string;
  amount: string;
  addToVault: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const COUNTRIES = [
  { code: 'KE', name: 'Kenya', currency: 'KES', fxRate: 160.5 },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', fxRate: 1500.0 },
  { code: 'GH', name: 'Ghana', currency: 'GHS', fxRate: 12.5 },
  { code: 'UG', name: 'Uganda', currency: 'UGX', fxRate: 3800.0 },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', fxRate: 2500.0 },
];

const FIXED_NETWORK_FEE = 0.25; // XRP
const WESTERN_UNION_FEE_PERCENTAGE = 8; // 8% fee for comparison

export function RemittanceForm({ xrpPrice }: RemittanceFormProps) {
  const [formData, setFormData] = useState<FormData>({
    senderName: '',
    senderEmail: '',
    receiverPhone: '',
    receiverName: '',
    country: '',
    amount: '',
    addToVault: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [xrpAmount, setXrpAmount] = useState(0);
  const [localAmount, setLocalAmount] = useState(0);
  const [savingsAmount, setSavingsAmount] = useState(0);

  // Calculate amounts when form data changes
  useEffect(() => {
    if (formData.amount && selectedCountry) {
      const usdAmount = parseFloat(formData.amount);
      const xrpAmount = (usdAmount - FIXED_NETWORK_FEE) / xrpPrice;
      const localAmount = usdAmount * selectedCountry.fxRate;
      
      setXrpAmount(xrpAmount);
      setLocalAmount(localAmount);
      
      // Calculate savings compared to Western Union
      const westernUnionFee = usdAmount * (WESTERN_UNION_FEE_PERCENTAGE / 100);
      const xrpFee = FIXED_NETWORK_FEE;
      const savings = westernUnionFee - xrpFee;
      setSavingsAmount(savings);
    }
  }, [formData.amount, selectedCountry, xrpPrice]);

  // Update selected country when country changes
  useEffect(() => {
    if (formData.country) {
      const country = COUNTRIES.find(c => c.code === formData.country);
      setSelectedCountry(country);
    }
  }, [formData.country]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Sender validation
    if (!formData.senderName.trim()) {
      newErrors.senderName = 'Sender name is required';
    }

    if (!formData.senderEmail.trim()) {
      newErrors.senderEmail = 'Sender email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      newErrors.senderEmail = 'Please enter a valid email address';
    }

    // Receiver validation
    if (!formData.receiverName.trim()) {
      newErrors.receiverName = 'Receiver name is required';
    }

    if (!formData.receiverPhone.trim()) {
      newErrors.receiverPhone = 'Receiver phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.receiverPhone)) {
      newErrors.receiverPhone = 'Please enter a valid phone number';
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Please enter a valid amount';
      } else if (amount < 10) {
        newErrors.amount = 'Minimum amount is $10';
      } else if (amount > 10000) {
        newErrors.amount = 'Maximum amount is $10,000';
      }
    }

    // Country validation
    if (!formData.country) {
      newErrors.country = 'Please select a destination country';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare transaction data for API and Stripe
      const transactionRequest = {
        sender: {
          name: formData.senderName,
          email: formData.senderEmail,
        },
        receiver: {
          name: formData.receiverName,
          phone: formData.receiverPhone,
          country: selectedCountry.code,
        },
        amounts: {
          usd: parseFloat(formData.amount),
          xrp: xrpAmount,
          local: localAmount,
          localCurrency: selectedCountry.currency,
        },
        fees: {
          networkFee: FIXED_NETWORK_FEE,
          totalFee: FIXED_NETWORK_FEE,
          savings: savingsAmount,
        },
        vault: {
          enabled: formData.addToVault,
          amount: formData.addToVault ? 20 : 0,
        },
        fxRate: {
          usdToXrp: xrpPrice,
          usdToLocal: selectedCountry.fxRate,
          source: 'Central Bank of Kenya reference rate',
        },
      };

      // Persist request to reconstruct after Stripe redirect
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('remittance_request', JSON.stringify(transactionRequest));
      }

      // Create Stripe checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionRequest),
      });

      const result = await response.json();
      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Unable to start checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url;

    } catch (error) {
      console.error('Checkout failed:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Payment initialization failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sender Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sender Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="senderName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="senderName"
              value={formData.senderName}
              onChange={(e) => handleInputChange('senderName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.senderName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.senderName && (
              <p className="text-red-500 text-sm mt-1">{errors.senderName}</p>
            )}
          </div>

          <div>
            <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="senderEmail"
              value={formData.senderEmail}
              onChange={(e) => handleInputChange('senderEmail', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.senderEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
            />
            {errors.senderEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.senderEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* Receiver Information */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receiver Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="receiverName" className="block text-sm font-medium text-gray-700 mb-2">
              Receiver Name *
            </label>
            <input
              type="text"
              id="receiverName"
              value={formData.receiverName}
              onChange={(e) => handleInputChange('receiverName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.receiverName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter receiver's full name"
            />
            {errors.receiverName && (
              <p className="text-red-500 text-sm mt-1">{errors.receiverName}</p>
            )}
          </div>

          <div>
            <label htmlFor="receiverPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="receiverPhone"
              value={formData.receiverPhone}
              onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.receiverPhone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+1234567890"
            />
            {errors.receiverPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.receiverPhone}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Destination Country *
            </label>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.country ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.currency})
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="text-red-500 text-sm mt-1">{errors.country}</p>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Details */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD) *
            </label>
            <input
              type="number"
              id="amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
              min="10"
              max="10000"
              step="0.01"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              XRP Amount
            </label>
            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
              <span className="text-gray-900 font-medium">
                {xrpAmount > 0 ? `${xrpAmount.toFixed(2)} XRP` : 'Enter amount above'}
              </span>
            </div>
          </div>
        </div>

        {/* FX Rate Display */}
        {selectedCountry && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800">
                  <strong>FX Rate:</strong> 1 USD = {selectedCountry.fxRate} {selectedCountry.currency}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Source: {selectedCountry.code === 'KE' ? 'Central Bank of Kenya reference rate' : 'Central Bank reference rate'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-800">
                  <strong>Local Amount:</strong>
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {localAmount > 0 ? `${localAmount.toFixed(2)} ${selectedCountry.currency}` : '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vault Toggle */}
        <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
          <input
            type="checkbox"
            id="addToVault"
            checked={formData.addToVault}
            onChange={(e) => handleInputChange('addToVault', e.target.checked)}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <label htmlFor="addToVault" className="text-sm font-medium text-green-800">
            Add $20 to savings vault?
          </label>
          <span className="text-xs text-green-600">(Demo feature - no real deduction)</span>
        </div>

        {/* Fee Breakdown */}
        <div className="bg-white mt-4 p-4 rounded-lg border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-3">Fee Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Network Fee (XRPL):</span>
              <span className="font-medium">{FIXED_NETWORK_FEE} XRP (${(FIXED_NETWORK_FEE * xrpPrice).toFixed(2)})</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Savings vs Western Union:</span>
              <span className="font-medium">${savingsAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Fee:</span>
              <span>${(FIXED_NETWORK_FEE * xrpPrice).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200 w-full md:w-auto"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            'Send Money'
          )}
        </button>
      </div>

      {errors.submit && (
        <div className="text-red-500 text-center">{errors.submit}</div>
      )}
    </form>
  );
}
