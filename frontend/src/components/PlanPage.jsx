import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { CreditCard, CheckCircle, XCircle, ArrowLeft, Loader2, Settings, Wallet, RefreshCw, AlertCircle, Info } from 'lucide-react';

const PlanPage = ({ usuario }) => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(usuario?.plan || 'free');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('test_card');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  // Fetch subscription status and wallet on mount
  useEffect(() => {
    fetchSubscriptionStatus();
    fetchWalletData();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/billing/status/');
      setSubscriptionStatus(response.data);
      setPlan(response.data.plan);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
    }
  };

  const fetchWalletData = async () => {
    try {
      const response = await api.get('/billing/wallet/');
      setWalletData(response.data);
      // Auto-select first card that can afford premium
      const affordableCard = response.data.test_cards.find(c => c.can_afford_premium);
      if (affordableCard) {
        setSelectedCardId(affordableCard.id);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let payload = { payment_method: selectedPaymentMethod };
      if (selectedPaymentMethod === 'test_card') {
        payload.test_card_id = selectedCardId;
      }

      const response = await api.post('/billing/upgrade/', payload);
      setSuccess(response.data.message);
      await fetchSubscriptionStatus();
      await fetchWalletData();
      setShowPaymentOptions(false);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
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
      await fetchSubscriptionStatus();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
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
      await fetchWalletData();
      setSuccess('Tarjetas de prueba reiniciadas');
    } catch (err) {
      setError('Error al reiniciar tarjetas');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
    fetchSubscriptionStatus();
    fetchWalletData();
  };

  const isPremium = subscriptionStatus?.is_premium === true;
  const isSubscriptionActive = subscriptionStatus?.status === 'active';
  const cancelAtPeriodEnd = subscriptionStatus?.cancel_at_period_end;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Plan de Actualización</h1>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} color="#f87171" />
          <span>{error}</span>
          <button onClick={handleRetry} style={styles.retryBtn}>
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}
      {success && (
        <div style={styles.successBanner}>
          <CheckCircle size={16} color="#38bdf8" />
          <span>{success}</span>
        </div>
      )}

      {/* Current Plan Status */}
      <div style={styles.currentPlan}>
        <div style={styles.planBadge}>
          <span style={styles.planLabel}>Tu plan actual:</span>
          <span style={{
            ...styles.planValue,
            backgroundColor: isPremium ? 'rgba(56, 189, 248, 0.2)' : 'rgba(251, 191, 36, 0.2)',
            color: isPremium ? '#38bdf8' : '#fbbf24',
            borderColor: isPremium ? '#38bdf8' : '#fbbf24',
          }}>
            {isPremium ? 'Premium' : 'Free'}
          </span>
        </div>

        {/* Wallet Balance */}
        {walletData && (
          <div style={styles.walletInfo}>
            <Wallet size={16} color="#8b5cf6" />
            <span>Saldo en billetera: <strong>${walletData.wallet.balance} USD</strong></span>
            <button 
              style={styles.topupBtn}
              onClick={() => alert('El admin puede recargar tu billetera desde Django Admin > Wallets > Actions > Add $10/50/100')}
              title="Solo admin puede recargar"
            >
              <Info size={14} /> ¿Cómo recargar?
            </button>
          </div>
        )}

        {isPremium && subscriptionStatus && (
          <div style={styles.premiumDetails}>
            <p style={styles.premiumNotice}>
              <CheckCircle size={16} color="#38bdf8" /> 
              Disfrutas de todas las características Premium
              {cancelAtPeriodEnd && (
                <span style={{ marginLeft: '1rem', color: '#fbbf24', fontSize: '0.85rem' }}>
                  (Se cancelará al final del período: {new Date(subscriptionStatus.current_period_end).toLocaleDateString('es-ES')})
                </span>
              )}
            </p>
            {subscriptionStatus.current_period_end && !cancelAtPeriodEnd && (
              <p style={styles.periodEnd}>
                Próximo cobro automático: {new Date(subscriptionStatus.current_period_end).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
            {cancelAtPeriodEnd && (
              <p style={{ color: '#fbbf24', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                <XCircle size={14} /> Suscripción cancelada. Acceso hasta {new Date(subscriptionStatus.current_period_end).toLocaleDateString('es-ES')}.
              </p>
            )}
          </div>
        )}

        {!isPremium && (
          <p style={styles.freeNotice}>
            <Info size={16} color="#fbbf24" /> Actualiza a Premium por <strong>$9.99/mes</strong> para acceder a Feedback Financiero con IA y más características.
          </p>
        )}
      </div>

      {/* Payment Options Modal */}
      {!isPremium && showPaymentOptions && (
        <div style={styles.modalOverlay} onClick={() => setShowPaymentOptions(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Selecciona método de pago</h3>
            <p style={styles.modalSubtitle}>Costo: <strong>$9.99 USD/mes</strong></p>
            
            <div style={styles.paymentOptions}>
              {/* Wallet Option */}
              <label style={{
                ...styles.paymentOption,
                ...(selectedPaymentMethod === 'wallet' ? styles.paymentOptionSelected : {}),
                opacity: walletData?.wallet?.balance >= 9.99 ? 1 : 0.5,
              }}>
                <input
                  type="radio"
                  name="payment"
                  value="wallet"
                  checked={selectedPaymentMethod === 'wallet'}
                  onChange={() => {
                    if (walletData?.wallet?.balance >= 9.99) {
                      setSelectedPaymentMethod('wallet');
                      setSelectedCardId(null);
                    }
                  }}
                  disabled={walletData?.wallet?.balance < 9.99}
                />
                <div style={styles.paymentOptionContent}>
                  <Wallet size={24} color={walletData?.wallet?.balance >= 9.99 ? '#38bdf8' : '#64748b'} />
                  <div>
                    <strong>Billetera interna</strong>
                    <p style={styles.paymentOptionDetail}>
                      Saldo: ${walletData?.wallet?.balance || '0.00'} USD
                      {walletData?.wallet?.balance < 9.99 && <span style={{color: '#ef4444'}}> (Insuficiente)</span>}
                    </p>
                  </div>
                </div>
              </label>

              {/* Test Cards Options */}
              {walletData?.test_cards?.map(card => (
                <label key={card.id} style={{
                  ...styles.paymentOption,
                  ...(selectedPaymentMethod === 'test_card' && selectedCardId === card.id ? styles.paymentOptionSelected : {}),
                  opacity: card.can_afford_premium ? 1 : 0.5,
                }}>
                  <input
                    type="radio"
                    name="payment"
                    value="test_card"
                    checked={selectedPaymentMethod === 'test_card' && selectedCardId === card.id}
                    onChange={() => {
                      if (card.can_afford_premium) {
                        setSelectedPaymentMethod('test_card');
                        setSelectedCardId(card.id);
                      }
                    }}
                    disabled={!card.can_afford_premium}
                  />
                  <div style={styles.paymentOptionContent}>
                    <div style={styles.cardIcon}>{card.brand === 'Visa' ? 'V' : card.brand === 'Mastercard' ? 'M' : 'A'}</div>
                    <div>
                      <strong>{card.display_name}</strong>
                      <p style={styles.paymentOptionDetail}>
                        Saldo: ${card.balance} USD
                        {!card.can_afford_premium && <span style={{color: '#ef4444'}}> (Insuficiente para Premium)</span>}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setShowPaymentOptions(false)}>
                Cancelar
              </button>
              <button 
                style={styles.modalConfirm}
                onClick={handleUpgrade}
                disabled={loading || (selectedPaymentMethod === 'wallet' && (walletData?.wallet?.balance || 0) < 9.99) || (selectedPaymentMethod === 'test_card' && !selectedCardId)}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} /> Confirmar pago de $9.99
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
            <li style={styles.featureItem}><XCircle size={16} color="#ef4444" /> Feedback Financiero (IA)</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Gestión de Cuentas</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Suscripciones</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Metas de Ahorro</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Reportes Básicos</li>
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
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Feedback Financiero (IA)</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Gestión de Cuentas</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Suscripciones</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Metas de Ahorro</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Reportes Avanzados</li>
            <li style={styles.featureItem}><CheckCircle size={16} color="#38bdf8" /> Notificaciones Prioritarias</li>
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
                  <XCircle size={16} /> Cancelar (fin de período)
                </button>
              )}
              <button 
                style={styles.manageBtn}
                onClick={handleResetCards}
                disabled={loading}
              >
                <RefreshCw size={16} /> Reiniciar tarjetas de prueba
              </button>
            </div>
          ) : (
            <button 
              style={styles.upgradeBtn}
              onClick={() => setShowPaymentOptions(true)}
              disabled={loading}
            >
              <CreditCard size={16} /> Actualizar a Premium
            </button>
          )}
        </div>
      </div>

      {/* Test Cards Legend */}
      <div style={styles.testCardsInfo}>
        <h4 style={styles.testCardsTitle}>
          <CreditCard size={18} /> Tarjetas de prueba disponibles
        </h4>
        <p style={styles.testCardsDesc}>
          Tarjetas de prueba predefinidas para probar el sistema. Las tarjetas "Rich" tienen saldo suficiente para Premium ($9.99), las "Poor" no.
        </p>
        <div style={styles.cardsGrid}>
          {walletData?.test_cards?.map(card => (
            <div key={card.id} style={{
              ...styles.cardBadge,
              backgroundColor: card.can_afford_premium ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: card.can_afford_premium ? '#38bdf8' : '#ef4444',
            }}>
              <span style={styles.cardBadgeBrand}>{card.brand}</span>
              <span style={styles.cardBadgeName}>{card.display_name}</span>
              <span style={{
                ...styles.cardBadgeBalance,
                color: card.can_afford_premium ? '#38bdf8' : '#ef4444',
              }}>
                ${card.balance}
              </span>
              <span style={{
                ...styles.cardBadgeTag,
                backgroundColor: card.can_afford_premium ? '#38bdf8' : '#ef4444',
              }}>
                {card.can_afford_premium ? '✓ Paga Premium' : '✗ Insuficiente'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Footer */}
      <div style={styles.infoFooter}>
        <p style={styles.infoFooterP}>
          <Wallet size={14} color="#8b5cf6" /> Sistema de pagos interno de prueba.
          El admin puede recargar tu billetera desde Django Admin.
        </p>
        <p style={styles.infoFooterP}>
          <Info size={14} color="#64748b" /> Puedes cancelar tu suscripción en cualquier momento. No hay reembolsos, el acceso continúa hasta el final del período pagado.
        </p>
      </div>
    </div>
  );
}

// Keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

const styles = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: '0.5rem' },
  title: { margin: 0, fontSize: '1.8rem', color: '#f8fafc' },
  currentPlan: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #334155' },
  planBadge: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  planLabel: { color: '#94a3b8', fontSize: '1rem' },
  planValue: { padding: '0.375rem 1rem', borderRadius: '9999px', fontWeight: 'bold', fontSize: '1rem', border: '1px solid' },
  walletInfo: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155', flexWrap: 'wrap' },
  topupBtn: { backgroundColor: 'transparent', color: '#8b5cf6', border: '1px solid #8b5cf6', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' },
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
  infoFooterP: { margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
};

export default PlanPage;