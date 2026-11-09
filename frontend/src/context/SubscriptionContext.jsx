import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading', // 'loading' | 'ready' | 'error'
    isPremium: null,
    plan: 'free',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    walletBalance: '0.00',
    testCards: [],
    error: null,
  });

  const fetchStatus = useCallback(async (isInitialLoad = false) => {
    try {
      const userStr = localStorage.getItem('usuario_activo');
      if (!userStr) {
        setState(prev => ({ ...prev, status: 'ready', isPremium: false }));
        return;
      }

      const user = JSON.parse(userStr);
      if (!user.token) {
        setState(prev => ({ ...prev, status: 'ready', isPremium: false }));
        return;
      }

      // Only show loading on initial load, not on refresh
      if (isInitialLoad) {
        setState(prev => ({ ...prev, status: 'loading' }));
      }
      
      const [statusRes, walletRes] = await Promise.all([
        api.get('/billing/status/'),
        api.get('/billing/wallet/'),
      ]);

      setState({
        status: 'ready',
        isPremium: statusRes.data.is_premium,
        plan: statusRes.data.plan,
        currentPeriodEnd: statusRes.data.current_period_end,
        cancelAtPeriodEnd: statusRes.data.cancel_at_period_end,
        walletBalance: statusRes.data.wallet_balance,
        testCards: walletRes.data.test_cards || [],
        error: null,
      });
    } catch (e) {
      console.error('Error fetching subscription status:', e);
      setState(prev => ({ ...prev, status: 'error', error: e.message }));
    }
  }, []);

  // Refresh on mount (initial load)
  useEffect(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  // Refresh on window focus (no polling, no loading state)
  useEffect(() => {
    const handleFocus = () => fetchStatus(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchStatus]);

  const refresh = useCallback(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  const value = {
    ...state,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}