import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { getDateLocale } from '../../i18n';
import { useSubscription } from '../../context/SubscriptionContext';
import { CheckCircle, XCircle, Clock, Info, Wallet, CreditCard, RotateCcw, AlertCircle } from 'lucide-react';

export function PlanStatus({ usuario }) {
  const { t } = useTranslation();
  const { isPremium, plan, currentPeriodEnd, cancelAtPeriodEnd, walletBalance, refresh } = useSubscription();
  const isSubscriptionActive = plan === 'premium' && (status === 'active' || (status === 'canceled' && cancelAtPeriodEnd));

  return (
    <div style={styles.currentPlan}>
      <div style={styles.planBadge}>
        <span style={styles.planLabel}>{t('planStatus.current')}</span>
        <span style={{
          ...styles.planValue,
          backgroundColor: isPremium ? 'rgba(56, 189, 248, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          color: isPremium ? '#38bdf8' : '#fbbf24',
          borderColor: isPremium ? '#38bdf8' : '#fbbf24',
        }}>
          {isPremium ? 'Premium' : 'Free'}
        </span>
      </div>

      <div style={styles.walletInfo}>
        <span>{t('planStatus.walletBalance')} <strong>${walletBalance} USD</strong></span>
      </div>

      {isPremium && (
        <div style={styles.premiumDetails}>
          <p style={styles.premiumNotice}>
            <span style={{ color: '#38bdf8' }}>✓</span>
            {t('planStatus.enjoying')}
            {cancelAtPeriodEnd && currentPeriodEnd && (
              <span style={{ marginLeft: '1rem', color: '#fbbf24', fontSize: '0.85rem' }}>
                {t('planStatus.willCancel', { date: new Date(currentPeriodEnd).toLocaleDateString(getDateLocale()) })}
              </span>
            )}
          </p>
          {currentPeriodEnd && !cancelAtPeriodEnd && (
            <p style={styles.periodEnd}>
              {t('planStatus.nextCharge', { date: new Date(currentPeriodEnd).toLocaleDateString(getDateLocale(), { year: 'numeric', month: 'long', day: 'numeric' }) })}
            </p>
          )}
          {cancelAtPeriodEnd && (
            <p style={{ color: '#fbbf24', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {t('planStatus.canceledUntil', { date: currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString(getDateLocale()) : t('planStatus.endOfPeriod') })}
            </p>
          )}
        </div>
      )}

      {!isPremium && (
        <p style={styles.freeNotice}>
          <Trans i18nKey="planStatus.upgradePitch" components={{ strong: <strong /> }} />
        </p>
      )}
    </div>
  );
}

const styles = {
  currentPlan: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #334155' },
  planBadge: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  planLabel: { color: '#94a3b8', fontSize: '1rem' },
  planValue: { padding: '0.375rem 1rem', borderRadius: '9999px', fontWeight: 'bold', fontSize: '1rem', border: '1px solid' },
  walletInfo: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155', flexWrap: 'wrap' },
  premiumDetails: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' },
  premiumNotice: { color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' },
  periodEnd: { color: '#94a3b8', margin: '0.5rem 0 0', fontSize: '0.85rem' },
  freeNotice: { color: '#fbbf24', margin: '0.5rem 0 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
};

export default PlanStatus;