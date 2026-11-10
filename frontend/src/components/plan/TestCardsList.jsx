import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../context/SubscriptionContext';
import { CreditCard, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export function TestCardsList({ onCardSelect, selectedCardId, disabled }) {
  const { t } = useTranslation();
  const { testCards } = useSubscription();

  return (
    <div style={styles.testCardsInfo}>
      <h4 style={styles.testCardsTitle}>
        {t('testCards.title')}
      </h4>
      <p style={styles.testCardsDesc}>
        {t('testCards.description')}
      </p>
      <div style={styles.cardsGrid}>
        {testCards.map(card => (
          <label
            key={card.id}
            style={{
              ...styles.cardBadge,
              backgroundColor: card.can_afford_premium ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: card.can_afford_premium ? '#38bdf8' : '#ef4444',
              opacity: card.can_afford_premium ? 1 : 0.5,
            }}
          >
            <input
              type="radio"
              name="payment"
              value="test_card"
              checked={selectedCardId === card.id}
              onChange={() => {
                if (card.can_afford_premium && !disabled) {
                  onCardSelect(card.id);
                }
              }}
              disabled={!card.can_afford_premium || disabled}
            />
            <div style={styles.cardBadgeContent}>
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
                {card.can_afford_premium ? t('testCards.pays') : t('testCards.insufficient')}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

const styles = {
  testCardsInfo: { marginTop: '2rem', padding: '1.5rem', backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155' },
  testCardsTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem', fontSize: '1rem', color: '#f8fafc' },
  testCardsDesc: { color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' },
  cardBadge: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
  cardBadgeContent: { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 },
  cardBadgeBrand: { fontWeight: 'bold', fontSize: '0.8rem', color: '#8b5cf6', textTransform: 'uppercase' },
  cardBadgeName: { flex: 1, fontSize: '0.85rem', color: '#cbd5e1' },
  cardBadgeBalance: { fontWeight: 'bold', fontSize: '0.85rem' },
  cardBadgeTag: { fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', color: '#fff', fontWeight: 'bold' },
};

export default TestCardsList;