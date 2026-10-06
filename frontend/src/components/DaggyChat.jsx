import { useState } from 'react';
import api from '../api/client';

const QUICK = ['How do I report a leak?', 'What does purity score mean?', 'How is a burst detected?', 'How do technicians get my report?', 'What IoT kit do I need?'];

export default function DaggyChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: 'bot', text: `Habari! I'm Daggy 🐶 — your MajiSafe water watchdog. Ask me about leaks, purity, shortages, reports, dashboards, or IoT.` }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setMsgs(m => [...m, { from: 'me', text: q }]);
    setInput(''); setBusy(true);
    try {
      const { data } = await api.post('/chat', { message: q });
      setMsgs(m => [...m, { from: 'bot', text: data.reply }]);
    } catch {
      // offline fallback mirror
      setMsgs(m => [...m, { from: 'bot', text: 'Woof — backend unreachable, but I can still guide: check User dashboard AI insights, file Reports for bursts, and ask a technician via inbox.' }]);
    }
    setBusy(false);
  };

  if (!open) return <button className="daggy-fab" onClick={() => setOpen(true)} title="Chat with Daggy">🐶</button>;
  return (
    <div className="daggy-panel">
      <div className="daggy-head">🐶 Daggy — MajiSafe Assistant <button style={{ float: 'right', background: 'transparent', border: 0, color: '#fff', cursor: 'pointer' }} onClick={() => setOpen(false)}>✕</button></div>
      <div className="daggy-body">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.from === 'bot' ? 'bot' : 'me'}`}>{m.text}</div>)}
        {busy && <div className="msg bot">Daggy is sniffing…</div>}
      </div>
      <div style={{ padding: '0 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK.map(q => <button key={q} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => send(q)}>{q}</button>)}
      </div>
      <div className="daggy-input">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Daggy anything…" onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="btn btn-primary" onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}
