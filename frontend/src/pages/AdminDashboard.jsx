import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import DashboardShell from '../components/DashboardShell';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState([]);
  const [devices, setDevices] = useState([]);
  const [techs, setTechs] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [newU, setNewU] = useState({ name: '', email: '', password: 'User123!', role: 'user', org_name: '' });
  const [assign, setAssign] = useState({});

  const load = async () => {
    const [o, r, d, c] = await Promise.all([
      api.get('/admin/overview'), api.get('/reports'),
      api.get('/devices'), api.get('/admin/consumption')
    ]);
    setOv(o.data); setReports(r.data); setDevices(d.data);
    setConsumption(c.data.map((x) => ({ ...x, day: String(x.day).slice(0, 10) })));
    const u = await api.get('/admin/users?search=' + encodeURIComponent(search));
    setUsers(u.data);
    setTechs(u.data.filter((x) => x.role === 'technician' && x.status === 'active'));
    const p = await api.get('/admin/users?status=pending&role=technician');
    setPending(p.data);
  };
  useEffect(() => { load(); }, []);

  const verify = async (id) => { await api.post(`/admin/users/${id}/verify`); load(); };
  const reject = async (id) => {
    if (!window.confirm('Reject this technician application?')) return;
    await api.post(`/admin/users/${id}/reject`); load();
  };
  const setStatus = async (id, patch) => { await api.patch(`/admin/users/${id}`, patch); load(); };
  const onboard = async (e) => {
    e.preventDefault();
    await api.post('/admin/users', newU);
    setNewU({ name: '', email: '', password: 'User123!', role: 'user', org_name: '' }); load();
  };
  const triage = async (id, status) => {
    await api.patch(`/reports/${id}`, status === 'assign' ? { status: 'assigned', assigned_to: assign[id] } : { status });
    load();
  };

  const items = [
    { key: 'overview', label: 'Overview', icon: '◉' },
    { key: 'approvals', label: 'Approvals', icon: '✓', count: pending.length },
    { key: 'users', label: 'Users', icon: '☺' },
    { key: 'reports', label: 'Reports', icon: '✎', count: reports.filter((r) => r.status === 'open').length },
    { key: 'devices', label: 'Devices', icon: '●' },
    { key: 'analytics', label: 'Analytics', icon: '▦' }
  ];

  return (
    <DashboardShell
      brand="Admin Oversight (/admin)"
      org={user?.name}
      items={items} active={tab} onNav={setTab} onLogout={logout}
      badge={<span className="badge b-blue">admin</span>}
    >
      {tab === 'overview' && (
        <div className="grid">
          <div className="grid grid-4">
            <div className="card"><div className="muted">Users</div><div className="kpi">{ov?.totals.users ?? '…'}</div></div>
            <div className="card"><div className="muted">Devices</div><div className="kpi">{ov?.totals.devices ?? '…'}</div></div>
            <div className="card"><div className="muted">Reports</div><div className="kpi">{ov?.totals.reports ?? '…'}</div></div>
            <div className="card"><div className="muted">Readings</div><div className="kpi">{ov?.totals.readings ?? '…'}</div></div>
          </div>
          <div className="grid grid-2">
            <div className="card"><h4>Reports by status</h4>
              <table><tbody>{(ov?.reports || []).map((r) => <tr key={r.status}><td>{r.status}</td><td><b>{r.c}</b></td></tr>)}</tbody></table>
            </div>
            <div className="card"><h4>Users by role / status</h4>
              <table><tbody>{(ov?.byRole || []).map((r, i) => <tr key={i}><td>{r.role} · {r.status}</td><td><b>{r.c}</b></td></tr>)}</tbody></table>
            </div>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="grid">
          {!pending.length && <div className="card">No pending technician applications. New applicants with ID and certificates appear here.</div>}
          {pending.map((t) => (
            <div className="card" key={t.id}>
              <h4>{t.name} <span className="badge b-amber">pending verification</span></h4>
              <div className="grid grid-2">
                <div>
                  <p><b>Email:</b> {t.email}<br /><b>Phone:</b> {t.phone || '—'}<br /><b>Location:</b> {t.location || '—'}<br /><b>Organisation:</b> {t.org_name || '—'}</p>
                </div>
                <div>
                  <p><b>National ID:</b> {t.id_number || '—'}<br /><b>Specialization:</b> {t.specialization || '—'}<br /><b>Experience:</b> {t.experience_years} yrs<br /><b>Certificates:</b> {t.cert_details || '—'}<br /><b>Document link:</b> {t.cert_url ? <a href={t.cert_url} target="_blank" rel="noreferrer">Open document</a> : '—'}</p>
                </div>
              </div>
              <div className="row-btns">
                <button className="btn btn-primary" onClick={() => verify(t.id)}>Verify & unlock</button>
                <button className="btn btn-ghost" onClick={() => reject(t.id)}>Reject</button>
              </div>
              <p className="muted">On verify, the technician signs in normally and all features unlock immediately.</p>
            </div>))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card"><h4>All users</h4>
          <div className="dash-row"><input placeholder="Search name, email, organisation…" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="btn btn-ghost" onClick={load}>Search</button></div>
          <table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {users.map((u) => <tr key={u.id}><td><b>{u.name}</b><div className="muted">{u.email} · {u.org_name}</div></td><td>{u.role}</td><td><span className="badge b-blue">{u.status}</span></td>
              <td><div className="row-btns">
                {u.status === 'pending' && <button className="btn btn-primary" onClick={() => verify(u.id)}>Verify</button>}
                {u.status === 'active'
                  ? <button className="btn btn-ghost" onClick={() => setStatus(u.id, { status: 'suspended' })}>Suspend</button>
                  : u.status !== 'pending' && <button className="btn btn-ghost" onClick={() => setStatus(u.id, { status: 'active' })}>Activate</button>}
              </div></td></tr>)}
          </tbody></table>
          <h4 style={{ marginTop: 16 }}>Onboard directly</h4>
          <form onSubmit={onboard} className="grid grid-3">
            <input placeholder="Name" value={newU.name} onChange={(e) => setNewU({ ...newU, name: e.target.value })} required />
            <input placeholder="Email" value={newU.email} onChange={(e) => setNewU({ ...newU, email: e.target.value })} required />
            <select value={newU.role} onChange={(e) => setNewU({ ...newU, role: e.target.value })}><option value="user">user</option><option value="technician">technician</option><option value="admin">admin</option></select>
            <input placeholder="Organisation" value={newU.org_name} onChange={(e) => setNewU({ ...newU, org_name: e.target.value })} />
            <button className="btn btn-primary" type="submit">Onboard</button>
          </form>
        </div>
      )}

      {tab === 'reports' && (
        <div className="card"><h4>Triage & assign</h4>
          <table><thead><tr><th>Report</th><th>Status</th><th>Assign</th></tr></thead><tbody>
            {reports.map((r) => <tr key={r.id}><td><b>{r.title}</b><div className="muted">{r.category} · {r.priority} · {r.location}</div><div className="muted">{r.ai_triage}</div></td>
              <td><span className="badge b-blue">{r.status}</span><div className="row-btns"><button className="link-btn" onClick={() => triage(r.id, 'resolved')}>Resolve</button></div></td>
              <td><div className="row-btns">
                <select value={assign[r.id] || ''} onChange={(e) => setAssign({ ...assign, [r.id]: e.target.value })}>
                  <option value="">— technician —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button className="btn btn-ghost" onClick={() => triage(r.id, 'assign')}>Assign</button>
              </div></td></tr>)}
          </tbody></table>
        </div>
      )}

      {tab === 'devices' && (
        <div className="card"><h4>All devices</h4>
          <table><thead><tr><th>Device</th><th>Key</th><th>Last seen</th></tr></thead><tbody>
            {devices.map((d) => <tr key={d.id}><td>{d.name}<div className="muted">{d.site} · {d.capacity_liters} L</div></td><td><code>{d.device_key}</code></td><td>{new Date(d.last_seen).toLocaleString()}</td></tr>)}
          </tbody></table>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid">
          <div className="card"><h4>System flow — 14 days (avg L/min)</h4>
            <ResponsiveContainer width="100%" height={240}><LineChart data={consumption}><XAxis dataKey="day" hide /><YAxis /><Tooltip /><Line type="monotone" dataKey="avg_flow" stroke="#0b5fa5" dot={false} /></LineChart></ResponsiveContainer>
          </div>
          <div className="card"><h4>Alerts in last 7 days: {ov?.alerts7d ?? '…'}</h4><p className="muted">Watch leak and shortage alert volume as your non-revenue-water proxy.</p></div>
        </div>
      )}
    </DashboardShell>
  );
}
