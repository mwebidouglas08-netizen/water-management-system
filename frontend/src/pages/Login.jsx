import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('school@majisafe.ke');
  const [password, setPassword] = useState('User123!');
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  const go = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const u = await login(email, password);
      nav(u.role === 'admin' ? '/admin' : u.role === 'technician' ? '/tech' : '/app');
    } catch (e) { setErr(e.response?.data?.error || 'Login failed'); }
  };

  return (
    <div className="auth-wrap">
      <img className="auth-img" src="https://images.unsplash.com/photo-1439405326854-014607f694d7?q=80&w=1200&auto=format&fit=crop" alt="Ocean wave" />
      <form className="auth-form" onSubmit={go}>
        <Link to="/" className="brand"><span className="brand-drop">💧</span> MajiSafe</Link>
        <h2>Welcome back</h2>
        <p className="muted">Monitor tanks, catch leaks, track purity.</p>
        {err && <div className="card" style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>{err}</div>}
        <label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn btn-primary" style={{ marginTop: 16 }}>Sign in →</button>
        <p>No account? <Link to="/register" style={{ color: '#0b5fa5', fontWeight: 800 }}>Create one</Link></p>
        <div className="card"><b>Demo:</b><br />school@majisafe.ke / User123!<br />tech@majisafe.ke / Tech123!<br />admin@majisafe.ke / Admin123!</div>
      </form>
    </div>
  );
}
