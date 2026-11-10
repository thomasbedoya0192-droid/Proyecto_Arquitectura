import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || 'es';

  const changeLocale = (newLocale) => {
    i18n.changeLanguage(newLocale);
  };

  return (
    <div style={styles.selector}>
      <span style={styles.label}>{t('language.label')}</span>
      <button
        onClick={() => changeLocale('en')}
        style={locale === 'en' ? styles.activeButton : styles.inactiveButton}
        aria-label="English"
      >
        EN
      </button>
      <button
        onClick={() => changeLocale('es')}
        style={locale === 'es' ? styles.activeButton : styles.inactiveButton}
        aria-label="Español"
      >
        ES
      </button>
    </div>
  );
};

const styles = {
  selector: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginLeft: '1rem',
  },
  label: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  inactiveButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: '0.25rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  activeButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: '1px solid #3b82f6',
    borderRadius: '0.25rem',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default LanguageSelector;