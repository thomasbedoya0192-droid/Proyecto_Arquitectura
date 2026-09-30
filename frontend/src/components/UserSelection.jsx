import React, { useState } from 'react';
import api from '../api';
import { LogIn, UserPlus } from 'lucide-react';

export function UserSelection({ onUserSelect }) {
  const [modo, setModo] = useState('login'); // 'login' o 'registro'
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    setError('');

    const endpoint = modo === 'login' 
      ? '/transacciones/login-usuario/' 
      : '/transacciones/registrar-usuario/';

    try {
      const response = await api.post(endpoint, { nombre: nombre.trim() });
      // Guardar usuario en localStorage para persistencia de sesión
      localStorage.setItem('usuario_activo', JSON.stringify(response.data));
      onUserSelect(response.data);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Error de conexión con el servidor backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.tabContainer}>
          <button
            style={modo === 'login' ? styles.activeTab : styles.inactiveTab}
            onClick={() => { setModo('login'); setError(''); }}
          >
            <LogIn size={18} style={{ marginRight: '6px' }} /> Iniciar Sesión
          </button>
          <button
            style={modo === 'registro' ? styles.activeTab : styles.inactiveTab}
            onClick={() => { setModo('registro'); setError(''); }}
          >
            <UserPlus size={18} style={{ marginRight: '6px' }} /> Registrarse
          </button>
        </div>

        <h2 style={{ marginTop: '1.5rem' }}>
          {modo === 'login' ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
        </h2>
        <p style={styles.subtitle}>
          {modo === 'login' 
            ? 'Ingresa tu nombre de usuario para acceder a tus cuentas.' 
            : 'Crea un nuevo usuario para comenzar a gestionar tus finanzas.'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Procesando...' : modo === 'login' ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '2.5rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: '#0f172a',
    borderRadius: '0.5rem',
    padding: '4px',
  },
  activeTab: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: '0.4rem',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTab: {
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
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    marginTop: '1rem',
    fontSize: '0.875rem',
  },
};
