import React, { useState, useEffect } from 'react';
import api from '../api';
import { CreditCard, PlusCircle, Wallet, Building2, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import { TransactionHistory } from './TransactionHistory';
import { AccountDetailModal } from './AccountDetailModal';
import { TransferModal } from './TransferModal';

export function AccountsManager({ usuario }) {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [selectedCuentaModal, setSelectedCuentaModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Clave para refrescar historial

  // Campos del formulario de creación
  const [nombreCuenta, setNombreCuenta] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Ahorros');
  const [saldoDisplay, setSaldoDisplay] = useState('');

  const cargarCuentas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cuentas/');
      const cuentasUsuario = res.data.filter((c) => c.usuario === usuario.id);
      setCuentas(cuentasUsuario);
    } catch {
      setError('No se pudieron cargar las cuentas bancarias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCuentas();
  }, [usuario.id]);

  const handleRefreshTodo = () => {
    cargarCuentas();
    setRefreshKey((prev) => prev + 1); // Dispara la recarga del historial
  };

  const handleSaldoChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setSaldoDisplay('');
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('es-CO');
    setSaldoDisplay(formatted);
  };

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    if (!nombreCuenta.trim() || !saldoDisplay) return;

    const saldoNumerico = parseFloat(saldoDisplay.replace(/\./g, ''));

    try {
      setError('');
      await api.post('/cuentas/registrar/', {
        usuario: usuario.id,
        nombre: nombreCuenta.trim(),
        tipo: tipoCuenta,
        saldo: saldoNumerico,
      });

      setNombreCuenta('');
      setSaldoDisplay('');
      setTipoCuenta('Ahorros');
      setShowModal(false);
      handleRefreshTodo();
    } catch {
      setError('Ocurrió un error al registrar la cuenta bancaria.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>Mis Cuentas y Tarjetas</h2>
          <p style={styles.subtitle}>Gestiona tus fuentes de saldo disponibles.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          {cuentas.length >= 2 && (
            <button style={styles.transferButton} onClick={() => setShowTransferModal(true)}>
              <ArrowRightLeft size={18} style={{ marginRight: '8px' }} /> Transferir Saldo
            </button>
          )}
          <button style={styles.addButton} onClick={() => setShowModal(true)}>
            <PlusCircle size={18} style={{ marginRight: '8px' }} /> Nueva Cuenta
          </button>
        </div>
      </div>

      {loading ? (
        <p style={styles.infoText}>Cargando cuentas...</p>
      ) : cuentas.length === 0 ? (
        <div style={styles.emptyCard}>
          <Wallet size={48} color="#64748b" />
          <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
            Aún no tienes cuentas registradas. Agrega una para comenzar.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {cuentas.map((cuenta) => (
            <div
              key={cuenta.id}
              style={{ ...styles.accountCard, cursor: 'pointer' }}
              onClick={() => {
                setSelectedCuentaModal(cuenta);
                setShowDetailModal(true);
              }}
            >
              <div style={styles.cardHeader}>
                <div style={styles.iconBadge}>
                  {cuenta.tipo === 'Billetera Digital' ? (
                    <Wallet size={24} color="#a855f7" />
                  ) : cuenta.tipo === 'Tarjeta de Crédito' ? (
                    <CreditCard size={24} color="#f43f5e" />
                  ) : (
                    <Building2 size={24} color="#3b82f6" />
                  )}
                </div>
                <span style={styles.typeBadge}>{cuenta.tipo}</span>
              </div>
              <h3 style={styles.accountName}>{cuenta.nombre}</h3>
              <p style={styles.balanceLabel}>Saldo Libre Disponible</p>
              <p style={styles.balanceAmount}>
                ${Math.round(cuenta.saldo_disponible ?? cuenta.saldo).toLocaleString('es-CO')}
              </p>

              {cuenta.saldo_reservado_metas > 0 && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#c084fc', fontWeight: 'bold' }}>
                  🎯 Reservado: ${Math.round(cuenta.saldo_reservado_metas).toLocaleString('es-CO')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario Interactivo de Transacciones */}
      <TransactionForm
        usuario={usuario}
        cuentas={cuentas}
        onTransactionAdded={handleRefreshTodo}
      />

      {/* Historial de Transacciones con refreshKey dinámico */}
      <TransactionHistory
        key={refreshKey}
        usuario={usuario}
        cuentas={cuentas}
        onDataChanged={handleRefreshTodo}
      />

      {/* Modal de Registro de Cuenta Nueva */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3>Registrar Nueva Cuenta</h3>
            <p style={styles.subtitle}>Ingresa los detalles para crear tu fuente de saldo.</p>

            <form onSubmit={handleCrearCuenta} style={styles.form}>
              <label style={styles.label}>Nombre de la cuenta:</label>
              <input
                type="text"
                placeholder="Ej: Cuenta de Ahorros, Billetera 1"
                value={nombreCuenta}
                onChange={(e) => setNombreCuenta(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.label}>Tipo de cuenta:</label>
              <select
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                style={styles.select}
              >
                <option value="Ahorros">Cuenta de Ahorros</option>
                <option value="Corriente">Cuenta Corriente</option>
                <option value="Billetera Digital">Billetera Digital</option>
                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
              </select>

              <label style={styles.label}>Saldo inicial ($):</label>
              <input
                type="text"
                placeholder="80.000"
                value={saldoDisplay}
                onChange={handleSaldoChange}
                style={styles.input}
                required
              />

              {error && (
                <div style={styles.errorBox}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.saveButton}>
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestión Integral de Cuenta y Presupuestos */}
      <AccountDetailModal
        cuenta={selectedCuentaModal}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onAccountUpdated={handleRefreshTodo}
        onAccountDeleted={handleRefreshTodo}
      />

      {/* Modal de Transferencia entre Cuentas */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        usuario={usuario}
        cuentas={cuentas}
        onTransferSuccess={handleRefreshTodo}
      />
    </div>
  );
}

const styles = {
  container: { marginTop: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.2rem' },
  addButton: { display: 'flex', alignItems: 'center', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' },
  transferButton: { display: 'flex', alignItems: 'center', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  accountCard: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #334155' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  iconBadge: { backgroundColor: '#0f172a', padding: '0.5rem', borderRadius: '0.5rem' },
  typeBadge: { fontSize: '0.75rem', backgroundColor: '#334155', color: '#cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '1rem' },
  accountName: { fontSize: '1.2rem', fontWeight: 'bold', margin: '0.5rem 0' },
  balanceLabel: { fontSize: '0.8rem', color: '#94a3b8', marginTop: '1rem' },
  balanceAmount: { fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '0.2rem' },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', border: '2px dashed #334155' },
  infoText: { color: '#94a3b8' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '420px', border: '1px solid #475569' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' },
  label: { fontSize: '0.85rem', color: '#cbd5e1' },
  input: { padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', outline: 'none' },
  select: { padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', outline: 'none' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.2rem' },
  cancelButton: { padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: 'transparent', color: '#cbd5e1', cursor: 'pointer' },
  saveButton: { padding: '0.6rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.85rem' },
};
