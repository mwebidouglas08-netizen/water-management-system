import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Free hosting sleeps: the first request can take ~30-60s while Render wakes.
// Retry no-response failures with backoff, reporting progress to the UI.
async function withRetry(fn, onWait) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e.response || attempt === 2) throw e; // server answered (or out of tries)
      if (onWait) onWait(attempt + 1);
      await new Promise((r) => setTimeout(r, 9000 * (attempt + 1)));
    }
  }
  throw last;
}

// Fire on auth pages at mount so the backend is already waking while typing.
export function wakeServer() {
  api.get('/health').catch(() => {});
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('majisafe_user') || 'null'); } catch { return null; }
  });

  const login = async (email, password, onWait) => {
    const { data } = await withRetry(() => api.post('/auth/login', { email, password }), onWait);
    localStorage.setItem('majisafe_token', data.token);
    localStorage.setItem('majisafe_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload, onWait) => {
    const { data } = await withRetry(() => api.post('/auth/register', payload), onWait);
    if (data.token) {
      localStorage.setItem('majisafe_token', data.token);
      localStorage.setItem('majisafe_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('majisafe_token');
    localStorage.removeItem('majisafe_user');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}
