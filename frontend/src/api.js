import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add auth token from localStorage to every request
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('usuario_activo');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
  }
  return config;
});

// Add Accept-Language header from sessionStorage
const updateLocale = () => {
  const storedLocale = sessionStorage.getItem('selected_locale') || 'es';
  api.defaults.headers['Accept-Language'] = storedLocale;
};
updateLocale();

export default api;