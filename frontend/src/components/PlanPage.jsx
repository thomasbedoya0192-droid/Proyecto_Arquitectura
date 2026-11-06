import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const PlanPage = ({ usuario }) => {
  const navigate = useNavigate();
  const plan = usuario?.plan || 'free';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Plan de Actualización</h1>
      </div>

      <div style={styles.currentPlan}>
        <h3>Tu plan actual: <span style={{ textTransform: 'capitalize' }}>{plan}</span></h3>
        {plan === 'free' ? (
          <p style={styles.freeNotice}>Actualiza a Premium para acceder a Feedback Financiero y más características.</p>
        ) : (
          <p style={styles.premiumNotice}><CheckCircle size={16} color="#38bdf8" /> Disfrutas de todas las características Premium</p>
        )}
      </div>

      <div style={styles.plans}>
        <div style={{ ...styles.card, ...(plan === 'free' ? styles.activeCard : {}) }}>
          <h4>Free</h4>
          <div style={styles.price}>$0<span>/mes</span></div>
          <ul style={styles.features}>
            <li><XCircle size={16} color="#ef4444" /> Feedback Financiero</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Gestión de Cuentas</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Suscripciones</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Metas de Ahorro</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Reportes Básicos</li>
          </ul>
          {plan === 'free' ? (
            <button style={styles.currentBtn} disabled>Plan Actual</button>
          ) : (
            <button style={styles.downgradeBtn} onClick={() => alert('Contacta soporte para bajar de plan')}>Cambiar a Free</button>
          )}
        </div>

        <div style={{ ...styles.card, ...(plan === 'premium' ? styles.activeCard : {}) }}>
          <h4>Premium</h4>
          <div style={styles.price}>$9.99<span>/mes</span></div>
          <ul style={styles.features}>
            <li><CheckCircle size={16} color="#38bdf8" /> Feedback Financiero (IA)</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Gestión de Cuentas</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Suscripciones</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Metas de Ahorro</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Reportes Avanzados</li>
            <li><CheckCircle size={16} color="#38bdf8" /> Notificaciones Prioritarias</li>
          </ul>
          {plan === 'premium' ? (
            <button style={styles.currentBtn} disabled>Plan Actual</button>
          ) : (
            <button style={styles.upgradeBtn} onClick={() => alert('Integración con Stripe pendiente')}>Actualizar a Premium</button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: '0.5rem' },
  title: { margin: 0, fontSize: '1.8rem', color: '#f8fafc' },
  currentPlan: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #334155' },
  freeNotice: { color: '#fbbf24', margin: '0.5rem 0 0' },
  premiumNotice: { color: '#38bdf8', margin: '0.5rem 0 0' },
  plans: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
  card: { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column' },
  activeCard: { borderColor: '#8b5cf6', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
  price: { fontSize: '2.5rem', fontWeight: 'bold', color: '#f8fafc', margin: '1rem 0', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' },
  features: { listStyle: 'none', padding: 0, margin: '1.5rem 0', flex: 1 },
  upgradeBtn: { marginTop: 'auto', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  downgradeBtn: { marginTop: 'auto', backgroundColor: '#334155', color: '#fff', border: 'none', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  currentBtn: { marginTop: 'auto', backgroundColor: '#64748b', color: '#94a3b8', border: 'none', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'not-allowed', fontSize: '1rem' },
};

export default PlanPage;