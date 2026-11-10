import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { ArrowUpRight, ArrowDownLeft, Trash2, Filter, ArrowRightLeft } from 'lucide-react';

export function TransactionHistory({ usuario, cuentas, autoDebitVersion, onDataChanged }) {
  const { t } = useTranslation();
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
  }, [usuario?.id, tipoFiltro, cuentaFiltro, autoDebitVersion]);

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(t('history.deleteConfirm'));
    if (!confirmar) return;

    try {
      await api.delete(`/transacciones/${id}/`);
      cargarTransacciones();
      if (onDataChanged) onDataChanged();
    } catch {
      alert(t('history.deleteError'));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('history.title')}</h3>

        <div style={styles.filtersRow}>
          <div style={styles.filterBox}>
            <Filter size={16} color="#94a3b8" />
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t('history.allTypes')}</option>
              <option value="ingreso">{t('history.onlyIncome')}</option>
              <option value="gasto">{t('history.onlyExpenses')}</option>
              <option value="transferencia">{t('history.onlyTransfers')}</option>
            </select>
          </div>

          <div style={styles.filterBox}>
            <select
              value={cuentaFiltro}
              onChange={(e) => setCuentaFiltro(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t('common.allAccounts')}</option>
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
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('history.loading')}</p>
      ) : transacciones.length === 0 ? (
        <p style={styles.emptyText}>{t('history.empty')}</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>{t('table.type')}</th>
                <th style={styles.th}>{t('table.description')}</th>
                <th style={styles.th}>{t('table.account')}</th>
                <th style={styles.th}>{t('table.amount')}</th>
                <th style={styles.th}>{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map((tx) => {
                const esIngreso = tx.tipo === 'ingreso';
                const esTransferencia = tx.tipo === 'transferencia';
                const esEnviada = tx.descripcion?.includes('enviada');

                return (
                  <tr key={tx.id} style={styles.tr}>
                    <td style={styles.td}>
                      {esTransferencia ? (
                        <span style={{ ...styles.badge, backgroundColor: '#3b82f620', color: '#60a5fa' }}>
                          <ArrowRightLeft size={14} style={{ marginRight: '4px' }} /> {t('txTypes.transferencia')}
                        </span>
                      ) : esIngreso ? (
                        <span style={{ ...styles.badge, backgroundColor: '#10b98120', color: '#34d399' }}>
                          <ArrowDownLeft size={14} style={{ marginRight: '4px' }} /> {t('txTypes.ingreso')}
                        </span>
                      ) : (
                        <span style={{ ...styles.badge, backgroundColor: '#ef444420', color: '#f87171' }}>
                          <ArrowUpRight size={14} style={{ marginRight: '4px' }} /> {t('txTypes.gasto')}
                        </span>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: '#f8fafc' }}>{tx.descripcion || t('history.noDescription')}</td>
                    <td style={styles.td}>{tx.nombre_cuenta || t('table.account')}</td>
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
                        ? esEnviada ? `- $${Math.round(parseFloat(tx.monto)).toLocaleString('es-CO')}` : `+ $${Math.round(parseFloat(tx.monto)).toLocaleString('es-CO')}`
                        : esIngreso ? `+ $${Math.round(parseFloat(tx.monto)).toLocaleString('es-CO')}` : `- $${Math.round(parseFloat(tx.monto)).toLocaleString('es-CO')}`}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleEliminar(tx.id)} style={styles.deleteBtn} title={t('history.delete')}>
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
