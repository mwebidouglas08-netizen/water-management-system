import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const [ov, setOv] = useState(null);
  const [diag, setDiag] = useState({ description: '', category: 'leakage' });
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState({ receiver: '', body: '', report: '' });

  const load = async () => { const { data } = await api.get('/tech/overview'); setOv(data); };
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  const update = async (id, patch) => { await api.patch(`/reports/${id}`, patch); load(); };
  const diagnose = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/tech/diagnose', diag);
    setResult(data);
  };
  const sendMsg = async (e) => {
    e.preventDefault();
    if (msg.report) await api.post(`/reports/${msg.report}/message`, { receiver_id: msg.receiver, body: msg.body });
    else await api.post('/reports/message/direct', { receiver_id: msg.receiver, body: msg.body });
    setMsg({ receiver: '', body: '', report: '' });
  };

  return (
    <div className="sidebar-layout">
      <div className="sidebar"><h3>🔧 TechDesk</h3><p style={{ color: '#93c5fd' }}>{user?.name}</p>
        <a className="active" href="/tech">📥 Inbox & Jobs</a>
        <a href="#diagnose">🤖 AI Diagnose</a>
        <a href="/login" onClick={logout}>🚪 Logout</a>
      </div>
      <div>
        <div className="topbar"><b>Technician Dashboard</b><span className="badge b-blue">{ov ? `${ov.unread} unread` : '…'}</span></div>
        <div style={{ padding: 20 }} className="grid">
          <div className="grid grid-3">
            <div className="card"><div className="muted">My active jobs</div><div className="kpi">{ov?.assigned.length ?? '…'}</div></div>
            <div className="card"><div className="muted">Open pool (unassigned)</div><div className="kpi">{ov?.openPool.length ?? '…'}</div></div>
            <div className="card"><div className="muted">Resolved by me</div><div className="kpi">{ov?.doneCount ?? '…'}</div></div>
          </div>

          <div className="grid grid-2">
            <div className="card"><h4>🟡 My jobs</h4>
              {(ov?.assigned || []).map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                  <b>{r.title}</b> <span className="badge b-amber">{r.priority}</span> <span className="badge b-blue">{r.status}</span>
                  <div className="muted">{r.category} • {r.location} • {r.description}</div>
                  <div className="muted">💡 {r.ai_triage}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-ghost" onClick={() => update(r.id, { status: 'in_progress' })}>Start</button>
                    <button className="btn btn-primary" onClick={() => update(r.id, { status: 'resolved' })}>Resolve ✓</button>
                  </div>
                </div>))}
              {!ov?.assigned.length && <p className="muted">No active jobs — claim from the open pool.</p>}
            </div>
            <div className="card"><h4>📥 Open reports pool</h4>
              {(ov?.openPool || []).slice(0, 8).map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                  <b>{r.title}</b> <span className="badge b-amber">{r.priority}</span>
                  <div className="muted">{r.category} • {r.location} • by {r.reporter_name}</div>
                  <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => update(r.id, { status: 'assigned', assigned_to: user.id })}>Claim job →</button>
                </div>))}
            </div>
          </div>

          <div id="diagnose" className="grid grid-2">
            <div className="card"><h4>🤖 AI Diagnose helper</h4>
              <p className="muted">Paste what the citizen said + what you see. Daggy-grade AI returns likely cause, tools & steps.</p>
              <form onSubmit={diagnose}>
                <label>Category</label><select value={diag.category} onChange={e => setDiag({ ...diag, category: e.target.value })}>
                  <option value="leakage">Leakage</option><option value="burst">Burst</option><option value="shortage">Shortage</option><option value="quality">Quality</option><option value="other">Other</option>
                </select>
                <label>Site description</label><textarea rows={4} value={diag.description} onChange={e => setDiag({ ...diag, description: e.target.value })} placeholder="e.g. Water gushing at gate, meter spinning, pressure low…" required />
                <button className="btn btn-primary" style={{ marginTop: 10 }}>Diagnose ✨</button>
              </form>
            </div>
            <div className="card"><h4>Result</h4>
              {!result ? <p className="muted">Run a diagnosis to get checklist + safety steps.</p> : (<>
                <p><b>Likely cause:</b> {result.cause}</p>
                <p><span className="badge b-amber">{result.priority}</span> {result.note}</p>
                <ul>{result.checklist?.map((c, i) => <li key={i}>🧰 {c}</li>)}</ul>
                <ol>{result.steps?.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </>)}
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card"><h4>💬 Message citizen / admin</h4>
              <form onSubmit={sendMsg}>
                <label>Receiver user ID (ask admin for IDs; reporter reply uses report thread)</label><input value={msg.receiver} onChange={e => setMsg({ ...msg, receiver: e.target.value })} required placeholder="UUID" />
                <label>Report ID (optional)</label><input value={msg.report} onChange={e => setMsg({ ...msg, report: e.target.value })} placeholder="leave blank for direct" />
                <label>Message</label><textarea value={msg.body} onChange={e => setMsg({ ...msg, body: e.target.value })} required placeholder="Niko njiani, funga valve ya mtaa…" />
                <button className="btn btn-primary" style={{ marginTop: 8 }}>Send</button>
              </form>
            </div>
            <div className="card"><h4>📡 Device health (all sites)</h4>
              <table><thead><tr><th>Device</th><th>Owner</th><th>Last seen</th></tr></thead><tbody>
                {(ov?.devices || []).map(d => <tr key={d.id}><td>{d.name}<div className="muted">{d.site}</div></td><td>{d.owner}</td><td>{new Date(d.last_seen).toLocaleString()}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
