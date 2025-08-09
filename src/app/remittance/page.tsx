'use client';

import { Header } from '@/components/Header';
import { useXRP } from '@/contexts/XRPContext';
import { RemittanceForm } from '@/components/RemittanceForm';

export default function RemittancePage(): React.JSX.Element {
  const { xrpPrice, isLoading: xrpLoading } = useXRP();


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Send Money Globally
            </h1>
            <p className="text-gray-600 mb-4">
              Fast, secure, and cost-effective cross-border payments powered by XRP Ledger
            </p>
            
            {/* XRP Price Display */}
            <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-blue-800">Current XRP Price:</span>
              <span className="text-lg font-bold text-blue-900">
                {xrpLoading ? 'Loading...' : `$${xrpPrice.toFixed(4)}`}
              </span>
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ↻
              </button>
            </div>
          </div>

          <RemittanceForm 
            xrpPrice={xrpPrice}
          />
        </div>
      </main>
    </div>
  );
}
