import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // Avoid sending stale tokens for public authentication routes
    const isPublicAuthRoute = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']
      .some(path => config.url && config.url.includes(path));

    if (!isPublicAuthRoute) {
      const token = sessionStorage.getItem('spms_token') || localStorage.getItem('spms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        sessionStorage.removeItem('spms_token');
        sessionStorage.removeItem('spms_user');
        localStorage.removeItem('spms_token');
        localStorage.removeItem('spms_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
