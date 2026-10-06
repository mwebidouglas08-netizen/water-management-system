import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '', org_name: '', phone: '', location: '', role: 'user' });
  const [msg, setMsg] = useState('');
  const { register } = useAuth();
  const nav = useNavigate();
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const go = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      const data = await register(f);
      if (data.token) {
        const u = data.user;
        nav(u.role === 'admin' ? '/admin' : u.role === 'technician' ? '/tech' : '/app');
      } else setMsg(data.message || 'Registered — awaiting approval.');
    } catch (e) { setMsg(e.response?.data?.error || 'Register failed'); }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-form" onSubmit={go}>
        <Link to="/" className="brand"><span className="brand-drop">💧</span> MajiSafe</Link>
        <h2>Create your account</h2>
        <p className="muted">Institutions get instant access. Technicians need admin approval.</p>
        {msg && <div className="card">{msg}</div>}
        <label>Full name / Institution contact</label><input value={f.name} onChange={e => set('name', e.target.value)} required />
        <label>Email</label><input value={f.email} onChange={e => set('email', e.target.value)} required />
        <label>Password (min 6)</label><input type="password" value={f.password} onChange={e => set('password', e.target.value)} required />
        <div className="grid grid-2">
          <div><label>Organisation</label><input value={f.org_name} onChange={e => set('org_name', e.target.value)} placeholder="Greenhill Academy" /></div>
          <div><label>Role</label><select value={f.role} onChange={e => set('role', e.target.value)}><option value="user">Institution / User</option><option value="technician">Technician</option></select></div>
        </div>
        <div className="grid grid-2">
          <div><label>Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+254..." /></div>
          <div><label>Location</label><input value={f.location} onChange={e => set('location', e.target.value)} placeholder="Ruiru, Kiambu" /></div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }}>Create account →</button>
        <p>Have an account? <Link to="/login" style={{ fontWeight: 800, color: '#0b5fa5' }}>Sign in</Link></p>
      </form>
      <img className="auth-img" src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop" alt="Water splash" />
    </div>
  );
}
