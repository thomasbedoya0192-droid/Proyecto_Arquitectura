import React, { useState } from 'react';
import api from '../api';
import { PlusCircle, MinusCircle, Tag, AlertCircle } from 'lucide-react';

export function TransactionForm({ usuario, cuentas, onTransactionAdded }) {
  const [tipo, setTipo] = useState('gasto'); // 'gasto' o 'ingreso'
  const [cuentaId, setCuentaId] = useState(cuentas.length > 0 ? cuentas[0].id : '');
  const [categoria, setCategoria] = useState('Alimentación');
  const [otraCategoria, setOtraCategoria] = useState('');
  const [montoDisplay, setMontoDisplay] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Manejador del campo de monto con enmascaramiento de puntos
  const handleMontoChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setMontoDisplay('');
      return;
    }
    const formatted = parseInt(rawValue, 10).toLocaleString('es-CO');
    setMontoDisplay(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetCuenta = cuentaId || (cuentas.length > 0 ? cuentas[0].id : null);
    if (!targetCuenta || !montoDisplay) {
      setError('Asegúrate de seleccionar una cuenta e ingresar un monto.');
      return;
    }

    const montoNumerico = parseFloat(montoDisplay.replace(/\./g, ''));
    const categoriaFinal = categoria === 'Otra' ? otraCategoria.trim() : categoria;

    if (!categoriaFinal) {
      setError('Especifica el nombre de la categoría.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/transacciones/registrar/', {
        usuario: usuario.id,
        cuenta: parseInt(targetCuenta, 10),
        tipo,
        monto: montoNumerico,
        descripcion: descripcion.trim() ? `${categoriaFinal} - ${descripcion.trim()}` : categoriaFinal,
      });

      // Limpiar formulario
      setMontoDisplay('');
      setDescripcion('');
      setOtraCategoria('');
      if (categoria === 'Otra') setCategoria('Alimentación');

      // Notificar al padre para recargar cuentas/historial
      onTransactionAdded();
    } catch {
      setError('Ocurrió un error al registrar la transacción.');
    } finally {
      setLoading(false);
    }
  };

  if (cuentas.length === 0) {
    return null; // Ocultar si no hay cuentas registradas
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Registrar Transacción</h3>

      {/* Selector de Tipo */}
      <div style={styles.typeSelector}>
        <button
          type="button"
          style={tipo === 'gasto' ? styles.activeGasto : styles.inactiveBtn}
          onClick={() => setTipo('gasto')}
        >
          <MinusCircle size={16} style={{ marginRight: '6px' }} /> Gasto
        </button>
        <button
          type="button"
          style={tipo === 'ingreso' ? styles.activeIngreso : styles.inactiveBtn}
          onClick={() => setTipo('ingreso')}
        >
          <PlusCircle size={16} style={{ marginRight: '6px' }} /> Ingreso
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Cuenta:</label>
        <select
          value={cuentaId || (cuentas.length > 0 ? cuentas[0].id : '')}
          onChange={(e) => setCuentaId(e.target.value)}
          style={styles.select}
        >
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} (${Math.round(parseFloat(c.saldo)).toLocaleString('es-CO')})
            </option>
          ))}
        </select>

        <label style={styles.label}>Categoría:</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={styles.select}
        >
          <option value="Alimentación">Alimentación</option>
          <option value="Transporte">Transporte</option>
          <option value="Servicios">Servicios</option>
          <option value="Entretenimiento">Entretenimiento</option>
          <option value="Salud">Salud</option>
          <option value="Otra">Otra...</option>
        </select>

        {categoria === 'Otra' && (
          <input
            type="text"
            placeholder="Especifica la categoría"
            value={otraCategoria}
            onChange={(e) => setOtraCategoria(e.target.value)}
            style={styles.input}
            required
          />
        )}

        <label style={styles.label}>Monto ($):</label>
        <input
          type="text"
          placeholder="45.000"
          value={montoDisplay}
          onChange={handleMontoChange}
          style={styles.input}
          required
        />

        <label style={styles.label}>Descripción (Opcional):</label>
        <input
          type="text"
          placeholder="Ej: Almuerzo de trabajo"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={styles.input}
        />

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button type="submit" style={tipo === 'gasto' ? styles.submitGasto : styles.submitIngreso} disabled={loading}>
          {loading ? 'Guardando...' : tipo === 'gasto' ? 'Registrar Gasto' : 'Registrar Ingreso'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    border: '1px solid #334155',
    marginTop: '2rem',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  typeSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    backgroundColor: '#0f172a',
    padding: '4px',
    borderRadius: '0.5rem',
  },
  activeGasto: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: '0.4rem',
    backgroundColor: '#ef4444',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIngreso: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: '0.4rem',
    backgroundColor: '#10b981',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBtn: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  label: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
  },
  input: {
    padding: '0.7rem',
    borderRadius: '0.5rem',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    outline: 'none',
  },
  select: {
    padding: '0.7rem',
    borderRadius: '0.5rem',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    outline: 'none',
  },
  submitGasto: {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#ef4444',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  submitIngreso: {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#10b981',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#f87171',
    fontSize: '0.85rem',
  },
};
