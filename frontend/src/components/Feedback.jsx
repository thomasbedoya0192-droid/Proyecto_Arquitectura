import React, { useState, useEffect } from 'react';
import api from '../api';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Brain } from 'lucide-react';

const SECCIONES = [
  { key: 'general', label: 'General', icon: Brain },
  { key: 'cuentas', label: 'Cuentas', icon: '💳' },
  { key: 'gastos', label: 'Gastos', icon: '💸' },
  { key: 'metas', label: 'Metas', icon: '🎯' },
  { key: 'suscripciones', label: 'Suscripciones', icon: '🔄' },
  { key: 'reportes', label: 'Reportes', icon: '📊' },
];

export function Feedback({ usuario }) {
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFeedback = async () => {
    try {
      const res = await api.get(`/ia/feedback/?usuario=${usuario.id}`);
      setFeedback(res.data);
      
      // Calcular última actualización
      const fechas = Object.values(res.data).map(f => new Date(f.actualizado_en)).filter(Boolean);
      if (fechas.length > 0) {
        const masReciente = new Date(Math.max(...fechas));
        setLastUpdated(masReciente);
      }
    } catch (e) {
      console.error('Error cargando feedback:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/ia/feedback/stats/?usuario=${usuario.id}`);
      setStats(res.data);
    } catch (e) {
      console.error('Error cargando stats:', e);
    }
  };

  const handleRegenerar = async (secciones = null) => {
    setGenerating(true);
    try {
      await api.post('/ia/feedback/', { 
        usuario: usuario.id, 
        secciones 
      });
      await fetchFeedback();
      await fetchStats();
    } catch (e) {
      console.error('Error regenerando feedback:', e);
      alert('Error al generar feedback. Verifica la API key en el backend.');
    } finally {
      setGenerating(false);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Nunca';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return `hace ${mins} min`;
  };

  const renderMarkdown = (text) => {
    if (!text) return <p style={{ color: '#64748b' }}>Sin feedback disponible</p>;
    
    // Simple markdown-like rendering
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} style={styles.sectionTitle}>{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
        return <p key={i} style={styles.listItem}>{line}</p>;
      }
      if (line.startsWith('-')) {
        return <p key={i} style={styles.bulletItem}>{line}</p>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} style={styles.paragraph}>{line}</p>;
    });
  };

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [usuario.id]);

  const currentSection = feedback[activeTab];
  const sectionConfig = SECCIONES.find(s => s.key === activeTab);

  return (
    <div style={styles.container}>
      {/* Header con título y acciones */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <div style={styles.iconWrapper}>
            {sectionConfig?.icon && (
              typeof sectionConfig.icon === 'string' 
                ? <span style={{ fontSize: '24px' }}>{sectionConfig.icon}</span>
                : <sectionConfig.icon size={24} color="#8b5cf6" />
            )}
          </div>
          <div>
            <h1 style={styles.title}>Feedback Financiero</h1>
            <p style={styles.subtitle}>Análisis automático de tus finanzas por sección</p>
          </div>
        </div>
        
        <div style={styles.actions}>
          {lastUpdated && (
            <div style={styles.lastUpdate}>
              <Clock size={14} color="#94a3b8" />
              <span>Actualizado {getTimeAgo(lastUpdated)}</span>
            </div>
          )}
          <button
            style={{ ...styles.btn, ...(generating ? styles.btnDisabled : {}), ...(activeTab !== 'general' ? styles.btnSecondary : {}) }}
            onClick={() => handleRegenerar(activeTab !== 'general' ? [activeTab] : null)}
            disabled={generating}
          >
            {generating ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} />
                Generando...
              </>
            ) : activeTab !== 'general' ? (
              'Actualizar esta sección'
            ) : (
              'Regenerar todo'
            )}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={styles.statsBar}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{stats.total_tokens.toLocaleString()}</span>
            <span style={styles.statLabel}>Tokens totales</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>{stats.total_feedbacks}</span>
            <span style={styles.statLabel}>Secciones</span>
          </div>
          {Object.entries(stats.por_seccion).map(([k, v]) => (
            <div key={k} style={styles.statSmall}>
              {k}: {v} tk
            </div>
          ))}
        </div>
      )}

      {/* Tabs de secciones */}
      <div style={styles.tabs} role="tablist">
        {SECCIONES.map((sec) => {
          const fb = feedback[sec.key];
          const hasAlert = fb && (fb.contenido?.includes('Riesgo') || fb.contenido?.includes('Alerta') || fb.contenido?.includes('bajo') || fb.contenido?.includes('crítico'));
          return (
            <button
              key={sec.key}
              role="tab"
              aria-selected={activeTab === sec.key}
              onClick={() => setActiveTab(sec.key)}
              style={{
                ...styles.tab,
                ...(activeTab === sec.key ? styles.activeTab : {}),
                ...(hasAlert ? { borderLeft: '3px solid #ef4444' } : {}),
              }}
            >
              {typeof sec.icon === 'string' ? (
                <span style={{ fontSize: '16px', marginRight: '6px' }}>{sec.icon}</span>
              ) : (
                <sec.icon size={16} style={{ marginRight: '6px' }} />
              )}
              {sec.label}
              {hasAlert && <AlertCircle size={12} color="#ef4444" style={{ marginLeft: '4px' }} />}
            </button>
          );
        })}
      </div>

      {/* Contenido de la sección activa */}
      <div style={styles.content} role="tabpanel">
        {loading ? (
          <div style={styles.loading}>
            <RefreshCw size={24} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
            <p>Cargando análisis...</p>
          </div>
        ) : currentSection ? (
          <div style={styles.feedbackCard}>
            <div style={styles.feedbackHeader}>
              <div style={styles.feedbackMeta}>
                <span style={styles.triggerBadge}>{currentSection.trigger}</span>
                <span style={styles.tokensBadge}>{currentSection.tokens_usados} tokens</span>
                <span style={styles.dateBadge}>
                  {new Date(currentSection.actualizado_en).toLocaleDateString('es-ES', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
            <div style={styles.feedbackBody}>
              {renderMarkdown(currentSection.contenido)}
            </div>
          </div>
        ) : (
          <div style={styles.empty}>
            <Brain size={48} color="#64748b" />
            <p>No hay feedback para esta sección</p>
            <button style={styles.btn} onClick={() => handleRegenerar([activeTab])}>
              Generar ahora
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '1rem',
    padding: '1.5rem',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '1rem',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    margin: '0.25rem 0 0',
    fontSize: '0.9rem',
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  lastUpdate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.8rem',
    color: '#94a3b8',
    padding: '0.4rem 0.75rem',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: '0.5rem',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  btnSecondary: {
    backgroundColor: '#334155',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  statsBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '0.75rem',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '100px',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  statSmall: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: '0.35rem',
    alignSelf: 'flex-end',
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '0.5rem',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.85rem',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderBottom: 'none',
    borderRadius: '0.5rem 0.5rem 0 0',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderBottomColor: '#1e293b',
  },
  content: {
    flex: 1,
    minHeight: '300px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    color: '#94a3b8',
  },
  feedbackCard: {
    backgroundColor: '#0f172a',
    borderRadius: '0.75rem',
    border: '1px solid #334155',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  feedbackHeader: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #334155',
  },
  feedbackMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  triggerBadge: {
    fontSize: '0.65rem',
    fontWeight: '600',
    padding: '0.2rem 0.5rem',
    borderRadius: '0.35rem',
    textTransform: 'capitalize',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#a78bfa',
  },
  tokensBadge: {
    fontSize: '0.65rem',
    fontWeight: '600',
    padding: '0.2rem 0.5rem',
    borderRadius: '0.35rem',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#fbbf24',
  },
  dateBadge: {
    fontSize: '0.65rem',
    fontWeight: '500',
    padding: '0.2rem 0.5rem',
    borderRadius: '0.35rem',
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    color: '#94a3b8',
  },
  feedbackBody: {
    padding: '1.25rem',
    flex: 1,
    overflowY: 'auto',
    lineHeight: 1.7,
    color: '#e2e8f0',
    fontSize: '0.9rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#8b5cf6',
    margin: '1rem 0 0.5rem',
  },
  paragraph: {
    margin: '0.5rem 0',
    color: '#cbd5e1',
  },
  listItem: {
    margin: '0.35rem 0',
    paddingLeft: '1rem',
    color: '#cbd5e1',
  },
  bulletItem: {
    margin: '0.35rem 0',
    paddingLeft: '1.5rem',
    color: '#94a3b8',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    color: '#64748b',
    textAlign: 'center',
    padding: '2rem',
  },
};