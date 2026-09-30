import React, { useState, useEffect } from 'react';
import api from '../api';
import { Target, Plus, PiggyBank, Calendar, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function GoalsManager({ usuario, cuentas, onRefreshData }) {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(null); // meta activa para abonar/liberar

  // Estado del formulario de nueva meta
  const [nombre, setNombre] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  // Estado del modal de abono/liberación
  const [montoAbono, setMontoAbono] = useState('');
  const [accion, setAccion] = useState('abonar'); // 'abonar' o 'liberar'
  const [errorMsg, setErrorMsg] = useState('');

  const cargarMetas = async () => {
    if (!usuario?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/metas/?usuario=${usuario.id}`);
      setMetas(res.data);
    } catch (err) {
      console.error('Error al cargar metas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetas();
  }, [usuario?.id]);

  const handleCrearMeta = async (e) => {
    e.preventDefault();
    if (!nombre || !cuentaId || !montoObjetivo) return;

    try {
      await api.post('/metas/', {
        usuario: usuario.id,
        cuenta: cuentaId,
        nombre,
        monto_objetivo: parseFloat(montoObjetivo),
        fecha_limite: fechaLimite || null,
      });

      setNombre('');
      setCuentaId('');
      setMontoObjetivo('');
      setFechaLimite('');
      setShowModal(false);
      cargarMetas();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error al crear meta:', err);
    }
  };

  const handleProcesarAbono = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!montoAbono || !showAbonoModal) return;

    try {
      await api.post(`/metas/${showAbonoModal.id}/abonar/`, {
        monto: parseFloat(montoAbono),
        accion: accion,
      });

      setMontoAbono('');
      setShowAbonoModal(null);
      cargarMetas();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al procesar el abono.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Metas Financieras de Ahorro</h2>
          <p style={styles.subtitle}>Aparta saldo de tus cuentas para alcanzar tus objetivos sin gastarlo por impulso.</p>
        </div>

        <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nueva Meta
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Cargando metas de ahorro...</p>
      ) : metas.length === 0 ? (
        <div style={styles.emptyCard}>
          <Target size={40} color="#8b5cf6" />
          <p style={{ marginTop: '0.8rem', color: '#cbd5e1' }}>No tienes metas de ahorro activas.</p>
          <button style={styles.btnSecondary} onClick={() => setShowModal(true)}>Crear mi primera meta</button>
        </div>
      ) : (
        <div style={styles.grid}>
          {metas.map((meta) => (
            <div key={meta.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.metaTitle}>{meta.nombre}</h3>
                  <span style={styles.cuentaBadge}>
                    <Wallet size={12} /> {meta.nombre_cuenta}
                  </span>
                </div>
                <PiggyBank size={24} color="#8b5cf6" />
              </div>

              {/* Barra de progreso */}
              <div style={{ marginTop: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>Abonado: ${Math.round(meta.monto_actual).toLocaleString('es-CO')}</span>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{meta.progreso_porcentaje}%</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressBar, width: `${meta.progreso_porcentaje}%` }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem', textAlign: 'right' }}>
                  Meta: ${Math.round(meta.monto_objetivo).toLocaleString('es-CO')}
                </div>
              </div>

              {meta.fecha_limite && (
                <div style={styles.dateLabel}>
                  <Calendar size={13} color="#94a3b8" />
                  <span>Límite: {meta.fecha_limite}</span>
                </div>
              )}

              <button
                style={styles.btnAction}
                onClick={() => {
                  setShowAbonoModal(meta);
                  setErrorMsg('');
                }}
              >
                Gestonar Saldo (Abonar / Liberar)
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Meta */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Crear Nueva Meta de Ahorro</h3>
            <form onSubmit={handleCrearMeta} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="Nombre de la meta (ej. Viaje, Fondo de Emergencia)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={styles.input}
                required
              />

              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                style={styles.input}
                required
              >
                <option value="">Selecciona la cuenta de origen</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Disponible: ${Math.round(c.saldo_disponible || c.saldo).toLocaleString('es-CO')})
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Monto Objetivo ($)"
                value={montoObjetivo}
                onChange={(e) => setMontoObjetivo(e.target.value)}
                style={styles.input}
                required
              />

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Fecha Límite (Opcional)</label>
                <input
                  type="date"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.btnCancel}>Cancelar</button>
                <button type="submit" style={styles.btnPrimary}>Guardar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abonar / Liberar */}
      {showAbonoModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Gestionar Saldo: {showAbonoModal.nombre}</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Cuenta: {showAbonoModal.nombre_cuenta}</p>

            {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

            <form onSubmit={handleProcesarAbono} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: accion === 'abonar' ? '#8b5cf6' : '#1e293b',
                  }}
                  onClick={() => setAccion('abonar')}
                >
                  <ArrowUpRight size={16} /> Abonar (Apartar)
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: accion === 'liberar' ? '#ef4444' : '#1e293b',
                  }}
                  onClick={() => setAccion('liberar')}
                >
                  <ArrowDownRight size={16} /> Liberar Saldo
                </button>
              </div>

              <input
                type="number"
                placeholder="Monto ($)"
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
                style={styles.input}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAbonoModal(null)} style={styles.btnCancel}>Cancelar</button>
                <button type="submit" style={styles.btnPrimary}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { marginTop: '1rem', marginBottom: '3rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.2rem' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' },
  btnSecondary: { backgroundColor: '#334155', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', marginTop: '1rem', cursor: 'pointer' },
  emptyCard: { backgroundColor: '#1e293b', padding: '3rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid #334155' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' },
  card: { backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaTitle: { fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#f8fafc' },
  cuentaBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem' },
  progressTrack: { height: '10px', backgroundColor: '#0f172a', borderRadius: '1rem', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#8b5cf6', transition: 'width 0.4s ease' },
  dateLabel: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.8rem' },
  btnAction: { marginTop: '1.2rem', width: '100%', backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 },
  modalContent: { backgroundColor: '#1e293b', padding: '1.8rem', borderRadius: '0.75rem', width: '90%', maxWidth: '420px', border: '1px solid #334155' },
  input: { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', width: '100%', boxSizing: 'border-box' },
  btnCancel: { backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', cursor: 'pointer' },
  toggleBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' },
  errorBanner: { backgroundColor: '#ef444420', color: '#f87171', border: '1px solid #ef4444', padding: '0.6rem', borderRadius: '0.5rem', fontSize: '0.82rem', marginTop: '0.5rem' },
};
