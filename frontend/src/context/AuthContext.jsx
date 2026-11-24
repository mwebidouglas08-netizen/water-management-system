import { createContext, useContext, useState } from 'react';
import api, { API_BASE_URL, API_URL_CONFIGURED, withNetworkRetry } from '../api/client';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Fire on auth pages at mount so a sleeping backend is already waking while
// the user types (free hosting tiers can take ~40s to boot).
export function wakeServer() {
  if (!API_URL_CONFIGURED) return Promise.resolve(null);
  return api.get('/health').catch(() => null);
}

function persist(data) {
  localStorage.setItem('majisafe_token', data.token);
  localStorage.setItem('majisafe_user', JSON.stringify(data.user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('majisafe_user') || 'null'); } catch { return null; }
  });

  const login = async (email, password, onWait) => {
    const { data } = await withNetworkRetry(
      () => api.post('/auth/login', { email, password }),
      onWait
    );
    persist(data);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload, onWait) => {
    const { data } = await withNetworkRetry(
      () => api.post('/auth/register', payload),
      onWait
    );
    if (data.token) {
      persist(data);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('majisafe_token');
    localStorage.removeItem('majisafe_user');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, register, logout, apiBaseUrl: API_BASE_URL }}>{children}</AuthCtx.Provider>;
}
