import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import { UserSelection } from './components/UserSelection';
import { AccountsManager } from './components/AccountsManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SubscriptionsManager } from './components/SubscriptionsManager';
import { GoalsManager } from './components/GoalsManager';
import { Sidebar } from './components/Sidebar';
import { NotificationToast } from './components/NotificationToast';
import { Menu, LogOut } from 'lucide-react';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_activo');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    }
  }, []);

  // Cargar cuentas y suscripciones globales del usuario para alertas y presupuestos.
  // Se recarga también al cambiar de sección (location.pathname) para que una cuenta
  // creada en el Dashboard aparezca de inmediato en Suscripciones y Metas, que reciben
  // esta lista por props en vez de cargarla ellos mismos.
  useEffect(() => {
    if (usuario?.id) {
      const cargarDatosGlobales = async () => {
        try {
          // 1. Ejecutar auto-débitos pendientes
          await api.post('/suscripciones/procesar-autodebitos/', { usuario: usuario.id });

          // 2. Cargar cuentas actualizadas
          const resCuentas = await api.get('/cuentas/');
          const uCuentas = resCuentas.data.filter((c) => c.usuario === usuario.id);
          setCuentas(uCuentas);

          // 3. Cargar suscripciones actualizadas
          const resSubs = await api.get(`/suscripciones/?usuario=${usuario.id}`);
          setSuscripciones(resSubs.data);
        } catch {
          // Manejo silencioso
        }
      };
      cargarDatosGlobales();
    }
  }, [usuario?.id, location.pathname]);

  const handleUserSelect = (user) => {
    setUsuario(user);
    localStorage.setItem('usuario_activo', JSON.stringify(user));
    navigate('/dashboard');
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_activo');
    setUsuario(null);
    navigate('/login');
  };

  // Título dinámico para la cabecera
  const getPageTitle = (path) => {
    switch (path) {
      case '/dashboard':
        return 'Inicio / Mis Cuentas';
      case '/suscripciones':
        return 'Gestión de Suscripciones';
      case '/analytics':
        return 'Reportes y Estadísticas';
      case '/metas':
        return 'Metas Financieras de Ahorro';
      case '/asistente':
        return 'Asistente IA';
      default:
        return 'Panel Financiero';
    }
  };

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<UserSelection onUserSelect={handleUserSelect} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={styles.appContainer}>
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        usuario={usuario}
        onLogout={handleCerrarSesion}
        suscripciones={suscripciones}
      />

      <header style={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button style={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} color="#f8fafc" />
          </button>
          <h1 style={styles.title}>{getPageTitle(location.pathname)}</h1>
        </div>

        <div style={styles.userSection}>
          <span style={styles.userName}>Usuario: {usuario.nombre}</span>
          <button onClick={handleCerrarSesion} style={styles.logoutButton}>
            <LogOut size={16} style={{ marginRight: '6px' }} /> Salir
          </button>
        </div>
      </header>

      <main style={styles.mainContent}>
        <Routes>
          <Route path="/dashboard" element={<AccountsManager usuario={usuario} />} />
          <Route
            path="/suscripciones"
            element={<SubscriptionsManager usuario={usuario} cuentas={cuentas} />}
          />
          <Route
            path="/analytics"
            element={
              <AnalyticsDashboard
                usuario={usuario}
                cuentas={cuentas}
                onBackToMain={() => navigate('/dashboard')}
              />
            }
          />
          <Route
            path="/metas"
            element={
              <GoalsManager
                usuario={usuario}
                cuentas={cuentas}
                onRefreshData={() => {
                  // Re-cargar cuentas para refrescar el saldo disponible
                  api.get('/cuentas/').then((res) => {
                    const uCuentas = res.data.filter((c) => c.usuario === usuario.id);
                    setCuentas(uCuentas);
                  });
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Alerta flotante de cobros próximos */}
      <NotificationToast suscripciones={suscripciones} />
    </div>
  );
}

const styles = {
  appContainer: {
    backgroundColor: '#0f172a',
    minHeight: '100vh',
    width: '100%',
    color: '#f8fafc',
    fontFamily: 'system-ui, sans-serif',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.2rem 2rem',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  menuBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  title: { fontSize: '1.3rem', fontWeight: 'bold', margin: 0 },
  userSection: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontSize: '0.95rem', color: '#cbd5e1' },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.9rem',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  mainContent: {
    width: '100%',
    maxWidth: '100%',
    padding: '1.5rem 2rem',
    boxSizing: 'border-box',
  },
};
