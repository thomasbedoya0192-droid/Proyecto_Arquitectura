import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { Loader2 } from 'lucide-react';

export function PlanGuard({ children }) {
  const { t } = useTranslation();
  const { isPremium, status } = useSubscription();
  const location = useLocation();

  // Prevent flashing lock on reload for premium users
  useEffect(() => {
    // No-op - just to satisfy exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ animation: 'spin 1s linear infinite' }}>⟳</div>
        <p style={styles.loadingText}>{t('planGuard.verifying')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return <Navigate to="/plan" replace />;
  }

  // Only protect /feedback route
  if (location.pathname === '/feedback') {
    if (!isPremium) {
      return <Navigate to="/plan" replace />;
    }
  }

  return children ?? null;
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '1rem',
    color: '#94a3b8',
  },
  loadingText: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#94a3b8',
  },
};

export default PlanGuard;