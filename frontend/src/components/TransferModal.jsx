import React, { useState } from 'react';
import api from '../api';
import { X, ArrowRight, Wallet, AlertCircle } from 'lucide-react';

export function TransferModal({ isOpen, onClose, usuario, cuentas, onTransferSuccess }) {
  const [cuentaOrigenId, setCuentaOrigenId] = useState(cuentas[0]?.id || '');
  const [cuentaDestinoId, setCuentaDestinoId] = useState(cuentas[1]?.id || '');
  const [montoDisplay, setMontoDisplay] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleMontoChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setMontoDisplay('');
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('es-CO');
    setMontoDisplay(formatted);
  };

  const handleTransferir = async (e) => {
    e.preventDefault();
    if (!cuentaOrigenId || !cuentaDestinoId || !montoDisplay) return;

    if (cuentaOrigenId === cuentaDestinoId) {
      setError('La cuenta de origen y destino deben ser distintas.');
      return;
    }

    const montoNumerico = parseFloat(montoDisplay.replace(/\./g, ''));

    try {
      setLoading(true);
      setError('');
      await api.post('/transacciones/transferir/', {
        usuario: usuario.id,
        cuenta_origen: parseInt(cuentaOrigenId),
        cuenta_destino: parseInt(cuentaDestinoId),
        monto: montoNumerico,
        descripcion: descripcion.trim(),
      });

      setMontoDisplay('');
      setDescripcion('');
      onTransferSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Ocurrió un error al realizar la transferencia.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wallet size={22} color="#8b5cf6" />
            <h3 style={styles.title}>Transferencia Entre Cuentas</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#cbd5e1" />
          </button>
        </div>

        <form onSubmit={handleTransferir} style={styles.form}>
          <div style={styles.selectsRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Desde (Origen):</label>
              <select
                value={cuentaOrigenId}
                onChange={(e) => setCuentaOrigenId(e.target.value)}
                style={styles.select}
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (${Math.round(parseFloat(c.saldo)).toLocaleString('es-CO')})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.2rem' }}>
              <ArrowRight size={20} color="#8b5cf6" />
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Hacia (Destino):</label>
              <select
                value={cuentaDestinoId}
                onChange={(e) => setCuentaDestinoId(e.target.value)}
                style={styles.select}
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (${Math.round(parseFloat(c.saldo)).toLocaleString('es-CO')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={styles.label}>Monto a Transferir ($):</label>
          <input
            type="text"
            placeholder="Ej: 100.000"
            value={montoDisplay}
            onChange={handleMontoChange}
            style={styles.input}
            required
          />

          <label style={styles.label}>Nota / Concepto (Opcional):</label>
          <input
            type="text"
            placeholder="Ej: Pago de tarjeta, ahorro mensual"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={styles.input}
          />

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Procesando...' : 'Confirmar Transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 2500,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: '1rem',
    padding: '1.8rem',
    width: '100%',
    maxWidth: '460px',
    border: '1px solid #334155',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' },
  title: { fontSize: '1.15rem', margin: 0, color: '#f8fafc' },
  closeBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  selectsRow: { display: 'flex', gap: '0.6rem', alignItems: 'center' },
  label: { fontSize: '0.82rem', color: '#cbd5e1' },
  input: { padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', outline: 'none' },
  select: { padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', outline: 'none', width: '100%' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.82rem' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: 'transparent', color: '#cbd5e1', cursor: 'pointer' },
  submitBtn: { padding: '0.6rem 1.2rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
};
