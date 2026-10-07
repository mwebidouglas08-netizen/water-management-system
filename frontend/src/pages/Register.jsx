import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '', org_name: '', phone: '', location: '', role: 'user' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const go = async (e) => {
    e.preventDefault();
    if (busy) return;
    setMsg(''); setBusy(true);
    try {
      const data = await register({ ...f, email: f.email.trim() });
      if (data.token) {
        const u = data.user;
        nav(u.role === 'admin' ? '/admin' : u.role === 'technician' ? '/tech' : '/app');
      } else {
        setMsg(data.message || 'Application received. An admin will approve your technician account, then you can sign in.');
      }
    } catch (e) {
      setMsg(apiErrorMessage(e, 'Registration failed. Try a different email address.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-form" onSubmit={go}>
        <Link to="/" className="brand"><span className="brand-mark">M</span> MajiSafe</Link>
        <h2>Create your account</h2>
        <p className="muted">Institutions get instant access. Technician accounts are approved by an admin.</p>
        {msg && <div className="form-alert">{msg}</div>}
        <label htmlFor="reg-name">Full name / contact person</label>
        <input id="reg-name" value={f.name} onChange={(e) => set('name', e.target.value)} required />
        <label htmlFor="reg-email">Email address</label>
        <input id="reg-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} required />
        <label htmlFor="reg-pass">Password (minimum 6 characters)</label>
        <input id="reg-pass" type="password" autoComplete="new-password" minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} required />
        <div className="grid grid-2">
          <div><label htmlFor="reg-org">Organisation</label><input id="reg-org" value={f.org_name} onChange={(e) => set('org_name', e.target.value)} placeholder="e.g. Greenhill Academy" /></div>
          <div><label htmlFor="reg-role">I am joining as</label>
            <select id="reg-role" value={f.role} onChange={(e) => set('role', e.target.value)}>
              <option value="user">Institution / Resident</option>
              <option value="technician">Technician</option>
            </select>
          </div>
        </div>
        <div className="grid grid-2">
          <div><label htmlFor="reg-phone">Phone</label><input id="reg-phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+254..." /></div>
          <div><label htmlFor="reg-loc">Location</label><input id="reg-loc" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Ruiru, Kiambu" /></div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p>Already registered? <Link to="/login" style={{ fontWeight: 800, color: '#0b5fa5' }}>Sign in</Link></p>
      </form>
      <img className="auth-img" src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop" alt="Clean water splash" />
    </div>
  );
}
