import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function PlanGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPopup, setShowPopup] = useState(true);
  const [alreadyWarned, setAlreadyWarned] = useState(false);

  useEffect(() => {
    // Only show when on /feedback route
    if (location.pathname !== '/feedback') {
      setShowPopup(false);
      return;
    }

    // Show once per session on Feedback page
    if (!alreadyWarned) {
      setAlreadyWarned(true);
      setShowPopup(true);
    }
  }, [location.pathname, alreadyWarned]);

  if (!showPopup) return null;

  return (
    <div style={styles.gateOverlay}>
      <div style={styles.gateCard}>
        <h3>Plan Necesario</h3>
        <p>Para acceder al Feedback Financiero, necesitas tener un plan Premium.</p>
        <button
          style={styles.upgradeBtn}
          onClick={() => navigate('/plan')}
        >
          Planificar / Actualizar
        </button>
        <button
          style={styles.closeBtn}
          onClick={() => setShowPopup(false)}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

const styles = {
  gateOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  gateCard: {
    backgroundColor: '#1e293b',
    padding: '2rem',
    borderRadius: '1rem',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid #334155',
  },
  upgradeBtn: {
    backgroundColor: '#8b5cf6',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    marginTop: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    padding: '0.5rem',
    borderRadius: '0.3rem',
    float: 'right',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
};