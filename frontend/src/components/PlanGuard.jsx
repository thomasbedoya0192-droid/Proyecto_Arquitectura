import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { Lock, Loader2 } from 'lucide-react';

export function PlanGuard() {
  const { isPremium, status, refresh } = useSubscription();
  const location = useLocation();
  const [showLock, setShowLock] = useState(false);

  // Prevent flashing lock on reload for premium users
  useEffect(() => {
    if (status === 'ready') {
      setShowLock(!isPremium);
    }
  }, [status, isPremium]);

  if (status === 'loading') {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={32} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={styles.loadingText}>Verificando suscripción...</p>
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

  return <Outlet />;
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