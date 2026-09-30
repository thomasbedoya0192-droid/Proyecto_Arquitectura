import React, { useState, useEffect } from 'react';
import api from '../api';
import { TrendingUp, TrendingDown, ArrowRightLeft, Wallet, Filter, BarChart3, PieChart, Activity } from 'lucide-react';

export function AnalyticsDashboard({ usuario, cuentas: cuentasProp = [] }) {
  const [reporte, setReporte] = useState(null);
  const [cuentas, setCuentas] = useState(cuentasProp);
  const [loading, setLoading] = useState(true);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [error, setError] = useState(false);

  // Cargar cuentas si no fueron provistas desde las props
  useEffect(() => {
    const obtenerCuentas = async () => {
      if (!usuario?.id) return;
      try {
        const res = await api.get('/cuentas/');
        const misCuentas = res.data.filter((c) => c.usuario === usuario.id);
        setCuentas(misCuentas);
      } catch (e) {
        console.error('Error al obtener cuentas para analíticas:', e);
      }
    };

    if (!cuentasProp || cuentasProp.length === 0) {
      obtenerCuentas();
    } else {
      setCuentas(cuentasProp);
    }
  }, [usuario?.id, cuentasProp]);

  const cargarReporte = async () => {
    if (!usuario?.id) return;
    try {
      setLoading(true);
      setError(false);
      let url = `/transacciones/reporte/?usuario=${usuario.id}`;
      if (cuentaSeleccionada) {
        url += `&cuenta=${cuentaSeleccionada}`;
      }
      const res = await api.get(url);
      setReporte(res.data);
    } catch (err) {
      console.error('Error al cargar reporte analítico:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [usuario?.id, cuentaSeleccionada]);

  const resumen = reporte?.resumen || {
    total_ingresos: 0,
    total_gastos: 0,
    balance_neto: 0,
    total_transferencias_enviadas: 0,
    total_transferencias_recibidas: 0,
    cantidad_transacciones: 0,
  };

  const desgloseReciente = reporte?.desglose_reciente || [];

  // Porcentajes para barra visual
  const totalMovimientos = (resumen.total_ingresos || 0) + (resumen.total_gastos || 0) + (resumen.total_transferencias_enviadas || 0);
  const pctIngresos = totalMovimientos > 0 ? Math.round((resumen.total_ingresos / totalMovimientos) * 100) : 0;
  const pctGastos = totalMovimientos > 0 ? Math.round((resumen.total_gastos / totalMovimientos) * 100) : 0;
  const pctTransferencias = totalMovimientos > 0 ? Math.round((resumen.total_transferencias_enviadas / totalMovimientos) * 100) : 0;

  return (
    <div style={styles.container}>
      {/* Cabecera y Filtro de Cuentas */}
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Panel de Analíticas Financieras</h2>
          <p style={styles.subtitle}>Visión general de tus flujos de dinero, transferencias y balances.</p>
        </div>

        <div style={styles.filterBox}>
          <Filter size={16} color="#94a3b8" />
          <select
            value={cuentaSeleccionada}
            onChange={(e) => setCuentaSeleccionada(e.target.value)}
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
        <p style={styles.loadingText}>Cargando analíticas financieras...</p>
      ) : error ? (
        <div style={styles.errorCard}>
          <Activity size={36} color="#f87171" />
          <p style={{ marginTop: '0.8rem', color: '#cbd5e1' }}>No se pudieron obtener las analíticas en este momento.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas */}
          <div style={styles.metricsGrid}>
            <div style={{ ...styles.card, borderTop: '4px solid #10b981' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Total Ingresos</span>
                <TrendingUp size={20} color="#10b981" />
              </div>
              <p style={{ ...styles.amount, color: '#34d399' }}>
                ${Math.round(resumen.total_ingresos || 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #ef4444' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Total Gastos</span>
                <TrendingDown size={20} color="#ef4444" />
              </div>
              <p style={{ ...styles.amount, color: '#f87171' }}>
                ${Math.round(resumen.total_gastos || 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #3b82f6' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Transferencias Enviadas</span>
                <ArrowRightLeft size={20} color="#3b82f6" />
              </div>
              <p style={{ ...styles.amount, color: '#60a5fa' }}>
                ${Math.round(resumen.total_transferencias_enviadas || 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #8b5cf6' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Balance Neto</span>
                <Wallet size={20} color="#8b5cf6" />
              </div>
              <p
                style={{
                  ...styles.amount,
                  color: (resumen.balance_neto || 0) >= 0 ? '#38bdf8' : '#f87171',
                }}
              >
                ${Math.round(resumen.balance_neto || 0).toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          {/* Distribución de Flujo */}
          <div style={styles.chartSection}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <PieChart size={20} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Distribución Porcentual del Flujo</h3>
            </div>

            {totalMovimientos === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aún no hay suficientes movimientos para mostrar la distribución.</p>
            ) : (
              <div style={styles.progressContainer}>
                <div style={styles.progressLabels}>
                  <span style={{ color: '#34d399' }}>🟢 Ingresos: {pctIngresos}%</span>
                  <span style={{ color: '#f87171' }}>🔴 Gastos: {pctGastos}%</span>
                  <span style={{ color: '#60a5fa' }}>🔵 Transferencias: {pctTransferencias}%</span>
                </div>

                <div style={styles.progressBarTrack}>
                  <div style={{ ...styles.progressSegment, width: `${pctIngresos}%`, backgroundColor: '#10b981' }} />
                  <div style={{ ...styles.progressSegment, width: `${pctGastos}%`, backgroundColor: '#ef4444' }} />
                  <div style={{ ...styles.progressSegment, width: `${pctTransferencias}%`, backgroundColor: '#3b82f6' }} />
                </div>
              </div>
            )}
          </div>

          {/* Historial Desglosado */}
          <div style={styles.recentSection}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <BarChart3 size={20} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Desglose de Últimos Movimientos</h3>
            </div>

            {desgloseReciente.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay transacciones registradas para esta cuenta.</p>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Descripción</th>
                      <th style={styles.th}>Cuenta</th>
                      <th style={styles.th}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desgloseReciente.map((item) => {
                      const esIngreso = item.tipo === 'ingreso';
                      const esTrans = item.tipo === 'transferencia';
                      return (
                        <tr key={item.id} style={styles.tr}>
                          <td style={styles.td}>{item.fecha}</td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.badge,
                                backgroundColor: esTrans
                                  ? '#3b82f620'
                                  : esIngreso
                                  ? '#10b98120'
                                  : '#ef444420',
                                color: esTrans
                                  ? '#60a5fa'
                                  : esIngreso
                                  ? '#34d399'
                                  : '#f87171',
                              }}
                            >
                              {(item.tipo || '').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ ...styles.td, color: '#f8fafc' }}>{item.descripcion}</td>
                          <td style={styles.td}>{item.cuenta}</td>
                          <td
                            style={{
                              ...styles.td,
                              fontWeight: 'bold',
                              color: esTrans ? '#60a5fa' : esIngreso ? '#34d399' : '#f87171',
                            }}
                          >
                            ${Math.round(item.monto || 0).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { marginTop: '1.5rem', marginBottom: '3rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.2rem' },
  filterBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1e293b', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155' },
  selectFilter: { backgroundColor: 'transparent', color: '#f8fafc', border: 'none', outline: 'none', cursor: 'pointer' },
  loadingText: { color: '#94a3b8', textAlign: 'center', padding: '2rem 0' },
  errorCard: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', border: '1px solid #334155' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '1.8rem' },
  card: { backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid #334155' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' },
  cardTitle: { fontSize: '0.82rem', color: '#94a3b8', fontWeight: 'bold' },
  amount: { fontSize: '1.4rem', fontWeight: 'bold', margin: 0 },
  chartSection: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155', marginBottom: '1.8rem' },
  progressContainer: { marginTop: '0.8rem' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' },
  progressBarTrack: { height: '14px', backgroundColor: '#0f172a', borderRadius: '1rem', display: 'flex', overflow: 'hidden' },
  progressSegment: { height: '100%', transition: 'width 0.4s ease' },
  recentSection: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '1px solid #334155' },
  th: { padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' },
  tr: { borderBottom: '1px solid #334155' },
  td: { padding: '0.75rem', fontSize: '0.85rem', color: '#cbd5e1' },
  badge: { padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' },
};
