import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useSubscription } from '../../context/SubscriptionContext';
import PlanStatus from './PlanStatus';
import TestCardsList from './TestCardsList';
import PaymentModal from './PaymentModal';
import { CreditCard, CheckCircle, XCircle, ArrowLeft, Loader2, Settings, RefreshCw, AlertCircle, Info } from 'lucide-react';

const PlanPage = ({ usuario, onSubscriptionChange }) => {
  const navigate = useNavigate();
  const { 
    isPremium, 
    plan, 
    currentPeriodEnd, 
    cancelAtPeriodEnd, 
    walletBalance, 
    walletData,
    testCards,
    refresh,
    status,
    loading: contextLoading 
  } = useSubscription();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('test_card');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  // Auto-select first affordable card
  useEffect(() => {
    if (testCards && selectedCardId === null) {
      const affordableCard = testCards.find(c => c.can_afford_premium);
      if (affordableCard) {
        setSelectedCardId(affordableCard.id);
      }
    }
  }, [testCards, selectedCardId]);

  const handleUpgrade = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/billing/upgrade/', payload);
      setSuccess(response.data.message);
      await refresh(); // Refresh subscription context
      setShowPaymentOptions(false);
      if (onSubscriptionChange) onSubscriptionChange();
    } catch (err) {
      if (err.response?.data?.errores) {
        const failedSections = Object.entries(err.response.data.errores)
          .map(([sec, err]) => `${sec}: ${err}`)
          .join('\n');
        setError(`Error en el pago:\n${failedSections}`);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al procesar la actualización. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('¿Estás seguro? Perderás acceso a Premium al final del período actual. No hay reembolsos.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/billing/cancel/');
      setSuccess(response.data.message);
      await refresh();
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al cancelar la suscripción.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetCards = async () => {
    setLoading(true);
    try {
      await api.post('/billing/test-cards/reset/');
      await refresh();
      setSuccess('Tarjetas de prueba reiniciadas');
    } catch (err) {
      setError('Error al reiniciar tarjetas');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
  };

  // Use isPremium and cancelAtPeriodEnd from useSubscription directly
  const isSubscriptionActive = plan === 'premium' && (status === 'active' || (status === 'canceled' && cancelAtPeriodEnd));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <span style={{fontSize: '1.5rem'}}>←</span>
        </button>
        <h1 style={styles.title}>Plan de Actualización</h1>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={handleRetry} style={styles.retryBtn}>Reintentar</button>
        </div>
      )}
      {success && (
        <div style={styles.successBanner}>
          <span>{success}</span>
        </div>
      )}

      <PlanStatus 
        usuario={usuario} 
        isPremium={isPremium}
        plan={plan}
        subscriptionStatus={{
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd,
          walletBalance,
        }}
      />

      {/* Payment Options Modal */}
      {!isPremium && showPaymentOptions && (
        <PaymentModal
          isOpen={showPaymentOptions}
          onClose={() => setShowPaymentOptions(false)}
          onConfirm={handleUpgrade}
          loading={loading}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          selectedCardId={selectedCardId}
          setSelectedCardId={setSelectedCardId}
          walletData={walletData}
          testCards={testCards}
        />
      )}

      {/* Plans Comparison */}
      <div style={styles.plans}>
        {/* Free Plan Card */}
        <div style={{ 
          ...styles.card, 
          ...(!isPremium ? styles.activeCard : {}) 
        }}>
          <div style={styles.planHeader}>
            <h4>Free</h4>
            <div style={styles.price}>$0<span>/mes</span></div>
          </div>
          <ul style={styles.features}>
            <li style={styles.featureItem}><span style={{color: '#ef4444'}}>✗</span> Feedback Financiero (IA)</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Gestión de Cuentas</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Suscripciones</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Metas de Ahorro</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Reportes Básicos</li>
          </ul>
          <button 
            style={{ 
              ...styles.currentBtn, 
              ...(!isPremium ? { backgroundColor: '#8b5cf6', color: '#fff', cursor: 'not-allowed' } : {}) 
            }}
            disabled
          >
            {!isPremium ? 'Plan Actual' : 'Cambiar a Free'}
          </button>
        </div>

        {/* Premium Plan Card */}
        <div style={{ 
          ...styles.card, 
          ...(isPremium ? styles.activeCard : {}) 
        }}>
          <div style={styles.planHeader}>
            <h4>Premium</h4>
            <div style={styles.price}>$9.99<span>/mes</span></div>
          </div>
          <ul style={styles.features}>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Feedback Financiero (IA)</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Gestión de Cuentas</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Suscripciones</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Metas de Ahorro</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Reportes Avanzados</li>
            <li style={styles.featureItem}><span style={{color: '#38bdf8'}}>✓</span> Notificaciones Prioritarias</li>
          </ul>
          
          {isPremium ? (
            <div style={styles.premiumActions}>
              <button 
                style={cancelAtPeriodEnd ? styles.currentBtn : styles.currentBtn}
                disabled
              >
                {cancelAtPeriodEnd ? 'Cancelado (fin de período)' : 'Plan Actual'}
              </button>
              {cancelAtPeriodEnd ? null : (
                <button 
                  style={styles.cancelBtn}
                  onClick={handleCancelSubscription}
                  disabled={loading}
                >
                  Cancelar (fin de período)
                </button>
              )}
              <button 
                style={styles.manageBtn}
                onClick={handleResetCards}
                disabled={loading}
              >
                Reiniciar tarjetas de prueba
              </button>
            </div>
          ) : (
            <button 
              style={styles.upgradeBtn}
              onClick={() => setShowPaymentOptions(true)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '6px' }}>⟳</span>
                  Procesando...
                </>
              ) : (
                <>
                  <span style={{marginRight: '6px'}}>💳</span> Actualizar a Premium
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Test Cards Legend */}
      <TestCardsList 
        testCards={testCards}
        onCardSelect={setSelectedCardId}
        selectedCardId={selectedCardId}
      />

      {/* Info Footer */}
      <div style={styles.infoFooter}>
        <p style={styles.infoFooterP}>
          Sistema de pagos interno de prueba. El admin puede recargar tu billetera desde Django Admin.
        </p>
        <p style={styles.infoFooterP}>
          Puedes cancelar tu suscripción en cualquier momento. No hay reembolsos, el acceso continúa hasta el final del período pagado.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: '0.5rem', fontSize: '1.5rem' },
  title: { margin: 0, fontSize: '1.8rem', color: '#f8fafc' },
  currentPlan: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #334155' },
  planBadge: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  planLabel: { color: '#94a3b8', fontSize: '1rem' },
  planValue: { padding: '0.375rem 1rem', borderRadius: '9999px', fontWeight: 'bold', fontSize: '1rem', border: '1px solid' },
  walletInfo: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155', flexWrap: 'wrap' },
  premiumDetails: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' },
  premiumNotice: { color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' },
  periodEnd: { color: '#94a3b8', margin: '0.5rem 0 0', fontSize: '0.85rem' },
  freeNotice: { color: '#fbbf24', margin: '0.5rem 0 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  plans: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' },
  card: { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', minHeight: '500px' },
  activeCard: { borderColor: '#8b5cf6', boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)', position: 'relative' },
  planHeader: { textAlign: 'center', marginBottom: '1.5rem' },
  price: { fontSize: '3rem', fontWeight: 'bold', color: '#f8fafc', margin: '1rem 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.5rem' },
  features: { listStyle: 'none', padding: 0, margin: '1.5rem 0', flex: 1 },
  featureItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.95rem', color: '#cbd5e1' },
  upgradeBtn: { marginTop: 'auto', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background-color 0.2s' },
  manageBtn: { marginTop: '0.75rem', backgroundColor: 'transparent', color: '#8b5cf6', border: '1px solid #8b5cf6', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  cancelBtn: { marginTop: '0.75rem', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  currentBtn: { marginTop: 'auto', backgroundColor: '#64748b', color: '#94a3b8', border: 'none', padding: '1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'not-allowed', fontSize: '1rem' },
  premiumActions: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  errorBanner: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  retryBtn: { backgroundColor: 'transparent', color: '#f87171', border: '1px solid #ef4444', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' },
  successBanner: { backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '500px', border: '1px solid #334155' },
  modalTitle: { margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#f8fafc' },
  modalSubtitle: { color: '#94a3b8', margin: '0 0 1.5rem', fontSize: '0.95rem' },
  paymentOptions: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' },
  paymentOption: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #334155', borderRadius: '0.5rem', cursor: 'pointer', backgroundColor: '#0f172a', transition: 'all 0.2s' },
  paymentOptionSelected: { borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', boxShadow: '0 0 0 1px #8b5cf6' },
  paymentOptionContent: { display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 },
  cardIcon: { width: '40px', height: '40px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff', backgroundColor: '#8b5cf6' },
  paymentOptionDetail: { color: '#94a3b8', fontSize: '0.8rem', margin: 0 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' },
  modalCancel: { backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' },
  modalConfirm: { backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  testCardsInfo: { marginTop: '2rem', padding: '1.5rem', backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155' },
  testCardsTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem', fontSize: '1rem', color: '#f8fafc' },
  testCardsDesc: { color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' },
  cardBadge: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid' },
  cardBadgeBrand: { fontWeight: 'bold', fontSize: '0.8rem', color: '#8b5cf6', textTransform: 'uppercase' },
  cardBadgeName: { flex: 1, fontSize: '0.85rem', color: '#cbd5e1' },
  cardBadgeBalance: { fontWeight: 'bold', fontSize: '0.85rem' },
  cardBadgeTag: { fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', color: '#fff', fontWeight: 'bold' },
  infoFooter: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #334155', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' },
  infoFooterP: { margin: '0.5rem 0' },
};

export default PlanPage;