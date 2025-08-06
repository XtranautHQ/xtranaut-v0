'use client';

import { fetchXRPPriceApi } from '@/services/coingecko';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface XRPData {
  price: number;
  usdKesRate: number;
  isLoading: boolean;
  error: string | null;
}

interface XRPContextType {
  xrpData: XRPData;
  updateXRPPrice: (price: number) => void;
  updateUSDKESRate: (rate: number) => void;
  refreshData: () => Promise<void>;
}

const XRPContext = createContext<XRPContextType | undefined>(undefined);

interface XRPProviderProps {
  children: ReactNode;
}

export function XRPProvider({ children }: XRPProviderProps): React.JSX.Element {
  const [xrpData, setXrpData] = useState<XRPData>({
    price: 0.52,
    usdKesRate: 158.45,
    isLoading: false,
    error: null,
  });

  // Simulate fetching XRP price from an API
  const fetchXRPPrice = async (): Promise<number> => {
    const price = await fetchXRPPriceApi();
    return price ? price : 0;
  };

  // Simulate fetching USD/KES rate
  const fetchUSDKESRate = async (): Promise<number> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate rate fluctuation
    const baseRate = 158.45;
    const variation = (Math.random() - 0.5) * 0.5; // ±0.25 variation
    return Math.round((baseRate + variation) * 100) / 100;
  };

  const refreshData = async (): Promise<void> => {
    setXrpData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [newPrice, newRate] = await Promise.all([
        fetchXRPPrice(),
        fetchUSDKESRate(),
      ]);

      setXrpData({
        price: newPrice,
        usdKesRate: newRate,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setXrpData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch latest rates',
      }));
    }
  };

  const updateXRPPrice = (price: number): void => {
    setXrpData(prev => ({
      ...prev,
      price,
    }));
  };

  const updateUSDKESRate = (rate: number): void => {
    setXrpData(prev => ({
      ...prev,
      usdKesRate: rate,
    }));
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, []);

  const value: XRPContextType = {
    xrpData,
    updateXRPPrice,
    updateUSDKESRate,
    refreshData,
  };

  return (
    <XRPContext.Provider value={value}>
      {children}
    </XRPContext.Provider>
  );
}

export function useXRP(): XRPContextType {
  const context = useContext(XRPContext);
  if (context === undefined) {
    throw new Error('useXRP must be used within an XRPProvider');
  }
  return context;
} 