import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import DashboardShell from '../components/DashboardShell';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

function badge(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('critical') || t.includes('unsafe') || t.includes('poor')) return 'b-red';
  if (t.includes('high') || t.includes('fair') || t.includes('pending')) return 'b-amber';
  if (t.includes('excellent') || t.includes('good') || t.includes('resolved') || t.includes('active')) return 'b-green';
  return 'b-blue';
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [devices, setDevices] = useState([]);
  const [devId, setDevId] = useState('');
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsDays, setStatsDays] = useState(7);
  const [brief, setBrief] = useState(null);
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [form, setForm] = useState({ category: 'leakage', title: '', description: '', location: '', phone: '' });
  const [newDevice, setNewDevice] = useState({ name: '', site: 'Main Tank', capacity_liters: 10000 });

  const loadDevices = async () => {
    const { data } = await api.get('/devices');
    setDevices(data);
    setDevId((cur) => cur || (data[0] && data[0].id) || '');
  };
  const loadLive = async (id) => {
    if (!id) return;
    const { data } = await api.get(`/readings/${id}/latest`);
    setLive(data);
    const h = await api.get(`/readings/${id}/history?hours=24`);
    setHistory(h.data.map((r) => ({ ...r, t: new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })));
  };
  const loadRest = async () => {
    const [a, r, m] = await Promise.all([api.get('/readings/alerts/mine'), api.get('/reports?mine=1'), api.get('/reports/inbox/all')]);
    setAlerts(a.data); setReports(r.data); setInbox(m.data);
  };
  const loadStats = async (id, days) => {
    if (!id) return;
    const [{ data: s }, { data: b }] = await Promise.all([
      api.get(`/readings/${id}/stats?days=${days}`),
      api.get(`/readings/${id}/summary`)
    ]);
    setStats(s); setBrief(b);
  };

  useEffect(() => { loadDevices(); loadRest(); }, []);
  useEffect(() => {
    if (!devId) return;
    loadLive(devId); loadStats(devId, statsDays);
    const t = setInterval(() => loadLive(devId), 20000);
    return () => clearInterval(t);
  }, [devId]);
  useEffect(() => { if (devId) loadStats(devId, statsDays); }, [statsDays]);

  const markRead = async (id) => { await api.patch(`/readings/alerts/${id}/read`); loadRest(); };
  const submitReport = async (e) => {
    e.preventDefault();
    await api.post('/reports', form);
    setForm({ category: 'leakage', title: '', description: '', location: '', phone: '' });
    loadRest();
  };
  const addDevice = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/devices', newDevice);
    setNewDevice({ name: '', site: 'Main Tank', capacity_liters: 10000 });
    await loadDevices(); setDevId(data.id);
  };
  const delDevice = async (id) => {
    if (!window.confirm('Remove this device and its readings?')) return;
    await api.delete(`/devices/${id}`); loadDevices();
  };
  const openThread = async (rep) => {
    const { data } = await api.get('/reports/inbox/all');
    setInbox(data);
    setThread({ report: rep, msgs: data.filter((m) => m.report_id === rep.id) });
  };
  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !thread) return;
    const other = thread.msgs.find((m) => m.sender_id !== user.id);
    const receiver = thread.report.tech_id || other?.sender_id;
    const target = receiver || thread.report.assigned_to;
    if (!target) { alert('No technician on this ticket yet — they will message you once assigned.'); return; }
    await api.post(`/reports/${thread.report.id}/message`, { receiver_id: target, body: reply });
    setReply(''); openThread(thread.report);
  };

  const L = live?.latest, AI = live?.ai;
  const pct = Number(L?.level_percent || 0);
  const gaugeColor = pct > 50 ? '#16a34a' : pct > 25 ? '#f59e0b' : '#dc2626';
  const unreadAlerts = alerts.filter((a) => !a.is_read).length;
  const unreadMsg = inbox.filter((m) => !m.is_read && m.receiver_id === user?.id).length;

  const items = [
    { key: 'overview', label: 'Overview', icon: '◉' },
    { key: 'analytics', label: 'Analytics & Bills', icon: '▦' },
    { key: 'reports', label: 'Reports', icon: '✎', count: reports.filter((r) => r.status !== 'resolved').length },
    { key: 'messages', label: 'Messages', icon: '✉', count: unreadMsg },
    { key: 'devices', label: 'Devices', icon: '●', count: devices.length },
    { key: 'help', label: 'Help', icon: '?' }
  ];

  return (
    <DashboardShell
      brand="Institution Dashboard"
      org={user?.org_name || user?.name}
      items={items} active={tab} onNav={setTab} onLogout={logout}
      badge={<span className="badge b-green">{user?.role}</span>}
    >
      <div className="dash-toolbar">
        <strong>{user?.name}</strong>
        <select value={devId} onChange={(e) => setDevId(e.target.value)} style={{ maxWidth: 280 }}>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.site}</option>)}
        </select>
      </div>

      {tab === 'overview' && (
        !live ? <div className="card">Connecting to live sensors…</div> : (<div className="grid">
          <div className="grid grid-4">
            <div className="card gauge-wrap"><div className="gauge" style={{ background: gaugeColor }}>{pct.toFixed(0)}%</div><div><b>Tank level</b><div className="muted">{Number(L.volume_liters).toFixed(0)} L</div></div></div>
            <div className="card"><div className="muted">Flow now</div><div className="kpi">{Number(L.flow_lpm).toFixed(1)} L/min</div><div className="muted">Pressure {L.pressure_bar} bar · Batt {L.battery}%</div></div>
            <div className="card"><div className="muted">Purity score</div><div className="kpi">{AI.purity.score}/100</div><span className={`badge ${badge(AI.purity.grade)}`}>{AI.purity.grade}</span><div className="muted">{AI.purity.advice}</div></div>
            <div className="card"><div className="muted">Water remaining</div><div className="kpi">{AI.shortage.daysLeft} days</div><div className="muted">{AI.shortage.msg}</div></div>
          </div>

          {brief && <div className="card brief"><h4>AI briefing — {brief.headline}</h4>{brief.paragraphs.map((p, i) => <p key={i}>{p}</p>)}{brief.tips.length > 0 && <><b>Recommended next:</b><ul>{brief.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></>}</div>}

          <div className="grid grid-2">
            <div className="card"><h4>Flow — last 24 hours</h4>
              <ResponsiveContainer width="100%" height={220}><LineChart data={history}><XAxis dataKey="t" hide /><YAxis /><Tooltip /><Line type="monotone" dataKey="flow_lpm" stroke="#0b5fa5" dot={false} /></LineChart></ResponsiveContainer>
            </div>
            <div className="card"><h4>Tank level — last 24 hours</h4>
              <ResponsiveContainer width="100%" height={220}><AreaChart data={history}><XAxis dataKey="t" hide /><YAxis /><Tooltip /><Area type="monotone" dataKey="level_percent" stroke="#0ea5a4" fill="#99f6e4" /></AreaChart></ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card"><h4>System insights</h4>
              <p><span className={`badge ${AI.leak.burst ? 'b-red' : AI.leak.leak ? 'b-amber' : 'b-green'}`}>{AI.leak.burst ? 'BURST' : AI.leak.leak ? 'LEAK SUSPECTED' : 'NO LEAK'}</span></p>
              <p>{AI.leak.reason}</p>
              {AI.leak.advice && <p className="muted">{AI.leak.advice}</p>}
              <p className="muted">TDS {L.tds_ppm} ppm · Turbidity {L.turbidity_ntu} NTU · pH {L.ph} · {L.temp_c}°C</p>
              {AI.purity.issues.map((i, k) => <p key={k}>! {i}</p>)}
            </div>
            <div className="card"><h4>Alerts ({unreadAlerts} unread)</h4>
              {alerts.slice(0, 6).map((a) => <div key={a.id} className="feed-row"><span className={`badge ${badge(a.severity)}`}>{a.severity}</span> <b>{a.title}</b><div className="muted">{a.detail}</div><div className="muted">{a.ai_advice}</div>{!a.is_read && <button className="link-btn" onClick={() => markRead(a.id)}>Mark read</button>}</div>)}
              {!alerts.length && <p className="muted">All clear — no alerts.</p>}
            </div>
          </div>
        </div>)
      )}

      {tab === 'analytics' && (
        <div className="grid">
          <div className="card dash-row"><h4>Consumption analytics</h4>
            <select value={statsDays} onChange={(e) => setStatsDays(Number(e.target.value))} style={{ maxWidth: 200 }}>
              <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
            </select>
          </div>
          {stats ? (<>
            <div className="grid grid-4">
              <div className="card"><div className="muted">Avg use / day</div><div className="kpi">{stats.avgLitresDay.toLocaleString()} L</div></div>
              <div className="card"><div className="muted">Total volume</div><div className="kpi">{stats.totalM3} m³</div><div className="muted">over {stats.days} days</div></div>
              <div className="card"><div className="muted">Trend vs prior period</div><div className="kpi">{stats.trendPct > 0 ? '+' : ''}{stats.trendPct}%</div><div className="muted">{stats.trendPct > 10 ? 'Usage climbing — check for leaks.' : 'Stable usage.'}</div></div>
              <div className="card"><div className="muted">Estimated bill</div><div className="kpi">KES {stats.estBillKES.toLocaleString()}</div><div className="muted">{stats.tariffNote}</div></div>
            </div>
            <div className="card"><h4>Daily use (litres)</h4>
              <ResponsiveContainer width="100%" height={240}><BarChart data={stats.perDay}><XAxis dataKey="day" tickFormatter={(d) => String(d).slice(5)} /><YAxis /><Tooltip /><Bar dataKey="litres_day" fill="#0b5fa5" /></BarChart></ResponsiveContainer>
            </div>
            <div className="card"><h4>Quality extremes by day</h4>
              <table><thead><tr><th>Day</th><th>Avg level %</th><th>Peak TDS</th><th>Peak turbidity</th></tr></thead><tbody>
                {stats.perDay.map((r) => <tr key={r.day}><td>{String(r.day).slice(0, 10)}</td><td>{Number(r.avg_level).toFixed(0)}%</td><td>{Number(r.max_tds).toFixed(0)} ppm</td><td>{Number(r.max_turb).toFixed(1)} NTU</td></tr>)}
              </tbody></table>
            </div>
          </>) : <div className="card">Loading analytics…</div>}
        </div>
      )}

      {tab === 'reports' && (
        <div className="grid grid-2">
          <div className="card"><h4>Report a problem</h4>
            <form onSubmit={submitReport}>
              <label>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="leakage">Leakage</option><option value="burst">Burst pipe</option><option value="shortage">Shortage / No water</option><option value="quality">Dirty / unsafe water</option><option value="billing">Billing</option><option value="other">Other</option>
              </select>
              <label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Burst on the school road" />
              <label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What, where, since when…" />
              <div className="grid grid-2"><div><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div></div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>Send report</button>
            </form>
          </div>
          <div className="card"><h4>My tickets</h4>
            <table><thead><tr><th>Title</th><th>Status</th><th></th></tr></thead><tbody>
              {reports.map((r) => <tr key={r.id}><td><b>{r.title}</b><div className="muted">{r.category} · {r.priority} · {r.tech_name || 'unassigned'}</div></td><td><span className={`badge ${badge(r.status)}`}>{r.status}</span></td><td><button className="link-btn" onClick={() => openThread(r)}>Thread</button></td></tr>)}
            </tbody></table>
            {!reports.length && <p className="muted">No reports yet.</p>}
            {thread && <div className="thread"><h4>{thread.report.title}</h4>
              {thread.msgs.map((m) => <div key={m.id} className={`msg ${m.sender_id === user.id ? 'me' : 'bot'}`}>{m.body}<div className="muted">{m.sender_name} · {new Date(m.created_at).toLocaleString()}</div></div>)}
              {!thread.msgs.length && <p className="muted">No messages yet.</p>}
              <form onSubmit={sendReply} className="thread-form"><input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write to the technician…" /><button className="btn btn-primary" type="submit">Send</button></form>
            </div>}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="card"><h4>Inbox</h4>
          {inbox.filter((m) => m.receiver_id === user?.id).map((m) => (
            <div key={m.id} className="feed-row"><b>{m.sender_name}</b> <span className="muted">{m.report_title || 'direct'} · {new Date(m.created_at).toLocaleString()}</span><p>{m.body}</p></div>
          ))}
          {!inbox.filter((m) => m.receiver_id === user?.id).length && <p className="muted">No messages. Technicians reply inside your report threads.</p>}
        </div>
      )}

      {tab === 'devices' && (
        <div className="card"><h4>My sensor devices</h4>
          <table><thead><tr><th>Name</th><th>Site</th><th>Device key</th><th>Capacity</th><th></th></tr></thead><tbody>
            {devices.map((d) => <tr key={d.id}><td>{d.name}</td><td>{d.site}</td><td><code>{d.device_key}</code></td><td>{d.capacity_liters} L</td><td><button className="link-btn" onClick={() => delDevice(d.id)}>Remove</button></td></tr>)}
          </tbody></table>
          <form onSubmit={addDevice} className="grid grid-3" style={{ marginTop: 12 }}>
            <input placeholder="Device name" value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} required />
            <input placeholder="Site" value={newDevice.site} onChange={(e) => setNewDevice({ ...newDevice, site: e.target.value })} />
            <button className="btn btn-ghost" type="submit">Add device</button>
          </form>
          <p className="muted">Point each sensor unit at <code>POST /api/ingest/DEVICE_KEY</code>. Without hardware the demo simulates live data.</p>
        </div>
      )}

      {tab === 'help' && (
        <div className="grid grid-2">
          <div className="card"><h4>Reading your dashboard</h4>
            <p><b>Tank level</b> is litres remaining. <b>Flow</b> is current draw. <b>Purity</b> blends TDS, turbidity and pH into 0–100.</p>
            <p><b>Days remaining</b> divides litres by your daily average. Below 2 days, book a refill.</p>
            <p>A <b>leak alert</b> means night flow or nonstop flow — read the meter at 10pm and 5am to confirm.</p>
          </div>
          <div className="card"><h4>Need a human?</h4><p>File a report and a technician responds in the thread. For anything else, use Daggy (bottom-right) or contact {<a href="mailto:mwebidouglas08@gmail.com">mwebidouglas08@gmail.com</a>} / +254 796 820 013.</p></div>
        </div>
      )}
    </DashboardShell>
  );
}
