import React from 'react';
import { CreditCard, Wallet, Loader2, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  selectedCardId,
  setSelectedCardId,
  walletData,
  testCards,
} = {}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    let payload = { payment_method: selectedPaymentMethod };
    if (selectedPaymentMethod === 'test_card') {
      payload.test_card_id = selectedCardId;
    }
    onConfirm(payload);
  };

  const canConfirm = loading ? false : (
    selectedPaymentMethod === 'wallet' 
      ? (walletData?.wallet?.balance || 0) >= 9.99
      : selectedPaymentMethod === 'test_card' && selectedCardId
  );

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Selecciona método de pago</h3>
        <p style={styles.modalSubtitle}>Costo: <strong>$9.99 USD/mes</strong></p>
        
        <div style={styles.paymentOptions}>
          {/* Wallet Option */}
          <label style={{
            ...styles.paymentOption,
            ...(selectedPaymentMethod === 'wallet' ? styles.paymentOptionSelected : {}),
            opacity: (walletData?.wallet?.balance || 0) >= 9.99 ? 1 : 0.5,
          }}>
            <input
              type="radio"
              name="payment"
              value="wallet"
              checked={selectedPaymentMethod === 'wallet'}
              onChange={() => {
                if ((walletData?.wallet?.balance || 0) >= 9.99) {
                  setSelectedPaymentMethod('wallet');
                  setSelectedCardId(null);
                }
              }}
              disabled={(walletData?.wallet?.balance || 0) < 9.99}
            />
            <div style={styles.paymentOptionContent}>
              <span style={styles.paymentIcon}>💰</span>
              <div>
                <strong>Billetera interna</strong>
                <p style={styles.paymentOptionDetail}>
                  Saldo: ${walletData?.wallet?.balance || '0.00'} USD
                  {(walletData?.wallet?.balance || 0) < 9.99 && <span style={{color: '#ef4444'}}> (Insuficiente)</span>}
                </p>
              </div>
            </div>
          </label>

          {/* Test Cards Options */}
          {testCards?.map(card => (
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
          <button style={styles.modalCancel} onClick={onClose}>
            Cancelar
          </button>
          <button 
            style={styles.modalConfirm}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '6px' }}>⟳</span>
                Procesando...
              </>
            ) : (
              <>
                <span style={{marginRight: '6px'}}>💳</span> Confirmar pago de $9.99
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
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
};

export default PaymentModal;