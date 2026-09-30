import React, { useState, useEffect } from 'react';
import api from '../api';
import { PlusCircle, Trash2, Calendar, Filter, Repeat, AlertCircle, Wallet, Edit2 } from 'lucide-react';

export const SERVICES_CATALOG = [
  { id: 'netflix', name: 'Netflix', color: '#E50914' },
  { id: 'spotify', name: 'Spotify', color: '#1DB954' },
  { id: 'amazon_prime', name: 'Amazon Prime', color: '#00A8E1' },
  { id: 'disney_plus', name: 'Disney+', color: '#113CCF' },
  { id: 'youtube_premium', name: 'YouTube Premium', color: '#FF0000' },
  { id: 'apple_music', name: 'Apple Music', color: '#FA243C' },
  { id: 'max', name: 'Max (HBO)', color: '#002BE7' },
  { id: 'paramount_plus', name: 'Paramount+', color: '#0064FF' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783' },
  { id: 'crunchyroll', name: 'Crunchyroll', color: '#F47521' },
  { id: 'apple_tv', name: 'Apple TV+', color: '#D1D5DB' },
  { id: 'xbox_game_pass', name: 'Xbox Game Pass', color: '#107C41' },
  { id: 'playstation_plus', name: 'PlayStation Plus', color: '#00439C' },
  { id: 'nintendo_switch', name: 'Nintendo Switch Online', color: '#E60012' },
  { id: 'adobe_cc', name: 'Adobe Creative Cloud', color: '#FF0000' },
  { id: 'microsoft_365', name: 'Microsoft 365', color: '#D83B01' },
  { id: 'google_one', name: 'Google One', color: '#4285F4' },
  { id: 'icloud', name: 'iCloud+', color: '#38BDF8' },
  { id: 'dropbox', name: 'Dropbox', color: '#0061FE' },
  { id: 'canva_pro', name: 'Canva Pro', color: '#00C4CC' },
  { id: 'duolingo_super', name: 'Duolingo Super', color: '#58CC02' },
  { id: 'linkedin_premium', name: 'LinkedIn Premium', color: '#0A66C2' },
  { id: 'audible', name: 'Audible', color: '#F8991C' },
  { id: 'dazn', name: 'DAZN', color: '#F8FAF2' },
  { id: 'twitch', name: 'Twitch', color: '#9146FF' },
  { id: 'otro', name: 'Otro / Personalizado', color: '#8B5CF6' },
];

export function SubscriptionsManager({ usuario, cuentas }) {
  const [suscripciones, setSuscripciones] = useState([]);
  const [selectedCuentaFilter, setSelectedCuentaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null); // ID de la suscripción a editar
  const [error, setError] = useState('');

  // Formulario
  const [presetId, setPresetId] = useState('netflix');
  const [nombrePersonalizado, setNombrePersonalizado] = useState('Netflix');
  const [cuentaId, setCuentaId] = useState('');
  const [montoDisplay, setMontoDisplay] = useState('');
  const [frecuencia, setFrecuencia] = useState('Mensual');
  const [fechaPago, setFechaPago] = useState('');

  useEffect(() => {
    if (cuentas && cuentas.length > 0 && !cuentaId) {
      setCuentaId(cuentas[0].id);
    }
  }, [cuentas, cuentaId]);

  const cargarSuscripciones = async () => {
    try {
      setLoading(true);
      let url = `/suscripciones/?usuario=${usuario.id}`;
      if (selectedCuentaFilter) {
        url += `&cuenta=${selectedCuentaFilter}`;
      }
      const res = await api.get(url);
      setSuscripciones(res.data);
    } catch {
      setError('No se pudieron cargar las suscripciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSuscripciones();
  }, [usuario.id, selectedCuentaFilter]);

  const abrirModalNuevo = () => {
    setEditingSubId(null);
    setPresetId('netflix');
    setNombrePersonalizado('Netflix');
    setCuentaId(cuentas[0]?.id || '');
    setMontoDisplay('');
    setFrecuencia('Mensual');
    setFechaPago('');
    setError('');
    setShowModal(true);
  };

  const abrirModalEditar = (sub) => {
    setEditingSubId(sub.id);
    setPresetId(sub.servicio_preset || 'otro');
    setNombrePersonalizado(sub.nombre);
    setCuentaId(sub.cuenta);
    setMontoDisplay(Math.round(parseFloat(sub.monto)).toLocaleString('es-CO'));
    setFrecuencia(sub.frecuencia);
    setFechaPago(sub.fecha_proximo_pago);
    setError('');
    setShowModal(true);
  };

  const handlePresetSelect = (id) => {
    setPresetId(id);
    const item = SERVICES_CATALOG.find((s) => s.id === id);
    if (item && id !== 'otro') {
      setNombrePersonalizado(item.name);
    } else if (id === 'otro') {
      setNombrePersonalizado('');
    }
  };

  const handleMontoChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setMontoDisplay('');
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('es-CO');
    setMontoDisplay(formatted);
  };

  const handleGuardarSuscripcion = async (e) => {
    e.preventDefault();
    if (!nombrePersonalizado.trim() || !montoDisplay || !cuentaId || !fechaPago) return;

    const montoNumerico = parseFloat(montoDisplay.replace(/\./g, ''));

    const payload = {
      usuario: usuario.id,
      cuenta: parseInt(cuentaId),
      nombre: nombrePersonalizado.trim(),
      servicio_preset: presetId,
      monto: montoNumerico,
      frecuencia: frecuencia,
      fecha_proximo_pago: fechaPago,
    };

    try {
      setError('');
      if (editingSubId) {
        await api.put(`/suscripciones/${editingSubId}/`, payload);
      } else {
        await api.post('/suscripciones/', payload);
      }

      setShowModal(false);
      cargarSuscripciones();
    } catch {
      setError('Ocurrió un error al guardar la suscripción.');
    }
  };

  const handleEliminarSuscripcion = async (id, nombre) => {
    const confirmar = window.confirm(`¿Deseas cancelar y eliminar la suscripción "${nombre}"?`);
    if (!confirmar) return;

    try {
      await api.delete(`/suscripciones/${id}/`);
      cargarSuscripciones();
    } catch {
      setError('No se pudo eliminar la suscripción.');
    }
  };

  const gastoMensualTotal = suscripciones.reduce((acc, s) => {
    const monto = parseFloat(s.monto);
    return acc + (s.frecuencia === 'Anual' ? monto / 12 : monto);
  }, 0);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Gestión de Suscripciones Recurrentes</h2>
          <p style={styles.subtitle}>Monitorea tus servicios de pago automático mensual o anual.</p>
        </div>

        <button style={styles.addBtn} onClick={abrirModalNuevo}>
          <PlusCircle size={18} style={{ marginRight: '6px' }} /> Nueva Suscripción
        </button>
      </div>

      <div style={styles.summaryBar}>
        <div style={styles.totalBox}>
          <Repeat color="#8b5cf6" size={24} />
          <div>
            <span style={styles.totalLabel}>Gasto Estimado Mensual en Suscripciones</span>
            <p style={styles.totalAmount}>
              ${Math.round(gastoMensualTotal).toLocaleString('es-CO')} / mes
            </p>
          </div>
        </div>

        <div style={styles.filterBox}>
          <Filter size={18} color="#94a3b8" />
          <select
            value={selectedCuentaFilter}
            onChange={(e) => setSelectedCuentaFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">Todas las cuentas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.tipo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Cargando suscripciones...</p>
      ) : suscripciones.length === 0 ? (
        <div style={styles.emptyCard}>
          <Repeat size={44} color="#64748b" />
          <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
            No tienes suscripciones registradas {selectedCuentaFilter ? 'para esta cuenta' : ''}.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {suscripciones.map((sub) => {
            const presetInfo = SERVICES_CATALOG.find((s) => s.id === sub.servicio_preset) || {
              color: '#8b5cf6',
            };

            return (
              <div key={sub.id} style={{ ...styles.card, borderLeft: `5px solid ${presetInfo.color}` }}>
                <div style={styles.cardTop}>
                  <h3 style={styles.cardTitle}>{sub.nombre}</h3>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => abrirModalEditar(sub)}
                      style={styles.iconBtn}
                      title="Editar suscripción"
                    >
                      <Edit2 size={16} color="#38bdf8" />
                    </button>
                    <button
                      onClick={() => handleEliminarSuscripcion(sub.id, sub.nombre)}
                      style={styles.iconBtn}
                      title="Eliminar suscripción"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>

                <p style={styles.cardMonto}>
                  ${Math.round(parseFloat(sub.monto)).toLocaleString('es-CO')}{' '}
                  <span style={styles.freqText}>/{sub.frecuencia.toLowerCase()}</span>
                </p>

                <div style={styles.cardFooter}>
                  <span style={styles.infoBadge}>
                    <Wallet size={14} style={{ marginRight: '4px' }} />
                    {sub.nombre_cuenta}
                  </span>

                  <span style={styles.infoBadge}>
                    <Calendar size={14} style={{ marginRight: '4px' }} />
                    Próximo: {sub.fecha_proximo_pago}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.4rem 0' }}>
              {editingSubId ? 'Editar Suscripción' : 'Registrar Nueva Suscripción'}
            </h3>
            <p style={styles.subtitle}>
              {editingSubId ? 'Actualiza los datos de cobro.' : 'Elige una plataforma o ingresa una personalizada.'}
            </p>

            <form onSubmit={handleGuardarSuscripcion} style={styles.form}>
              <label style={styles.label}>Servicio / Plataforma:</label>
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
                <>
                  <label style={styles.label}>Nombre de la Suscripción:</label>
                  <input
                    type="text"
                    placeholder="Ej: Servidor VPS, Licencia Software"
                    value={nombrePersonalizado}
                    onChange={(e) => setNombrePersonalizado(e.target.value)}
                    style={styles.input}
                    required
                  />
                </>
              )}

              <label style={styles.label}>Cuenta/Tarjeta asociada:</label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                style={styles.select}
                required
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (${Math.round(parseFloat(c.saldo)).toLocaleString('es-CO')})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Monto del Cobro ($):</label>
                  <input
                    type="text"
                    placeholder="39.900"
                    value={montoDisplay}
                    onChange={handleMontoChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Frecuencia:</label>
                  <select
                    value={frecuencia}
                    onChange={(e) => setFrecuencia(e.target.value)}
                    style={styles.select}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              </div>

              <label style={styles.label}>Fecha del Próximo Cobro:</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
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
                  style={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.saveBtn}>
                  {editingSubId ? 'Guardar Cambios' : 'Guardar Suscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { marginTop: '1.5rem', marginBottom: '3rem' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '0.5rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  summaryBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: '1.2rem 1.5rem',
    borderRadius: '0.75rem',
    border: '1px solid #334155',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  totalBox: { display: 'flex', alignItems: 'center', gap: '1rem' },
  totalLabel: { fontSize: '0.82rem', color: '#94a3b8' },
  totalAmount: { fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8', margin: 0 },
  filterBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    backgroundColor: '#0f172a',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
  },
  selectFilter: { backgroundColor: 'transparent', color: '#f8fafc', border: 'none', outline: 'none', cursor: 'pointer' },
  loadingText: { color: '#94a3b8', textAlign: 'center', marginTop: '1.5rem' },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: '0.75rem',
    padding: '3rem',
    textAlign: 'center',
    border: '2px dashed #334155',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.2rem',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '0.75rem',
    padding: '1.2rem',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 'bold', margin: 0 },
  iconBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem' },
  cardMonto: { fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8', margin: '0.6rem 0' },
  freqText: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', borderTop: '1px solid #334155', paddingTop: '0.6rem' },
  infoBadge: { display: 'flex', alignItems: 'center', fontSize: '0.78rem', color: '#cbd5e1' },
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
    maxWidth: '440px',
    border: '1px solid #334155',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.8rem' },
  label: { fontSize: '0.82rem', color: '#cbd5e1' },
  input: { padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', outline: 'none' },
  select: { padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', outline: 'none' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.82rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: 'transparent', color: '#cbd5e1', cursor: 'pointer' },
  saveBtn: { padding: '0.6rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
};
