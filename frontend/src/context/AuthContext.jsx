import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('majisafe_user') || 'null'); } catch { return null; }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('majisafe_token', data.token);
    localStorage.setItem('majisafe_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
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
