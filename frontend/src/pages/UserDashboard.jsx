import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function badge(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('critical') || t.includes('unsafe') || t.includes('poor')) return 'b-red';
  if (t.includes('high') || t.includes('fair')) return 'b-amber';
  if (t.includes('excellent') || t.includes('good') || t.includes('resolved') || t.includes('ok')) return 'b-green';
  return 'b-blue';
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const [devices, setDevices] = useState([]);
  const [devId, setDevId] = useState('');
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ category: 'leakage', title: '', description: '', location: '', phone: '' });
  const [newDevice, setNewDevice] = useState({ name: '', site: 'Main Tank', capacity_liters: 10000 });

  const loadDevices = async () => {
    const { data } = await api.get('/devices');
    setDevices(data);
    if (data.length && !devId) setDevId(data[0].id);
  };
  const loadLive = async (id) => {
    if (!id) return;
    const { data } = await api.get(`/readings/${id}/latest`);
    setLive(data);
    const h = await api.get(`/readings/${id}/history?hours=24`);
    setHistory(h.data.map(r => ({ ...r, t: new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })));
  };
  const loadRest = async () => {
    const [a, r] = await Promise.all([api.get('/readings/alerts/mine'), api.get('/reports?mine=1')]);
    setAlerts(a.data); setReports(r.data);
  };

  useEffect(() => { loadDevices(); loadRest(); }, []);
  useEffect(() => { if (devId) { loadLive(devId); const t = setInterval(() => loadLive(devId), 15000); return () => clearInterval(t); } }, [devId]);

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

  const L = live?.latest, AI = live?.ai;
  const pct = Number(L?.level_percent || 0);
  const gaugeColor = pct > 50 ? '#16a34a' : pct > 25 ? '#f59e0b' : '#dc2626';

  return (
    <div className="sidebar-layout">
      <div className="sidebar">
        <h3>💧 MajiSafe</h3>
        <p className="muted" style={{ color: '#93c5fd' }}>{user?.org_name || user?.name}</p>
        <a className="active" href="/app">📊 Overview</a>
        <a href="#reports">📝 My Reports</a>
        <a href="#devices">📡 Devices</a>
        <a href="/login" onClick={logout}>🚪 Logout</a>
      </div>
      <div>
        <div className="topbar">
          <b>Institution Dashboard — {user?.name}</b>
          <select value={devId} onChange={e => setDevId(e.target.value)} style={{ maxWidth: 260 }}>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name} — {d.site}</option>)}
          </select>
        </div>
        <div style={{ padding: 20 }} className="grid">
          {!live ? <div className="card">Connecting to live sensors… (simulator keeps demo alive)</div> : (<>
            <div className="grid grid-4">
              <div className="card gauge-wrap"><div className="gauge" style={{ background: gaugeColor }}>{pct.toFixed(0)}%</div><div><b>Tank level</b><div className="muted">{Number(L.volume_liters).toFixed(0)} L</div></div></div>
              <div className="card"><div className="muted">Flow</div><div className="kpi">{Number(L.flow_lpm).toFixed(1)} L/min</div><div className="muted">Pressure {L.pressure_bar} bar</div></div>
              <div className="card"><div className="muted">Purity score</div><div className="kpi">{AI.purity.score}/100</div><span className={`badge ${badge(AI.purity.grade)}`}>{AI.purity.grade}</span><div className="muted">{AI.purity.advice}</div></div>
              <div className="card"><div className="muted">Shortage forecast</div><div className="kpi">{AI.shortage.daysLeft} days</div><div className="muted">{AI.shortage.msg}</div></div>
            </div>

            <div className="grid grid-2">
              <div className="card"><h4>Flow — last 24h (L/min)</h4>
                <ResponsiveContainer width="100%" height={220}><LineChart data={history}><XAxis dataKey="t" hide /><YAxis /><Tooltip /><Line type="monotone" dataKey="flow_lpm" stroke="#0b5fa5" dot={false} /></LineChart></ResponsiveContainer>
              </div>
              <div className="card"><h4>Tank level % — last 24h</h4>
                <ResponsiveContainer width="100%" height={220}><AreaChart data={history}><XAxis dataKey="t" hide /><YAxis /><Tooltip /><Area type="monotone" dataKey="level_percent" stroke="#0ea5a4" fill="#99f6e4" /></AreaChart></ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card"><h4>🤖 AI Insights</h4>
                <p><span className={`badge ${AI.leak.burst ? 'b-red' : AI.leak.leak ? 'b-amber' : 'b-green'}`}>{AI.leak.burst ? 'BURST' : AI.leak.leak ? 'LEAK SUSPECTED' : 'NO LEAK'}</span></p>
                <p>{AI.leak.reason}</p>
                {AI.leak.advice && <p className="muted">{AI.leak.advice}</p>}
                <p className="muted">TDS {L.tds_ppm} ppm • Turbidity {L.turbidity_ntu} NTU • pH {L.ph} • {L.temp_c}°C • 🔋 {L.battery}%</p>
                {AI.purity.issues.map((i, k) => <p key={k}>⚠️ {i}</p>)}
              </div>
              <div className="card"><h4>🔔 Alerts</h4>
                {alerts.slice(0, 6).map(a => <div key={a.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}><span className={`badge ${badge(a.severity)}`}>{a.severity}</span> <b>{a.title}</b><div className="muted">{a.detail}</div><div className="muted">💡 {a.ai_advice}</div></div>)}
                {!alerts.length && <p className="muted">All clear — no alerts in your inbox.</p>}
              </div>
            </div>
          </>)}

          <div id="reports" className="grid grid-2">
            <div className="card"><h4>📝 Report a problem to authorities</h4>
              <form onSubmit={submitReport}>
                <label>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="leakage">Leakage</option><option value="burst">Burst pipe</option><option value="shortage">Shortage / No water</option><option value="quality">Dirty / unsafe water</option><option value="billing">Billing</option><option value="other">Other</option>
                </select>
                <label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Burst on school road, water flooding" />
                <label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What, where, since when, photo note…" />
                <div className="grid grid-2"><div><label>Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Block A, Ruiru" /></div>
                <div><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                <button className="btn btn-primary" style={{ marginTop: 12 }}>Send report →</button>
              </form>
            </div>
            <div className="card"><h4>My tickets</h4>
              <table><thead><tr><th>Title</th><th>Status</th><th>Priority</th></tr></thead><tbody>
                {reports.map(r => <tr key={r.id}><td>{r.title}<div className="muted">{r.category} • {r.tech_name || 'unassigned'}</div></td><td><span className={`badge ${badge(r.status)}`}>{r.status}</span></td><td>{r.priority}</td></tr>)}
              </tbody></table>
              {!reports.length && <p className="muted">No reports yet — file your first above.</p>}
            </div>
          </div>

          <div id="devices" className="card"><h4>📡 My IoT devices</h4>
            <table><thead><tr><th>Name</th><th>Site</th><th>Key (ESP32)</th><th>Capacity</th></tr></thead><tbody>
              {devices.map(d => <tr key={d.id}><td>{d.name}</td><td>{d.site}</td><td><code>{d.device_key}</code></td><td>{d.capacity_liters} L</td></tr>)}
            </tbody></table>
            <form onSubmit={addDevice} className="grid grid-3" style={{ marginTop: 12 }}>
              <input placeholder="Device name e.g. Dorm Tank" value={newDevice.name} onChange={e => setNewDevice({ ...newDevice, name: e.target.value })} required />
              <input placeholder="Site" value={newDevice.site} onChange={e => setNewDevice({ ...newDevice, site: e.target.value })} />
              <button className="btn btn-ghost">+ Add device</button>
            </form>
            <p className="muted">Flash each ESP32 with its key: <code>POST {'{VITE_API_URL}'}/api/ingest/DEVICE_KEY</code> — see docs/IOT_GUIDE.md</p>
          </div>
        </div>
      </div>
    </div>
  );
}
