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
      
      // Simulate API call to CoinGecko for XRP price
      // In a real implementation, you would call the actual CoinGecko API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
      const data = await response.json();
      
      if (data.ripple && data.ripple.usd) {
        setXrpPrice(data.ripple.usd);
      } else {
        // Fallback to a realistic XRP price for demo purposes
        setXrpPrice(0.52);
      }
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
    
    // Refresh price every 5 minutes
    const interval = setInterval(fetchXRPPrice, 5 * 60 * 1000);
    
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
