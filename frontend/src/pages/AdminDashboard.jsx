import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState([]);
  const [techs, setTechs] = useState([]);
  const [newU, setNewU] = useState({ name: '', email: '', password: 'User123!', role: 'user', org_name: '' });
  const [assign, setAssign] = useState({});

  const load = async () => {
    const [o, r] = await Promise.all([api.get('/admin/overview'), api.get('/reports')]);
    setOv(o.data); setReports(r.data);
    const u = await api.get('/admin/users?search=' + encodeURIComponent(search));
    setUsers(u.data);
    setTechs(u.data.filter(x => x.role === 'technician' && x.status === 'active'));
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, patch) => { await api.patch(`/admin/users/${id}`, patch); load(); };
  const onboard = async (e) => { e.preventDefault(); await api.post('/admin/users', newU); setNewU({ name: '', email: '', password: 'User123!', role: 'user', org_name: '' }); load(); };
  const triage = async (id) => { await api.patch(`/reports/${id}`, { status: 'assigned', assigned_to: assign[id] }); load(); };

  return (
    <div className="sidebar-layout">
      <div className="sidebar"><h3>🛡️ Admin</h3><p style={{ color: '#93c5fd' }}>{user?.name}</p>
        <a className="active" href="/admin">📊 Oversight</a>
        <a href="#users">👥 Users</a><a href="#reports">📝 Reports</a>
        <a href="/login" onClick={logout}>🚪 Logout</a>
      </div>
      <div>
        <div className="topbar"><b>Full system oversight</b><button className="btn btn-ghost" onClick={load}>↻ Refresh</button></div>
        <div style={{ padding: 20 }} className="grid">
          <div className="grid grid-4">
            <div className="card"><div className="muted">Users</div><div className="kpi">{ov?.totals.users ?? '…'}</div></div>
            <div className="card"><div className="muted">Devices</div><div className="kpi">{ov?.totals.devices ?? '…'}</div></div>
            <div className="card"><div className="muted">Reports</div><div className="kpi">{ov?.totals.reports ?? '…'}</div></div>
            <div className="card"><div className="muted">Readings</div><div className="kpi">{ov?.totals.readings ?? '…'}</div></div>
          </div>

          <div id="users" className="card"><h4>👥 Users — approve technicians, onboard, suspend</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input placeholder="Search name/email/org…" value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn btn-ghost" onClick={load}>Search</button>
            </div>
            <table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {users.map(u => <tr key={u.id}><td><b>{u.name}</b><div className="muted">{u.email} • {u.org_name}</div></td>
                <td>{u.role}</td><td><span className="badge b-blue">{u.status}</span></td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {u.status === 'pending' && <button className="btn btn-primary" onClick={() => setStatus(u.id, { status: 'active' })}>Approve ✓</button>}
                  {u.status === 'active' ? <button className="btn btn-ghost" onClick={() => setStatus(u.id, { status: 'suspended' })}>Suspend</button>
                    : <button className="btn btn-ghost" onClick={() => setStatus(u.id, { status: 'active' })}>Activate</button>}
                </td></tr>)}
            </tbody></table>
            <form onSubmit={onboard} className="grid grid-3" style={{ marginTop: 12 }}>
              <input placeholder="Name" value={newU.name} onChange={e => setNewU({ ...newU, name: e.target.value })} required />
              <input placeholder="Email" value={newU.email} onChange={e => setNewU({ ...newU, email: e.target.value })} required />
              <select value={newU.role} onChange={e => setNewU({ ...newU, role: e.target.value })}><option value="user">user</option><option value="technician">technician</option><option value="admin">admin</option></select>
              <input placeholder="Org" value={newU.org_name} onChange={e => setNewU({ ...newU, org_name: e.target.value })} />
              <button className="btn btn-primary">+ Onboard user</button>
            </form>
          </div>

          <div id="reports" className="card"><h4>📝 All reports — triage & assign</h4>
            <table><thead><tr><th>Report</th><th>Status</th><th>Assign to tech</th></tr></thead><tbody>
              {reports.map(r => <tr key={r.id}><td><b>{r.title}</b><div className="muted">{r.category} • {r.priority} • {r.location}</div><div className="muted">{r.ai_triage}</div></td>
                <td><span className="badge b-blue">{r.status}</span></td>
                <td><div style={{ display: 'flex', gap: 6 }}>
                  <select value={assign[r.id] || ''} onChange={e => setAssign({ ...assign, [r.id]: e.target.value })}>
                    <option value="">— tech —</option>{techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button className="btn btn-ghost" onClick={() => triage(r.id)}>Assign</button>
                </div></td></tr>)}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}
