'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface XRPContextType {
  xrpPrice: number;
  isLoading: boolean;
  error: string | null;
  refreshXRPPrice: () => Promise<void>;
}

const XRPContext = createContext<XRPContextType | undefined>(undefined);

export function XRPProvider({ children }: { children: ReactNode }) {
  const [xrpPrice, setXrpPrice] = useState<number>(0.5); // Default fallback price
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchXRPPrice = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/xrp/price');
      const data = await response.json();
      const price = typeof data.price === 'number' ? data.price : 0.52;
      setXrpPrice(price);
    } catch (err) {
      console.error('Error fetching XRP price:', err);
      setError('Failed to fetch XRP price');
      // Use fallback price for demo
      setXrpPrice(0.52);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshXRPPrice = async () => {
    await fetchXRPPrice();
  };

  useEffect(() => {
    fetchXRPPrice();
    
    // Refresh price every 1 minute to align with server cache TTL
    const interval = setInterval(fetchXRPPrice, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const value: XRPContextType = {
    xrpPrice,
    isLoading,
    error,
    refreshXRPPrice,
  };

  return (
    <XRPContext.Provider value={value}>
      {children}
    </XRPContext.Provider>
  );
}

export function useXRP() {
  const context = useContext(XRPContext);
  if (context === undefined) {
    throw new Error('useXRP must be used within an XRPProvider');
  }
  return context;
}
