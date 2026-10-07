import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import DashboardShell from '../components/DashboardShell';

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('jobs');
  const [ov, setOv] = useState(null);
  const [profile, setProfile] = useState(null);
  const [diag, setDiag] = useState({ description: '', category: 'leakage' });
  const [result, setResult] = useState(null);
  const [reply, setReply] = useState({});
  const [msg, setMsg] = useState({ receiver: '', body: '', report: '' });

  const load = async () => {
    const [{ data }, { data: me }] = await Promise.all([api.get('/tech/overview'), api.get('/auth/me')]);
    setOv(data); setProfile(me);
  };
  useEffect(() => { load(); const t = setInterval(load, 25000); return () => clearInterval(t); }, []);

  const update = async (id, patch) => { await api.patch(`/reports/${id}`, patch); load(); };
  const diagnose = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/tech/diagnose', diag);
    setResult(data);
  };
  const sendThreadReply = async (reportId, receiverId, e) => {
    e.preventDefault();
    const body = (reply[reportId] || '').trim();
    if (!body) return;
    await api.post(`/reports/${reportId}/message`, { receiver_id: receiverId, body });
    setReply((r) => ({ ...r, [reportId]: '' }));
    load();
  };
  const markMsgRead = async (id) => { await api.patch(`/reports/inbox/${id}/read`); load(); };
  const sendDirect = async (e) => {
    e.preventDefault();
    if (msg.report) await api.post(`/reports/${msg.report}/message`, { receiver_id: msg.receiver, body: msg.body });
    else await api.post('/reports/message/direct', { receiver_id: msg.receiver, body: msg.body });
    setMsg({ receiver: '', body: '', report: '' });
  };

  const threads = ov?.threads || [];
  const byReport = {};
  threads.forEach((m) => { const k = m.report_id || 'direct'; (byReport[k] = byReport[k] || []).push(m); });

  const items = [
    { key: 'jobs', label: 'Jobs', icon: '◉', count: ov?.assigned.length || 0 },
    { key: 'inbox', label: 'Inbox', icon: '✉', count: ov?.unread || 0 },
    { key: 'diagnose', label: 'AI Diagnose', icon: '✦' },
    { key: 'devices', label: 'Site devices', icon: '●' },
    { key: 'profile', label: 'My profile', icon: '☺' }
  ];

  return (
    <DashboardShell
      brand="Technician Workspace"
      org={profile?.org_name || user?.name}
      items={items} active={tab} onNav={setTab} onLogout={logout}
      badge={<span className="badge b-green">Verified technician</span>}
    >
      {tab === 'jobs' && (
        <div className="grid">
          <div className="grid grid-3">
            <div className="card"><div className="muted">My active jobs</div><div className="kpi">{ov?.assigned.length ?? '…'}</div></div>
            <div className="card"><div className="muted">Open pool</div><div className="kpi">{ov?.openPool.length ?? '…'}</div></div>
            <div className="card"><div className="muted">Resolved by me</div><div className="kpi">{ov?.doneCount ?? '…'}</div></div>
          </div>
          <div className="grid grid-2">
            <div className="card"><h4>My jobs</h4>
              {(ov?.assigned || []).map((r) => (
                <div key={r.id} className="feed-row">
                  <b>{r.title}</b> <span className="badge b-amber">{r.priority}</span> <span className="badge b-blue">{r.status}</span>
                  <div className="muted">{r.category} · {r.location}</div><div className="muted">{r.description}</div>
                  <div className="muted">Brief: {r.ai_triage}</div>
                  <div className="row-btns">
                    <button className="btn btn-ghost" onClick={() => update(r.id, { status: 'in_progress' })}>Start work</button>
                    <button className="btn btn-primary" onClick={() => update(r.id, { status: 'resolved' })}>Mark resolved</button>
                  </div>
                </div>))}
              {!ov?.assigned.length && <p className="muted">No active jobs — claim one from the open pool.</p>}
            </div>
            <div className="card"><h4>Open reports pool</h4>
              {(ov?.openPool || []).map((r) => (
                <div key={r.id} className="feed-row">
                  <b>{r.title}</b> <span className="badge b-amber">{r.priority}</span>
                  <div className="muted">{r.category} · {r.location} · by {r.reporter_name}</div>
                  <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => update(r.id, { status: 'assigned', assigned_to: user.id })}>Claim job</button>
                </div>))}
              {!ov?.openPool.length && <p className="muted">Pool is clear.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'inbox' && (
        <div className="card"><h4>Inbox ({ov?.unread ?? 0} unread)</h4>
          {Object.entries(byReport).map(([rid, msgs]) => (
            <div key={rid} className="thread">
              <b>{msgs[0].report_title || 'Direct message'}</b>
              {msgs.map((m) => (
                <div key={m.id} className={`msg ${m.sender_id === user.id ? 'me' : 'bot'}`}>
                  {m.body}
                  <div className="muted">{m.sender_name} · {new Date(m.created_at).toLocaleString()}</div>
                  {m.receiver_id === user.id && !m.is_read && <button className="link-btn" onClick={() => markMsgRead(m.id)}>Mark read</button>}
                </div>))}
              {rid !== 'direct' && (
                <form onSubmit={(e) => sendThreadReply(rid, msgs.find((m) => m.sender_id !== user.id)?.sender_id || msgs[0].sender_id, e)} className="thread-form">
                  <input value={reply[rid] || ''} onChange={(e) => setReply((r) => ({ ...r, [rid]: e.target.value }))} placeholder="Reply to resident…" />
                  <button className="btn btn-primary" type="submit">Send</button>
                </form>)}
            </div>))}
          {!threads.length && <p className="muted">Nothing here yet. Claimed jobs and resident replies appear here.</p>}
          <h4 style={{ marginTop: 18 }}>New direct message</h4>
          <form onSubmit={sendDirect} className="grid grid-3">
            <input placeholder="Receiver user ID" value={msg.receiver} onChange={(e) => setMsg({ ...msg, receiver: e.target.value })} required />
            <input placeholder="Report ID (optional)" value={msg.report} onChange={(e) => setMsg({ ...msg, report: e.target.value })} />
            <input placeholder="Message" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} required />
            <button className="btn btn-primary" type="submit">Send</button>
          </form>
        </div>
      )}

      {tab === 'diagnose' && (
        <div className="grid grid-2">
          <div className="card"><h4>AI diagnosis helper</h4>
            <p className="muted">Describe the fault — readings, sounds, smells, meter behaviour — and get a likely cause with tools and steps.</p>
            <form onSubmit={diagnose}>
              <label>Category</label><select value={diag.category} onChange={(e) => setDiag({ ...diag, category: e.target.value })}>
                <option value="leakage">Leakage</option><option value="burst">Burst</option><option value="shortage">Shortage</option><option value="quality">Quality</option><option value="other">Other</option>
              </select>
              <label>Site description</label><textarea rows={4} value={diag.description} onChange={(e) => setDiag({ ...diag, description: e.target.value })} required placeholder="e.g. Water gushing at the gate, meter spinning, pressure low…" />
              <button className="btn btn-primary" style={{ marginTop: 10 }} type="submit">Diagnose</button>
            </form>
          </div>
          <div className="card"><h4>Result</h4>
            {!result ? <p className="muted">Run a diagnosis to get the checklist and safety steps.</p> : (<>
              <p><b>Likely cause:</b> {result.cause}</p>
              <p><span className="badge b-amber">{result.priority}</span> {result.note}</p>
              <ul>{result.checklist?.map((c, i) => <li key={i}>{c}</li>)}</ul>
              <ol>{result.steps?.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </>)}
          </div>
        </div>
      )}

      {tab === 'devices' && (
        <div className="card"><h4>Site device health</h4>
          <table><thead><tr><th>Device</th><th>Owner</th><th>Status</th><th>Last seen</th></tr></thead><tbody>
            {(ov?.devices || []).map((d) => <tr key={d.id}><td>{d.name}<div className="muted">{d.site} ·Batt {d.battery ?? '—'}%</div></td><td>{d.owner} · {d.location}</td><td><span className="badge b-green">{d.status}</span></td><td>{new Date(d.last_seen).toLocaleString()}</td></tr>)}
          </tbody></table>
        </div>
      )}

      {tab === 'profile' && profile && (
        <div className="grid grid-2">
          <div className="card"><h4>Verification</h4>
            <p><span className="badge b-green">Verified by admin</span></p>
            <p className="muted">Your documents were reviewed and approved. All technician features are unlocked.</p>
          </div>
          <div className="card"><h4>Professional details</h4>
            <table><tbody>
              <tr><td><b>Name</b></td><td>{profile.name}</td></tr>
              <tr><td><b>Organisation</b></td><td>{profile.org_name}</td></tr>
              <tr><td><b>National ID</b></td><td>{profile.id_number || '—'}</td></tr>
              <tr><td><b>Specialization</b></td><td>{profile.specialization || '—'}</td></tr>
              <tr><td><b>Experience</b></td><td>{profile.experience_years} yrs</td></tr>
              <tr><td><b>Certifications</b></td><td>{profile.cert_details || '—'}</td></tr>
            </tbody></table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
