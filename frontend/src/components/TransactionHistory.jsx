import React, { useState, useEffect } from 'react';
import api from '../api';
import { ArrowUpRight, ArrowDownLeft, Trash2, Filter, ArrowRightLeft } from 'lucide-react';

export function TransactionHistory({ usuario, cuentas, onDataChanged }) {
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState(''); // '', 'ingreso', 'gasto', 'transferencia'
  const [cuentaFiltro, setCuentaFiltro] = useState('');

  const cargarTransacciones = async () => {
    try {
      setLoading(true);
      let url = `/transacciones/?usuario=${usuario.id}`;
      if (tipoFiltro) url += `&tipo=${tipoFiltro}`;
      if (cuentaFiltro) url += `&cuenta=${cuentaFiltro}`;

      const res = await api.get(url);
      setTransacciones(res.data);
    } catch {
      // Manejo silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.id) {
      cargarTransacciones();
    }
  }, [usuario?.id, tipoFiltro, cuentaFiltro]);

  const handleEliminar = async (id) => {
    const confirmar = window.confirm('¿Deseas eliminar esta transacción? Se revertirá el saldo correspondiente.');
    if (!confirmar) return;

    try {
      await api.delete(`/transacciones/${id}/`);
      cargarTransacciones();
      if (onDataChanged) onDataChanged();
    } catch {
      alert('Ocurrió un error al eliminar la transacción.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Historial de Movimientos</h3>

        <div style={styles.filtersRow}>
          <div style={styles.filterBox}>
            <Filter size={16} color="#94a3b8" />
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">Todos los tipos</option>
              <option value="ingreso">Solo Ingresos</option>
              <option value="gasto">Solo Gastos</option>
              <option value="transferencia">Solo Transferencias</option>
            </select>
          </div>

          <div style={styles.filterBox}>
            <select
              value={cuentaFiltro}
              onChange={(e) => setCuentaFiltro(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">Todas las cuentas</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Cargando movimientos...</p>
      ) : transacciones.length === 0 ? (
        <p style={styles.emptyText}>No hay movimientos registrados con los filtros seleccionados.</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Descripción</th>
                <th style={styles.th}>Cuenta</th>
                <th style={styles.th}>Monto</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map((t) => {
                const esIngreso = t.tipo === 'ingreso';
                const esTransferencia = t.tipo === 'transferencia';
                const esEnviada = t.descripcion?.includes('enviada');

                return (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.td}>
                      {esTransferencia ? (
                        <span style={{ ...styles.badge, backgroundColor: '#3b82f620', color: '#60a5fa' }}>
                          <ArrowRightLeft size={14} style={{ marginRight: '4px' }} /> Transferencia
                        </span>
                      ) : esIngreso ? (
                        <span style={{ ...styles.badge, backgroundColor: '#10b98120', color: '#34d399' }}>
                          <ArrowDownLeft size={14} style={{ marginRight: '4px' }} /> Ingreso
                        </span>
                      ) : (
                        <span style={{ ...styles.badge, backgroundColor: '#ef444420', color: '#f87171' }}>
                          <ArrowUpRight size={14} style={{ marginRight: '4px' }} /> Gasto
                        </span>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: '#f8fafc' }}>{t.descripcion || 'Sin descripción'}</td>
                    <td style={styles.td}>{t.nombre_cuenta || 'Cuenta'}</td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: 'bold',
                        color: esTransferencia
                          ? esEnviada ? '#f87171' : '#34d399'
                          : esIngreso ? '#34d399' : '#f87171',
                      }}
                    >
                      {esTransferencia
                        ? esEnviada ? `- $${Math.round(parseFloat(t.monto)).toLocaleString('es-CO')}` : `+ $${Math.round(parseFloat(t.monto)).toLocaleString('es-CO')}`
                        : esIngreso ? `+ $${Math.round(parseFloat(t.monto)).toLocaleString('es-CO')}` : `- $${Math.round(parseFloat(t.monto)).toLocaleString('es-CO')}`}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleEliminar(t.id)} style={styles.deleteBtn} title="Eliminar">
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { marginTop: '2rem', backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.15rem', margin: 0, color: '#f8fafc' },
  filtersRow: { display: 'flex', gap: '0.8rem' },
  filterBox: { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #334155' },
  selectFilter: { backgroundColor: 'transparent', color: '#f8fafc', border: 'none', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' },
  emptyText: { color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '1px solid #334155' },
  th: { padding: '0.75rem', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 'bold' },
  tr: { borderBottom: '1px solid #334155' },
  td: { padding: '0.75rem', fontSize: '0.88rem', color: '#cbd5e1' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 'bold' },
  deleteBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
};
