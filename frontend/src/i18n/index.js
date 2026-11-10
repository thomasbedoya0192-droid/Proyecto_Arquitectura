import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import api from '../api';
import es from './locales/es.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['es', 'en'];
export const DEFAULT_LANGUAGE = 'es';
export const LANGUAGE_STORAGE_KEY = 'selected_locale';

const getStoredLanguage = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

// Keeps the browser, the stored preference and the API header in sync with the active language
const applyLanguage = (lng) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // Storage not available: the language still applies for this session
  }
  document.documentElement.lang = lng;
  api.defaults.headers['Accept-Language'] = lng;
};

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: getStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

// Locale used to format dates according to the active language
export const getDateLocale = () => (i18n.language === 'en' ? 'en-US' : 'es-ES');

export default i18n;
