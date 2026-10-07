import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, wakeServer } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function Register() {
  const [f, setF] = useState({
    name: '', email: '', password: '', org_name: '', phone: '', location: '', role: 'user',
    id_number: '', specialization: '', experience_years: '', cert_details: '', cert_url: ''
  });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [docName, setDocName] = useState('');
  const [docErr, setDocErr] = useState('');
  const { register } = useAuth();
  const nav = useNavigate();
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isTech = f.role === 'technician';

  useEffect(() => { wakeServer(); }, []);

  const onDocFile = (file) => {
    setDocErr('');
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      setDocErr('File too large — please use a photo or PDF under 3.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set('cert_url', String(reader.result));
      setDocName(`${file.name} (${Math.round(file.size / 1024)} KB attached)`);
    };
    reader.readAsDataURL(file);
  };

  const go = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (f.role === 'technician' && !f.cert_url) {
      setMsg('Please attach your ID / certificate file or paste a document link so the admin can verify you.');
      return;
    }
    setMsg(''); setBusy(true); setNote('');
    try {
      const data = await register({ ...f, email: f.email.trim() }, (n) => setNote(`Server is waking up — retrying (${n}/2)…`));
      if (data.token) {
        if (data.message) setMsg(data.message);
        const u = data.user;
        setTimeout(() => nav(u.role === 'admin' ? '/admin' : u.role === 'technician' ? '/tech' : '/app'), data.message ? 1800 : 0);
      } else {
        setMsg(data.message || 'Application received. Your account stays unverified until an admin reviews your documents — you will sign in once approved.');
      }
    } catch (e) {
      setMsg(apiErrorMessage(e, 'Registration failed. Try a different email address.'));
    } finally {
      setBusy(false); setNote('');
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-form" onSubmit={go}>
        <Link to="/" className="brand"><span className="brand-mark">M</span> MajiSafe</Link>
        <h2>Create your account</h2>
        <p className="muted">Institutions join instantly. Technicians submit documents and an admin verifies them first.</p>
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

        {isTech && (
          <fieldset className="kyc">
            <legend>Technician verification (KYC)</legend>
            <p className="muted">An admin reviews these documents before your account is verified and unlocked.</p>
            <label htmlFor="reg-idnum">National ID number *</label>
            <input id="reg-idnum" value={f.id_number} onChange={(e) => set('id_number', e.target.value)} required={isTech} placeholder="e.g. 12345678" />
            <div className="grid grid-2">
              <div><label htmlFor="reg-spec">Specialization</label><input id="reg-spec" value={f.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="e.g. Plumbing, boreholes" /></div>
              <div><label htmlFor="reg-exp">Years of experience</label><input id="reg-exp" type="number" min="0" max="60" value={f.experience_years} onChange={(e) => set('experience_years', e.target.value)} placeholder="e.g. 5" /></div>
            </div>
            <label htmlFor="reg-cert">Certifications</label>
            <textarea id="reg-cert" rows={2} value={f.cert_details} onChange={(e) => set('cert_details', e.target.value)} placeholder="e.g. Grade II Plumbing certificate, 2021; NWSC safety training" />
            <label htmlFor="reg-docfile">Upload ID / certificates (photo or PDF, max 3.5 MB) *</label>
            <input id="reg-docfile" type="file" accept="image/*,.pdf" onChange={(e) => onDocFile(e.target.files[0])} />
            {docName && <p className="muted">Attached: {docName}</p>}
            {docErr && <div className="form-alert">{docErr}</div>}
            <label htmlFor="reg-certurl">…or paste a shareable document link instead</label>
            <input id="reg-certurl" type="url" value={f.cert_url.startsWith('data:') ? '' : f.cert_url} onChange={(e) => set('cert_url', e.target.value)} placeholder="https://drive.google.com/… (only if no file attached above)" />
          </fieldset>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? (note || (isTech ? 'Submitting…' : 'Creating account…')) : isTech ? 'Submit for verification' : 'Create account'}
        </button>
        <p>Already registered? <Link to="/login" style={{ fontWeight: 800, color: '#0b5fa5' }}>Sign in</Link></p>
      </form>
      <img
        className="auth-img"
        src="https://images.pexels.com/photos/30253169/pexels-photo-30253169.jpeg?auto=compress&cs=tinysrgb&w=1200"
        onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop'; } }}
        alt="Mother and child with household water containers"
      />
    </div>
  );
}
