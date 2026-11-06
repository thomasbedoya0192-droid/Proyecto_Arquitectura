import axios from 'axios';

// Set default Accept-Language header from sessionStorage
const storedLocale = sessionStorage.getItem('selected_locale') || 'es';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.defaults.headers['Accept-Language'] = storedLocale;

export default api;