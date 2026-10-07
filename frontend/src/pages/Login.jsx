import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const go = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      const u = await login(email.trim(), password);
      nav(u.role === 'admin' ? '/admin' : u.role === 'technician' ? '/tech' : '/app');
    } catch (e) {
      setErr(apiErrorMessage(e, 'Sign in failed. Check your email and password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <img className="auth-img" src="https://images.unsplash.com/photo-1439405326854-014607f694d7?q=80&w=1200&auto=format&fit=crop" alt="Ocean wave at dawn" />
      <form className="auth-form" onSubmit={go}>
        <Link to="/" className="brand"><span className="brand-mark">M</span> MajiSafe</Link>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to monitor your tanks, track purity and follow your reports.</p>
        {err && <div className="form-alert">{err}</div>}
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="login-pass">Password</label>
        <input id="login-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p>No account yet? <Link to="/register" style={{ color: '#0b5fa5', fontWeight: 800 }}>Create one</Link></p>
      </form>
    </div>
  );
}
