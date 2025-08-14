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
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
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
  const [isValidating, setIsValidating] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [fxRates, setFxRates] = useState<Record<string, any>>({});
  const [fxRatesLoading, setFxRatesLoading] = useState(false);

  // Helper function to get display names for form fields
  const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      senderName: 'Sender Name',
      senderEmail: 'Sender Email',
      receiverName: 'Receiver Name',
      receiverPhone: 'Receiver Phone',
      country: 'Destination Country',
      amount: 'Amount',
    };
    return fieldNames[field] || field;
  };

  // Helper function to render error-styled input field
  const renderErrorField = (
    fieldName: keyof FormData,
    type: string,
    placeholder: string,
    additionalProps: any = {}
  ) => {
    const hasError = errors[fieldName];
    return (
      <div className="relative">
        <input
          type={type}
          id={fieldName}
          value={formData[fieldName] as string}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          placeholder={placeholder}
          {...additionalProps}
        />
        {hasError && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render error message
  const renderErrorMessage = (fieldName: keyof FormData) => {
    const error = errors[fieldName];
    if (!error) return null;
    
    return (
      <p className="text-red-500 text-sm mt-1 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    );
  };
  const [xrpAmount, setXrpAmount] = useState(0);
  const [localAmount, setLocalAmount] = useState(0);
  const [savingsAmount, setSavingsAmount] = useState(0);

  // Calculate amounts when form data changes
  useEffect(() => {
    if (formData.amount && selectedCountry && fxRates[selectedCountry.currency]) {
      const usdAmount = parseFloat(formData.amount);
      const xrpAmount = (usdAmount - FIXED_NETWORK_FEE) / xrpPrice;
      const currentFxRate = fxRates[selectedCountry.currency].usdToLocal;
      const localAmount = usdAmount * currentFxRate;
      
      setXrpAmount(xrpAmount);
      setLocalAmount(localAmount);
      
      // Calculate savings compared to Western Union
      const westernUnionFee = usdAmount * (WESTERN_UNION_FEE_PERCENTAGE / 100);
      const xrpFee = FIXED_NETWORK_FEE;
      const savings = westernUnionFee - xrpFee;
      setSavingsAmount(savings);
    }
  }, [formData.amount, selectedCountry, xrpPrice, fxRates]);

  // Fetch FX rates on component mount
  useEffect(() => {
    fetchFxRates();
  }, []);

  // Update selected country when country changes
  useEffect(() => {
    if (formData.country) {
      const country = COUNTRIES.find(c => c.code === formData.country);
      setSelectedCountry(country);
    }
  }, [formData.country]);

  // Fetch FX rates from API
  const fetchFxRates = async () => {
    setFxRatesLoading(true);
    try {
      const response = await fetch('/api/fx-rates');
      const data = await response.json();
      
      if (data.success && data.rates) {
        setFxRates(data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch FX rates:', error);
    } finally {
      setFxRatesLoading(false);
    }
  };

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
    setIsValidating(true);
    setValidationWarnings([]);

    try {
      // Step 1: Validate sender and receiver information
      const validationData = {
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
          localCurrency: selectedCountry.currency,
        },
      };

      console.log('🔍 Validating transaction data...');
      const validationResponse = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationData),
      });

      const validationResult = await validationResponse.json();
      
      if (!validationResponse.ok) {
        throw new Error(validationResult.error || 'Validation failed');
      }

      if (!validationResult.valid) {
        // Handle validation errors with proper field mapping
        const newErrors: ValidationErrors = {};
        
        // Map sender errors
        if (validationResult.errors?.sender) {
          if (validationResult.errors.sender.name) {
            newErrors.senderName = validationResult.errors.sender.name;
          }
          if (validationResult.errors.sender.email) {
            newErrors.senderEmail = validationResult.errors.sender.email;
          }
        }
        
        // Map receiver errors
        if (validationResult.errors?.receiver) {
          if (validationResult.errors.receiver.name) {
            newErrors.receiverName = validationResult.errors.receiver.name;
          }
          if (validationResult.errors.receiver.phone) {
            newErrors.receiverPhone = validationResult.errors.receiver.phone;
          }
          if (validationResult.errors.receiver.country) {
            newErrors.country = validationResult.errors.receiver.country;
          }
        }
        
        // Map amount errors
        if (validationResult.errors?.amounts) {
          if (validationResult.errors.amounts.usd) {
            newErrors.amount = validationResult.errors.amounts.usd;
          }
        }
        
        setErrors(newErrors);
        
        // Show warnings if any
        if (validationResult.warnings?.length > 0) {
          console.warn('Validation warnings:', validationResult.warnings);
          setValidationWarnings(validationResult.warnings);
        }
        
        // Scroll to first error field
        setTimeout(() => {
          const firstErrorField = document.querySelector('.border-red-500');
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        return;
      }

      console.log('✅ Validation passed, proceeding to checkout...');

      // Step 2: Prepare transaction data for API and Stripe
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
          usdToLocal: fxRates[selectedCountry.currency]?.usdToLocal || 0,
          source: fxRates[selectedCountry.currency]?.source || 'ExchangeRate-API',
        },
      };

      // Persist request to reconstruct after Stripe redirect
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('remittance_request', JSON.stringify(transactionRequest));
      }

      // Step 3: Create Stripe checkout session
      console.log('💳 Creating Stripe checkout session...');
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

      console.log('🚀 Redirecting to Stripe Checkout...');
      // Redirect to Stripe Checkout
      window.location.href = result.url;

    } catch (error) {
      console.error('Checkout failed:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Payment initialization failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
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
            {renderErrorField('senderName', 'text', 'Enter your full name')}
            {renderErrorMessage('senderName')}
          </div>

          <div>
            <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            {renderErrorField('senderEmail', 'email', 'Enter your email address')}
            {renderErrorMessage('senderEmail')}
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
            {renderErrorField('receiverName', 'text', "Enter receiver's full name")}
            {renderErrorMessage('receiverName')}
          </div>

          <div>
            <label htmlFor="receiverPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            {renderErrorField('receiverPhone', 'tel', '+1234567890')}
            {renderErrorMessage('receiverPhone')}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Destination Country *
            </label>
            <div className="relative">
              <select
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.country ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {renderErrorMessage('country')}
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
            {renderErrorField('amount', 'number', '0.00', { min: '10', max: '10000', step: '0.01' })}
            {renderErrorMessage('amount')}
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
                {fxRatesLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-800">Loading exchange rate...</p>
                  </div>
                ) : fxRates[selectedCountry.currency] ? (
                  <>
                    <p className="text-sm text-blue-800">
                      <strong>FX Rate:</strong> 1 USD = {fxRates[selectedCountry.currency].usdToLocal.toFixed(2)} {selectedCountry.currency}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Source: {fxRates[selectedCountry.currency].source}
                      {fxRates[selectedCountry.currency].lastUpdated && (
                        <span> • Updated: {new Date(fxRates[selectedCountry.currency].lastUpdated).toLocaleTimeString()}</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-red-600">Exchange rate unavailable</p>
                )}
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
            {fxRates[selectedCountry.currency] && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={fetchFxRates}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Refresh rates
                </button>
              </div>
            )}
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

      {/* Validation Status */}
      {isValidating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-blue-800 font-medium">Validating transaction...</p>
              <p className="text-blue-600 text-sm">Checking sender and receiver information</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors Summary */}
      {Object.keys(errors).length > 0 && !isValidating && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-red-600 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-red-800 font-medium">Please fix the following errors:</p>
              <ul className="text-red-700 text-sm mt-1 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="flex items-center space-x-2">
                    <span className="text-red-600">•</span>
                    <span className="font-medium">{getFieldDisplayName(field)}:</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-600 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-yellow-800 font-medium">Validation Warnings</p>
              <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting || isValidating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200 w-full md:w-auto"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{isValidating ? 'Validating...' : 'Processing...'}</span>
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
