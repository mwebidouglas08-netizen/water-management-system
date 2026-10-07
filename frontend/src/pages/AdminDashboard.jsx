import { Fragment, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import DashboardShell from '../components/DashboardShell';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function DocPreview({ url }) {
  if (!url) return <span className="muted">No document attached.</span>;
  if (url.startsWith('data:image')) return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Applicant document" className="doc-thumb" /></a>;
  if (url.startsWith('data:application/pdf')) return <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">Open attached PDF</a>;
  return <a href={url} target="_blank" rel="noreferrer">Open document link</a>;
}

function stale(lastSeen, mins = 15) {
  return Date.now() - new Date(lastSeen).getTime() > mins * 60 * 1000;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('command');
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [reports, setReports] = useState([]);
  const [repFilter, setRepFilter] = useState('');
  const [devices, setDevices] = useState([]);
  const [techs, setTechs] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [threads, setThreads] = useState([]);
  const [detail, setDetail] = useState(null);
  const [contact, setContact] = useState('');
  const [newU, setNewU] = useState({ name: '', email: '', password: 'User123!', role: 'user', org_name: '' });
  const [assign, setAssign] = useState({});
  const [repMsgs, setRepMsgs] = useState({});

  const load = async () => {
    const [o, r, d, c, t] = await Promise.all([
      api.get('/admin/overview'), api.get('/reports'),
      api.get('/devices'), api.get('/admin/consumption'), api.get('/reports/inbox/all')
    ]);
    setOv(o.data); setReports(r.data); setDevices(d.data); setThreads(t.data);
    setConsumption(c.data.map((x) => ({ ...x, day: String(x.day).slice(0, 10), litres: Math.round((x.avg_flow || 0) * 1440) })));
    const u = await api.get('/admin/users?search=' + encodeURIComponent(search));
    setUsers(u.data);
    setTechs(u.data.filter((x) => x.role === 'technician' && x.status === 'active'));
    const p = await api.get('/admin/users?status=pending&role=technician');
    setPending(p.data);
  };
  useEffect(() => { load(); }, []);

  const verify = async (id) => { await api.post(`/admin/users/${id}/verify`); load(); };
  const reject = async (id) => {
    if (!window.confirm('Reject this technician application? The account will be suspended.')) return;
    await api.post(`/admin/users/${id}/reject`); load();
  };
  const setStatus = async (id, patch) => { await api.patch(`/admin/users/${id}`, patch); load(); };
  const onboard = async (e) => {
    e.preventDefault();
    await api.post('/admin/users', newU);
    setNewU({ name: '', email: '', password: 'User123!', role: 'user', org_name: '' }); load();
  };
  const triage = async (id, mode) => {
    if (mode === 'assign') {
      if (!assign[id]) { alert('Pick a technician first.'); return; }
      await api.patch(`/reports/${id}`, { status: 'assigned', assigned_to: assign[id] });
    } else {
      await api.patch(`/reports/${id}`, { status: mode });
    }
    load();
  };
  const contactUser = async (e, u) => {
    e.preventDefault();
    if (!contact.trim()) return;
    await api.post('/reports/message/direct', { receiver_id: u.id, body: contact });
    setContact(''); alert(`Message sent to ${u.name}.`);
  };
  const replyThread = async (e, reportId, receiverId) => {
    e.preventDefault();
    const key = reportId ?? receiverId;
    const body = (repMsgs[key] || '').trim();
    if (!body) return;
    if (reportId) await api.post(`/reports/${reportId}/message`, { receiver_id: receiverId, body });
    else await api.post('/reports/message/direct', { receiver_id: receiverId, body });
    setRepMsgs((m) => ({ ...m, [key]: '' })); load();
  };

  const filteredUsers = users.filter((u) => !roleFilter || u.role === roleFilter);
  const filteredReports = reports.filter((r) => !repFilter || r.status === repFilter);
  const openCount = reports.filter((r) => r.status === 'open').length;
  const staleCount = devices.filter((d) => stale(d.last_seen)).length;
  const recentUsers = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const detailDevices = detail ? devices.filter((d) => d.user_id === detail.id) : [];
  const detailReports = detail ? reports.filter((r) => r.reporter_id === detail.id) : [];

  const items = [
    { key: 'command', label: 'Command', icon: '◉' },
    { key: 'approvals', label: 'Approvals', icon: '✓', count: pending.length },
    { key: 'users', label: 'Users', icon: '☺', count: users.length },
    { key: 'reports', label: 'Reports', icon: '✎', count: openCount },
    { key: 'devices', label: 'Devices', icon: '●', count: staleCount },
    { key: 'inbox', label: 'Inbox', icon: '✉' },
    { key: 'analytics', label: 'Analytics', icon: '▦' }
  ];

  return (
    <DashboardShell
      brand="Admin Command (/admin)"
      org={user?.name}
      items={items} active={tab} onNav={setTab} onLogout={logout}
      badge={<span className="badge b-blue">admin</span>}
    >
      {tab === 'command' && (
        <div className="grid">
          <div className="grid grid-4">
            <div className="card stat"><span className="stat-ico">☺</span><div><div className="muted">Total users</div><div className="kpi">{ov?.totals.users ?? '…'}</div></div></div>
            <div className={`card stat${pending.length ? ' pulse' : ''}`}><span className="stat-ico">✓</span><div><div className="muted">Awaiting approval</div><div className="kpi">{pending.length}</div></div></div>
            <div className="card stat"><span className="stat-ico">!</span><div><div className="muted">Open reports</div><div className="kpi">{openCount}</div></div></div>
            <div className="card stat"><span className="stat-ico">●</span><div><div className="muted">Stale devices</div><div className="kpi">{staleCount}</div></div></div>
          </div>
          <div className="grid grid-2">
            <div className="card"><h4>Needs your attention</h4>
              {pending.slice(0, 3).map((t) => <div key={t.id} className="feed-row"><b>{t.name}</b> <span className="muted">technician application · {t.specialization || 'general'}</span><div><button className="link-btn" onClick={() => setTab('approvals')}>Review application</button></div></div>)}
              {reports.filter((r) => r.status === 'open').slice(0, 3).map((r) => <div key={r.id} className="feed-row"><b>{r.title}</b> <span className={`badge b-amber`}>{r.priority}</span><div className="muted">{r.category} · {r.location}</div></div>)}
              {!pending.length && !openCount && <p className="muted">All clear — nothing waiting.</p>}
            </div>
            <div className="card"><h4>Latest activity</h4>
              {recentReports.map((r) => <div key={r.id} className="feed-row"><b>{r.title}</b> <span className="badge b-blue">{r.status}</span><div className="muted">{new Date(r.created_at).toLocaleString()}</div></div>)}
              <h4 style={{ marginTop: 12 }}>Newest accounts</h4>
              {recentUsers.map((u) => <div key={u.id} className="feed-row"><b>{u.name}</b> <span className="muted">{u.role} · {u.status}</span></div>)}
            </div>
          </div>
          <div className="card"><h4>System water use — 14 days</h4>
            <ResponsiveContainer width="100%" height={220}><BarChart data={consumption}><XAxis dataKey="day" hide /><YAxis /><Tooltip /><Bar dataKey="litres" fill="#0b5fa5" /></BarChart></ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="grid">
          {!pending.length && <div className="card">No pending applications. New technicians with ID documents appear here automatically.</div>}
          {pending.map((t) => (
            <div className="card" key={t.id}>
              <h4>{t.name} <span className="badge b-amber">pending verification</span></h4>
              <div className="grid grid-3">
                <div>
                  <b>Contact</b>
                  <p className="muted">{t.email}<br />{t.phone || 'No phone'}<br />{t.location || 'No location'}<br />{t.org_name || 'Independent'}</p>
                </div>
                <div>
                  <b>Credentials</b>
                  <p className="muted">National ID: <b>{t.id_number || '—'}</b><br />Specialization: {t.specialization || '—'}<br />Experience: {t.experience_years} yrs<br />Certificates: {t.cert_details || '—'}</p>
                </div>
                <div>
                  <b>Submitted document</b>
                  <div style={{ marginTop: 8 }}><DocPreview url={t.cert_url} /></div>
                </div>
              </div>
              <div className="row-btns">
                <button className="btn btn-primary" onClick={() => verify(t.id)}>Verify & unlock account</button>
                <button className="btn btn-ghost" onClick={() => reject(t.id)}>Reject application</button>
              </div>
              <p className="muted">Verification unlocks the technician workspace immediately — no re-login needed.</p>
            </div>))}
        </div>
      )}

      {tab === 'users' && (
        <div className="grid">
          <div className="card dash-row">
            <input placeholder="Search name, email, organisation…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="">All roles</option><option value="user">Users</option><option value="technician">Technicians</option><option value="admin">Admins</option>
            </select>
            <button className="btn btn-ghost" onClick={load}>Search</button>
          </div>
          <div className="card"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
            {filteredUsers.map((u) => (
              <Fragment key={u.id}>
              <tr><td><b>{u.name}</b><div className="muted">{u.email} · {u.org_name || '—'}</div></td><td>{u.role}</td>
                <td><span className={`badge ${u.status === 'active' ? 'b-green' : u.status === 'pending' ? 'b-amber' : 'b-red'}`}>{u.status}</span></td>
                <td><div className="row-btns">
                  <button className="link-btn" onClick={() => setDetail(detail?.id === u.id ? null : u)}>{detail?.id === u.id ? 'Hide' : 'Inspect'}</button>
                  {u.status === 'pending' && <button className="link-btn" onClick={() => verify(u.id)}>Verify</button>}
                  {u.status === 'active' && u.email !== user.email
                    ? <button className="link-btn" onClick={() => setStatus(u.id, { status: 'suspended' })}>Suspend</button>
                    : u.status === 'suspended' && <button className="link-btn" onClick={() => setStatus(u.id, { status: 'active' })}>Activate</button>}
                </div></td></tr>
              {detail?.id === u.id && (
                <tr key={u.id + '-detail'}><td colSpan={4}>
                  <div className="detail-panel">
                    <div><b>Contact</b><p className="muted">{u.phone || 'No phone'} · {u.location || 'No location'} · joined {new Date(u.created_at).toLocaleDateString()}</p>
                      {u.role === 'technician' && <p className="muted">ID {u.id_number || '—'} · {u.specialization || '—'} · {u.experience_years} yrs · {u.cert_details || 'No certs'}</p>}
                    </div>
                    <div><b>Devices ({detailDevices.length})</b>{detailDevices.map((d) => <p key={d.id} className="muted">{d.name} · {d.site} · {stale(d.last_seen) ? 'STALE' : 'live'}</p>)}{!detailDevices.length && <p className="muted">None.</p>}</div>
                    <div><b>Reports ({detailReports.length})</b>{detailReports.slice(0, 4).map((r) => <p key={r.id} className="muted">{r.title} · {r.status}</p>)}{!detailReports.length && <p className="muted">None.</p>}</div>
                    <form onSubmit={(e) => contactUser(e, u)} className="thread-form"><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={`Message ${u.name.split(' ')[0]}…`} /><button className="btn btn-primary" type="submit">Send</button></form>
                  </div>
                </td></tr>)}
            </Fragment>))}
          </tbody></table></div>
          <div className="card"><h4>Onboard user / technician</h4>
            <form onSubmit={onboard} className="grid grid-3">
              <input placeholder="Full name" value={newU.name} onChange={(e) => setNewU({ ...newU, name: e.target.value })} required />
              <input placeholder="Email" type="email" value={newU.email} onChange={(e) => setNewU({ ...newU, email: e.target.value })} required />
              <input placeholder="Temp password" value={newU.password} onChange={(e) => setNewU({ ...newU, password: e.target.value })} required />
              <select value={newU.role} onChange={(e) => setNewU({ ...newU, role: e.target.value })}><option value="user">user</option><option value="technician">technician</option><option value="admin">admin</option></select>
              <input placeholder="Organisation" value={newU.org_name} onChange={(e) => setNewU({ ...newU, org_name: e.target.value })} />
              <button className="btn btn-primary" type="submit">Create account</button>
            </form>
            <p className="muted">Onboarded technicians start verified. Self-registered ones go through Approvals.</p>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="card">
          <div className="dash-row"><h4>Triage & assign</h4>
            <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="">All statuses</option><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
            </select>
          </div>
          <table><thead><tr><th>Report</th><th>Status</th><th>Assign to technician</th></tr></thead><tbody>
            {filteredReports.map((r) => <tr key={r.id}><td><b>{r.title}</b><div className="muted">{r.category} · {r.priority} · {r.location} · by {r.reporter_name}</div><div className="muted">{r.ai_triage}</div></td>
              <td><span className="badge b-blue">{r.status}</span><div><button className="link-btn" onClick={() => triage(r.id, 'resolved')}>Resolve</button></div></td>
              <td><div className="row-btns">
                <select value={assign[r.id] || ''} onChange={(e) => setAssign({ ...assign, [r.id]: e.target.value })}>
                  <option value="">— technician —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.specialization || 'general'}</option>)}
                </select>
                <button className="btn btn-ghost" onClick={() => triage(r.id, 'assign')}>Assign</button>
              </div></td></tr>)}
          </tbody></table>
          {!filteredReports.length && <p className="muted">No reports under this filter.</p>}
        </div>
      )}

      {tab === 'devices' && (
        <div className="card"><h4>All devices ({devices.length}, {staleCount} stale)</h4>
          <table><thead><tr><th>Device</th><th>Key</th><th>Health</th></tr></thead><tbody>
            {devices.map((d) => <tr key={d.id}><td>{d.name}<div className="muted">{d.site} · {d.capacity_liters} L · {d.owner || '—'}</div></td><td><code>{d.device_key}</code></td>
              <td>{stale(d.last_seen) ? <span className="badge b-red">stale</span> : <span className="badge b-green">live</span>}<div className="muted">{new Date(d.last_seen).toLocaleString()}</div></td></tr>)}
          </tbody></table>
        </div>
      )}

      {tab === 'inbox' && (
        <div className="card"><h4>Messages reaching admin</h4>
          {threads.filter((m) => m.receiver_id === user.id).map((m) => (
            <div key={m.id} className="feed-row"><b>{m.sender_name}</b> <span className="muted">{m.report_title || 'direct'} · {new Date(m.created_at).toLocaleString()}</span><p>{m.body}</p>
              <form onSubmit={(e) => replyThread(e, m.report_id, m.sender_id)} className="thread-form">
                <input value={repMsgs[m.report_id ?? m.sender_id] || ''} onChange={(e) => setRepMsgs({ ...repMsgs, [m.report_id ?? m.sender_id]: e.target.value })} placeholder="Reply…" />
                <button className="btn btn-ghost" type="submit">Reply</button>
              </form>
            </div>))}
          {!threads.filter((m) => m.receiver_id === user.id).length && <p className="muted">Nobody has messaged the admin account directly. Use Inspect → message to reach any user.</p>}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid">
          <div className="grid grid-3">
            <div className="card"><div className="muted">Users</div><div className="kpi">{ov?.totals.users ?? '…'}</div></div>
            <div className="card"><div className="muted">Reports</div><div className="kpi">{ov?.totals.reports ?? '…'}</div></div>
            <div className="card"><div className="muted">Alerts (7d)</div><div className="kpi">{ov?.alerts7d ?? '…'}</div></div>
          </div>
          <div className="card"><h4>System water use — 14 days (litres/day)</h4>
            <ResponsiveContainer width="100%" height={240}><LineChart data={consumption}><XAxis dataKey="day" hide /><YAxis /><Tooltip /><Line type="monotone" dataKey="litres" stroke="#0b5fa5" dot={false} /></LineChart></ResponsiveContainer>
          </div>
          <div className="card"><h4>Reports by status</h4>
            <table><tbody>{(ov?.reports || []).map((r) => <tr key={r.status}><td>{r.status}</td><td><b>{r.c}</b></td></tr>)}</tbody></table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
