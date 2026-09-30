import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';

export function calcularDiasRestantes(fechaPagoStr) {
  if (!fechaPagoStr) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [year, month, day] = fechaPagoStr.split('-').map(Number);
  const fechaPago = new Date(year, month - 1, day);
  fechaPago.setHours(0, 0, 0, 0);

  const diferenciaMs = fechaPago - hoy;
  return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
}

export function NotificationToast({ suscripciones }) {
  const [resumenAlertas, setResumenAlertas] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!suscripciones || suscripciones.length === 0) return;

    // Mapear días restantes de cada suscripción
    const subsConDias = suscripciones
      .map((sub) => ({
        ...sub,
        diasRestantes: calcularDiasRestantes(sub.fecha_proximo_pago),
      }))
      .filter((sub) => sub.diasRestantes !== null && sub.diasRestantes >= 0 && sub.diasRestantes <= 7);

    if (subsConDias.length > 0) {
      // Verificar si al menos una suscripción vence en 3 días o menos (Urgente / Rojo)
      const tieneUrgentes = subsConDias.some((sub) => sub.diasRestantes <= 3);

      setResumenAlertas({
        cantidad: subsConDias.length,
        esUrgente: tieneUrgentes,
      });
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [suscripciones]);

  if (!visible || !resumenAlertas) return null;

  return (
    <div
      style={{
        ...styles.toastContainer,
        borderColor: resumenAlertas.esUrgente ? '#ef4444' : '#f59e0b',
      }}
    >
      <div style={styles.toastIcon}>
        {resumenAlertas.esUrgente ? (
          <AlertTriangle size={22} color="#ef4444" />
        ) : (
          <Clock size={22} color="#f59e0b" />
        )}
      </div>

      <div style={styles.toastContent}>
        <p style={{ ...styles.toastTitle, color: resumenAlertas.esUrgente ? '#f87171' : '#fbbf24' }}>
          {resumenAlertas.esUrgente ? '¡Atención! Cobros Inminentes' : 'Aviso de Próximos Cobros'}
        </p>
        <p style={styles.toastBody}>
          {resumenAlertas.cantidad === 1
            ? 'Tienes 1 suscripción programada para cobrarse pronto.'
            : `Tienes ${resumenAlertas.cantidad} suscripciones que pronto se cobrarán.`}
        </p>
      </div>

      <button style={styles.closeBtn} onClick={() => setVisible(false)}>
        <X size={16} color="#cbd5e1" />
      </button>
    </div>
  );
}

const styles = {
  toastContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: '1rem 1.2rem',
    borderRadius: '0.75rem',
    borderLeft: '5px solid',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    zIndex: 3000,
    maxWidth: '380px',
  },
  toastIcon: {
    backgroundColor: '#0f172a',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
  },
  toastContent: { flex: 1 },
  toastTitle: { margin: 0, fontWeight: 'bold', fontSize: '0.9rem' },
  toastBody: { margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
  },
};
