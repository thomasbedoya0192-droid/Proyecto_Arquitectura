import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Endpoints that should NOT trigger token refresh on 401
const AUTH_ENDPOINTS = [
  '/transacciones/login-usuario/',
  '/transacciones/registrar-usuario/',
  '/auth/login/',
  '/auth/token/refresh/',
];

const isAuthEndpoint = (url) => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

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

// Handle 401 responses by attempting to refresh the token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Skip token refresh for auth endpoints (wrong password legitimately returns 401)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;
      try {
        const userStr = localStorage.getItem('usuario_activo');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.refresh_token) {
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL || '/api'}/auth/token/refresh/`,
              { refresh: user.refresh_token }
            );
            const newAccessToken = response.data.access;
            user.token = newAccessToken;
            localStorage.setItem('usuario_activo', JSON.stringify(user));
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (e) {
        console.error('Token refresh failed:', e);
        // Clear invalid session
        localStorage.removeItem('usuario_activo');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Add Accept-Language header from sessionStorage
const updateLocale = () => {
  const storedLocale = sessionStorage.getItem('selected_locale') || 'es';
  api.defaults.headers['Accept-Language'] = storedLocale;
};
updateLocale();

export default api;