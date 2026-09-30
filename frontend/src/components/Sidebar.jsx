import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { calcularDiasRestantes } from './NotificationToast';
import { Home, BarChart3, Repeat, Bot, Target, LogOut, X } from 'lucide-react';

export function Sidebar({ isOpen, setIsOpen, usuario, onLogout, suscripciones = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  // Filtrar suscripciones en rango de 7 días
  const subsEnRango = suscripciones
    .map((s) => calcularDiasRestantes(s.fecha_proximo_pago))
    .filter((dias) => dias !== null && dias >= 0 && dias <= 7);

  const cantidadProximas = subsEnRango.length;
  // Cambiar a rojo si al menos una vence en 3 días o menos
  const esUrgente = subsEnRango.some((dias) => dias <= 3);

  const navItems = [
    { path: '/dashboard', label: 'Inicio / Cuentas', icon: Home },
    {
      path: '/suscripciones',
      label: 'Suscripciones Recurrentes',
      icon: Repeat,
      badge: cantidadProximas > 0 ? cantidadProximas : null,
      badgeColor: esUrgente ? '#ef4444' : '#f59e0b',
    },
    { path: '/analytics', label: 'Reportes y Estadísticas', icon: BarChart3 },
    { path: '/metas', label: 'Metas de Ahorro', icon: Target },
    { path: '/ai-assistant', label: 'Asistente IA (Próximamente)', icon: Bot, disabled: true },
  ];

  return (
    <div style={styles.overlay} onClick={() => setIsOpen(false)}>
      <div style={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.brand}>Finanzas App</h2>
          <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <X size={20} color="#cbd5e1" />
          </button>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    navigate(item.path);
                    setIsOpen(false);
                  }
                }}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.activeNavItem : {}),
                  ...(item.disabled ? styles.disabledNavItem : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Icon size={18} style={{ marginRight: '10px' }} />
                  {item.label}
                </div>
                {item.badge && (
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: item.badgeColor,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={styles.footer}>
          <p style={styles.userText}>{usuario?.nombre}</p>
          <button style={styles.logoutBtn} onClick={onLogout}>
            <LogOut size={16} style={{ marginRight: '8px' }} /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 },
  sidebar: { width: '260px', height: '100%', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  brand: { fontSize: '1.2rem', fontWeight: 'bold', color: '#8b5cf6' },
  closeBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'transparent', color: '#cbd5e1', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontWeight: '500' },
  activeNavItem: { backgroundColor: '#8b5cf6', color: '#ffffff', fontWeight: 'bold' },
  disabledNavItem: { color: '#64748b', cursor: 'not-allowed' },
  badge: { color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', borderRadius: '1rem', transition: 'background-color 0.3s ease' },
  footer: { borderTop: '1px solid #334155', paddingTop: '1rem' },
  userText: { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' },
  logoutBtn: { display: 'flex', alignItems: 'center', width: '100%', padding: '0.6rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' },
};
