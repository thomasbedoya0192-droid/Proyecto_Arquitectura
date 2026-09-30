import React, { useState, useEffect } from 'react';
import api from '../api';
import { SERVICES_CATALOG } from './SubscriptionsManager';
import {
  X,
  Trash2,
  Save,
  CreditCard,
  Wallet,
  Building2,
  AlertTriangle,
  ShieldCheck,
  Repeat,
  PlusCircle,
  Calendar,
} from 'lucide-react';

export function AccountDetailModal({
  cuenta,
  isOpen,
  onClose,
  onAccountUpdated,
  onAccountDeleted,
}) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' o 'subscriptions'
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Ahorros');
  const [topeDisplay, setTopeDisplay] = useState('');
  const [gastosMesActual, setGastosMesActual] = useState(0);

  // Estados para Suscripciones vinculadas
  const [suscripcionesCuenta, setSuscripcionesCuenta] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);

  // Formulario de nueva suscripción en la tarjeta
  const [presetId, setPresetId] = useState('netflix');
  const [nombreSub, setNombreSub] = useState('Netflix');
  const [montoSubDisplay, setMontoSubDisplay] = useState('');
  const [frecuenciaSub, setFrecuenciaSub] = useState('Mensual');
  const [fechaPagoSub, setFechaPagoSub] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargarSuscripcionesCuenta = async (cuentaId) => {
    try {
      setLoadingSubs(true);
      const res = await api.get(`/suscripciones/?cuenta=${cuentaId}`);
      setSuscripcionesCuenta(res.data);
    } catch {
      // Manejo silencioso
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    if (cuenta) {
      setNombre(cuenta.nombre || '');
      setTipo(cuenta.tipo || 'Ahorros');

      const tope = parseFloat(cuenta.tope_gasto_mensual || 0);
      setTopeDisplay(tope > 0 ? Math.round(tope).toLocaleString('es-CO') : '');

      // Cargar gastos acumulados del mes para la barra de presupuesto
      const cargarGastos = async () => {
        try {
          const res = await api.get(
            `/transacciones/?cuenta=${cuenta.id}&tipo=gasto`
          );
          const totalGastos = res.data.reduce(
            (acc, t) => acc + parseFloat(t.monto),
            0
          );
          setGastosMesActual(totalGastos);
        } catch {
          // Manejo silencioso
        }
      };

      cargarGastos();
      cargarSuscripcionesCuenta(cuenta.id);
    }
  }, [cuenta]);

  if (!isOpen || !cuenta) return null;

  const handleTopeChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setTopeDisplay('');
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('es-CO');
    setTopeDisplay(formatted);
  };

  const handleMontoSubChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setMontoSubDisplay('');
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('es-CO');
    setMontoSubDisplay(formatted);
  };

  const handleGuardarCambios = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const topeNumerico = topeDisplay
      ? parseFloat(topeDisplay.replace(/\./g, ''))
      : 0;

    try {
      setLoading(true);
      setError('');
      await api.put(`/cuentas/${cuenta.id}/`, {
        nombre: nombre.trim(),
        tipo: tipo,
        tope_gasto_mensual: topeNumerico,
      });
      onAccountUpdated();
      onClose();
    } catch {
      setError('No se pudieron guardar los cambios en la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (id) => {
    setPresetId(id);
    const item = SERVICES_CATALOG.find((s) => s.id === id);
    if (item && id !== 'otro') {
      setNombreSub(item.name);
    } else if (id === 'otro') {
      setNombreSub('');
    }
  };

  const handleCrearSuscripcionCuenta = async (e) => {
    e.preventDefault();
    if (!nombreSub.trim() || !montoSubDisplay || !fechaPagoSub) return;

    const montoNumerico = parseFloat(montoSubDisplay.replace(/\./g, ''));

    try {
      setError('');
      await api.post('/suscripciones/', {
        usuario: cuenta.usuario,
        cuenta: cuenta.id,
        nombre: nombreSub.trim(),
        servicio_preset: presetId,
        monto: montoNumerico,
        frecuencia: frecuenciaSub,
        fecha_proximo_pago: fechaPagoSub,
      });

      setShowSubForm(false);
      setMontoSubDisplay('');
      setFechaPagoSub('');
      await cargarSuscripcionesCuenta(cuenta.id); // Recargar la lista local del modal
      onAccountUpdated(); // Notificar al componente padre para refrescar
    } catch {
      setError('Ocurrió un error al vincular la suscripción a esta cuenta.');
    }
  };

  const handleEliminarSuscripcion = async (id) => {
    try {
      await api.delete(`/suscripciones/${id}/`);
      cargarSuscripcionesCuenta(cuenta.id);
    } catch {
      setError('No se pudo eliminar la suscripción.');
    }
  };

  const handleEliminar = async () => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar la cuenta "${cuenta.nombre}"? Se borrarán también todas sus transacciones vinculadas.`
    );
    if (!confirmar) return;

    try {
      setLoading(true);
      await api.delete(`/cuentas/${cuenta.id}/`);
      onAccountDeleted();
      onClose();
    } catch {
      setError('Ocurrió un error al eliminar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  // Cálculo del consumo del presupuesto
  const topeActual = parseFloat(cuenta.tope_gasto_mensual || 0);
  const porcentajeConsumido =
    topeActual > 0
      ? Math.min(Math.round((gastosMesActual / topeActual) * 100), 100)
      : 0;

  const getBarColor = () => {
    if (porcentajeConsumido >= 100) return '#ef4444';
    if (porcentajeConsumido >= 80) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del Modal */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={styles.iconBadge}>
              {tipo === 'Billetera Digital' ? (
                <Wallet size={22} color="#a855f7" />
              ) : tipo === 'Tarjeta de Crédito' ? (
                <CreditCard size={22} color="#f43f5e" />
              ) : (
                <Building2 size={22} color="#3b82f6" />
              )}
            </div>
            <div>
              <h3 style={styles.modalTitle}>{cuenta.nombre}</h3>
              <span style={styles.subtitle}>Gestión de cuenta y servicios</span>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#cbd5e1" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        {/* Resumen de Saldos de la Cuenta */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '0.9rem 1.1rem',
          borderRadius: '0.6rem',
          border: '1px solid #334155',
          marginBottom: '1.2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block' }}>Saldo Libre Disponible</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8' }}>
              ${Math.round(cuenta.saldo_disponible ?? cuenta.saldo).toLocaleString('es-CO')}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block' }}>Saldo Total en Cuenta</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#f8fafc' }}>
              ${Math.round(cuenta.saldo).toLocaleString('es-CO')}
            </span>
            {cuenta.saldo_reservado_metas > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#c084fc', display: 'block', fontWeight: 'bold', marginTop: '0.1rem' }}>
                🎯 Reservado: ${Math.round(cuenta.saldo_reservado_metas).toLocaleString('es-CO')}
              </span>
            )}
          </div>
        </div>
        <div style={styles.tabsRow}>
          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'general' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('general')}
          >
            Ajustes y Presupuesto
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'subscriptions' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('subscriptions')}
          >
            Suscripciones ({suscripcionesCuenta.length})
          </button>
        </div>

        {activeTab === 'general' ? (
          <div>
            {/* Medidor de Presupuesto / Tope Mensual */}
            {topeActual > 0 ? (
              <div style={styles.budgetCard}>
                <div style={styles.budgetHeader}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {porcentajeConsumido >= 80 ? (
                      <AlertTriangle size={18} color={getBarColor()} />
                    ) : (
                      <ShieldCheck size={18} color={getBarColor()} />
                    )}
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                      Consumo del Presupuesto Mensual
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    ${Math.round(gastosMesActual).toLocaleString('es-CO')} /$
                    {Math.round(topeActual).toLocaleString('es-CO')}
                  </span>
                </div>

                <div style={styles.barBg}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${porcentajeConsumido}%`,
                      backgroundColor: getBarColor(),
                    }}
                  />
                </div>

                <p style={{ ...styles.budgetStatusText, color: getBarColor() }}>
                  {porcentajeConsumido >= 100
                    ? '¡Atención! Has alcanzado o superado el tope de gasto establecido para esta cuenta.'
                    : porcentajeConsumido >= 80
                    ? 'Advertencia: Te estás aproximando al límite de gasto mensual.'
                    : `Has consumido el ${porcentajeConsumido}% de tu presupuesto mensual.`}
                </p>
              </div>
            ) : (
              <div style={styles.noBudgetCard}>
                <p
                  style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}
                >
                  Sin tope de gasto configurado. Define un valor en el campo de
                  abajo para monitorear tus alertas.
                </p>
              </div>
            )}

            {/* Formulario de Edición */}
            <form onSubmit={handleGuardarCambios} style={styles.form}>
              <label style={styles.label}>Nombre de la Cuenta:</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.label}>Tipo de Cuenta:</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                style={styles.select}
              >
                <option value="Ahorros">Cuenta de Ahorros</option>
                <option value="Corriente">Cuenta Corriente</option>
                <option value="Billetera Digital">Billetera Digital</option>
                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
              </select>

              <label style={styles.label}>
                Tope Máximo de Gasto Mensual ($):
              </label>
              <input
                type="text"
                placeholder="Ej: 500.000"
                value={topeDisplay}
                onChange={handleTopeChange}
                style={styles.input}
              />

              {error && <p style={styles.errorText}>{error}</p>}

              <div style={styles.actionsRow}>
                <button
                  type="button"
                  style={styles.deleteBtn}
                  onClick={handleEliminar}
                  disabled={loading}
                >
                  <Trash2 size={16} style={{ marginRight: '6px' }} /> Eliminar
                  Cuenta
                </button>

                <button type="submit" style={styles.saveBtn} disabled={loading}>
                  <Save size={16} style={{ marginRight: '6px' }} /> Guardar
                  Cambios
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Pestaña de Suscripciones Vinculadas a esta Cuenta */
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Cobros automáticos ligados a {cuenta.nombre}
              </span>
              <button
                type="button"
                style={styles.subAddBtn}
                onClick={() => setShowSubForm(!showSubForm)}
              >
                <PlusCircle size={15} style={{ marginRight: '4px' }} />
                {showSubForm ? 'Cancelar' : 'Vincular Servicio'}
              </button>
            </div>

            {/* Formulario desplegable para agregar suscripción */}
            {showSubForm && (
              <form
                onSubmit={handleCrearSuscripcionCuenta}
                style={styles.subFormContainer}
              >
                <label style={styles.label}>Servicio:</label>
                <select
                  value={presetId}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  style={styles.select}
                >
                  {SERVICES_CATALOG.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {presetId === 'otro' && (
                  <input
                    type="text"
                    placeholder="Nombre del servicio"
                    value={nombreSub}
                    onChange={(e) => setNombreSub(e.target.value)}
                    style={styles.input}
                    required
                  />
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Monto ($)"
                    value={montoSubDisplay}
                    onChange={handleMontoSubChange}
                    style={{ ...styles.input, flex: 1 }}
                    required
                  />
                  <select
                    value={frecuenciaSub}
                    onChange={(e) => setFrecuenciaSub(e.target.value)}
                    style={{ ...styles.select, width: '110px' }}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>

                <input
                  type="date"
                  value={fechaPagoSub}
                  onChange={(e) => setFechaPagoSub(e.target.value)}
                  style={styles.input}
                  required
                />

                <button type="submit" style={styles.saveBtnSub}>
                  Guardar Suscripción
                </button>
              </form>
            )}

            {/* Lista de Suscripciones */}
            {loadingSubs ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Cargando suscripciones...
              </p>
            ) : suscripcionesCuenta.length === 0 ? (
              <div style={styles.emptySubsBox}>
                <Repeat size={32} color="#64748b" />
                <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No hay suscripciones vinculadas a esta cuenta.
                </p>
              </div>
            ) : (
              <div style={styles.subsList}>
                {suscripcionesCuenta.map((sub) => {
                  const presetInfo = SERVICES_CATALOG.find(
                    (s) => s.id === sub.servicio_preset
                  ) || { color: '#8b5cf6' };

                  return (
                    <div
                      key={sub.id}
                      style={{
                        ...styles.subItem,
                        borderLeft: `4px solid ${presetInfo.color}`,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {sub.nombre}
                        </span>
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold' }}>
                            ${Math.round(parseFloat(sub.monto)).toLocaleString('es-CO')} /{sub.frecuencia.toLowerCase()}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            <Calendar size={12} style={{ marginRight: '3px' }} /> {sub.fecha_proximo_pago}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEliminarSuscripcion(sub.id)}
                        style={styles.deleteSubBtn}
                        title="Eliminar suscripción"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
    maxWidth: '480px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.2rem',
  },
  iconBadge: {
    backgroundColor: '#0f172a',
    padding: '0.6rem',
    borderRadius: '0.5rem',
  },
  modalTitle: { fontSize: '1.15rem', margin: 0, color: '#f8fafc' },
  subtitle: { fontSize: '0.8rem', color: '#94a3b8' },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '1px solid #334155',
    marginBottom: '1.2rem',
  },
  tabBtn: {
    flex: 1,
    padding: '0.6rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  activeTab: {
    color: '#8b5cf6',
    borderBottomColor: '#8b5cf6',
    fontWeight: 'bold',
  },
  budgetCard: {
    backgroundColor: '#0f172a',
    padding: '1rem',
    borderRadius: '0.6rem',
    border: '1px solid #334155',
    marginBottom: '1.2rem',
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.6rem',
  },
  barBg: {
    height: '8px',
    backgroundColor: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: { height: '100%', transition: 'width 0.4s ease' },
  budgetStatusText: {
    fontSize: '0.78rem',
    marginTop: '0.6rem',
    marginBottom: 0,
  },
  noBudgetCard: {
    backgroundColor: '#0f172a',
    padding: '0.8rem 1rem',
    borderRadius: '0.6rem',
    border: '1px dashed #334155',
    marginBottom: '1.2rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  label: { fontSize: '0.82rem', color: '#cbd5e1' },
  input: {
    padding: '0.65rem',
    borderRadius: '0.5rem',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    outline: 'none',
  },
  select: {
    padding: '0.65rem',
    borderRadius: '0.5rem',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    outline: 'none',
  },
  errorText: { color: '#f87171', fontSize: '0.8rem', margin: 0 },
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1.2rem',
    gap: '0.8rem',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  subAddBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.4rem',
    fontSize: '0.78rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  subFormContainer: {
    backgroundColor: '#0f172a',
    padding: '0.8rem',
    borderRadius: '0.6rem',
    border: '1px solid #334155',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  saveBtnSub: {
    padding: '0.5rem',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    borderRadius: '0.4rem',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    cursor: 'pointer',
    marginTop: '0.3rem',
  },
  emptySubsBox: {
    backgroundColor: '#0f172a',
    borderRadius: '0.6rem',
    padding: '2rem',
    textAlign: 'center',
    border: '1px dashed #334155',
  },
  subsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  subItem: {
    backgroundColor: '#0f172a',
    padding: '0.7rem 0.9rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteSubBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
  },
};
