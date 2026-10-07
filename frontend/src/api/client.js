import axios from 'axios';

const raw = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const api = axios.create({
  baseURL: raw + '/api',
  timeout: 30000
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('majisafe_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function apiErrorMessage(e, fallback) {
  if (!e.response) return 'Cannot reach the server. It may be waking up — wait about 30 seconds and try again.';
  return e.response?.data?.error || fallback;
}

export default api;
