'use client';

import { Header } from '@/components/Header';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface HistoryItem {
  transactionId: string;
  sender: { name: string; email: string };
  receiver: { name: string; phone: string; country: string };
  amounts: { usd: number; xrp: number; local: number; localCurrency: string };
  fees: { platformFee: number; totalFee: number; savings: number };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function HistoryPage(): React.JSX.Element {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  const fetchHistory = async (emailFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (emailFilter) params.set('email', emailFilter);
      const res = await fetch(`/api/remittance/history?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load history');
      setItems(json.transactions || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try prefill email from last request
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('remittance_request') : null;
    const prefillEmail = stored ? JSON.parse(stored).sender?.email : '';
    setEmail(prefillEmail || '');
    fetchHistory(prefillEmail || undefined);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction History</h1>
            <p className="text-gray-600">View your past remittance transactions and track your savings</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by sender email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchHistory(email || undefined)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={() => { setEmail(''); fetchHistory(); }}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600">Loading history…</div>
          ) : error ? (
            <div className="py-16 text-center text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600 mb-6">Your transaction history will appear here after you send money</p>
              <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200">Send Money Now</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((t) => (
                    <tr key={t.transactionId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{t.transactionId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.sender.name}<div className="text-xs text-gray-500">{t.sender.email}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.receiver.name}<div className="text-xs text-gray-500">{t.receiver.phone} · {t.receiver.country}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${t.amounts.usd.toFixed(2)}<div className="text-xs text-gray-500">{t.amounts.local.toFixed(2)} {t.amounts.localCurrency}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'completed' ? 'bg-green-100 text-green-800' :
                          t.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Detailed transaction logs</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Export transaction history</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Savings analytics</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Recipient management</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
