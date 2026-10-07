import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

const QUICK = [
  'How do I report a leak?',
  'What does the purity score mean?',
  'How is a burst detected?',
  'How do I become a technician?'
];

// Local brain: same coverage as the server so Daggy chats instantly
// even while the backend is waking up. Server stays the source of truth.
function localReply(raw) {
  const msg = raw.toLowerCase();
  if (/(leak|drip|loss|losing)/.test(msg))
    return 'A suspected leak means continuous or unusual flow. In your dashboard, open the insights card: night flow above 2 litres per minute (midnight to 4am), or nonstop flow for 6+ hours, points to a leak. Read your meter at 10pm and 5am with no use in between. If it moved, file a report under Leakage.';
  if (/(burst|gush|flood)/.test(msg))
    return 'A burst shows as a sudden flow spike with a pressure drop. Close the zonal valve first, photograph the site, then file a report under Burst so it is prioritised as critical. Keep clear of any flooded electrical fittings.';
  if (/(shortage|empty|dry|no water|bowser|ration|tank)/.test(msg))
    return 'Your dashboard forecasts days of water left from litres remaining divided by daily use. Under 2 days is high risk: ration kitchens and toilets first and book a refill early. When reporting, state litres left and people served.';
  if (/(purity|tds|turbid|dirty|brown|smell|quality|safe|drink|ph)/.test(msg))
    return 'The purity score blends TDS, turbidity and pH. 85+ is Excellent, 70+ Good, 50+ Fair (boil drinking water), below 50 Poor or Unsafe (filter, boil and chlorinate). Brown water after rain is usually a turbidity spike: flush the line, clean the tank and re-test in 48 hours.';
  if (/(report|ticket|complaint)/.test(msg))
    return 'To report: sign in, open your dashboard, choose New Report, pick a category and describe what you see and where. You can track it from Open to Assigned to In Progress to Resolved.';
  if (/(technician|fundi|job|fix|repair)/.test(msg))
    return 'Technicians register for a technician account, an admin approves them, and citizen reports land in their inbox with a diagnosis checklist. You can message the technician from your report thread.';
  if (/(register|sign up|account|login|password|join)/.test(msg))
    return 'Choose Get started, fill in your details and create the account. Institutions get in immediately; technician accounts wait for admin approval. Then sign in with your email and password.';
  if (/(sensor|esp32|device|install|iot|kit|hardware)/.test(msg))
    return 'Each monitored site uses a small sensor unit: tank level, flow, pressure, plus water-quality probes. It sends readings every minute. You do not need hardware to explore: the demo simulates live data until a real device is connected.';
  if (/\b(hello|hi|hey|habari|niaje|morning|afternoon|evening)\b/.test(msg))
    return 'Hello. I am Daggy, the MajiSafe assistant. Ask me about monitoring tanks, finding leaks, purity scores, filing reports, or the technician and admin dashboards.';
  if (/\b(help|tour|guide|start)\b/.test(msg) || /how (do|does|can)/.test(msg))
    return 'Here is the short tour: the home page explains the water problem, you register or sign in, the dashboard shows your live water data and reports, technicians work from their inbox, and admins oversee everything. Tell me where you are stuck.';
  if (/(who are you|daggy|your name)/.test(msg))
    return 'I am Daggy, the assistant built into MajiSafe. I know how monitoring, reports, and each dashboard work. Ask me anything about using the system.';
  if (/(thank|asante)/.test(msg)) return 'You are welcome. If a pipe bursts or a tank runs low, you know where to find me.';
  return 'I do not have that exact answer yet. I can help with leaks and bursts, shortage forecasts, purity scores, filing reports, technician work, accounts, and the sensor kit. Try: "how do I report a leak?"';
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DaggyChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: 'Hello, I am Daggy. I can walk you through monitoring your water, reporting faults, and using each dashboard. What do you need?', at: timeNow() }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy, open]);

  const send = async (preset) => {
    const q = (preset ?? input).trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { from: 'me', text: q, at: timeNow() }]);
    setInput('');
    setBusy(true);
    let reply = null;
    try {
      const { data } = await api.post('/chat', { message: q });
      if (data && data.reply) reply = data.reply;
    } catch {
      reply = null;
    }
    setMsgs((m) => [...m, { from: 'bot', text: reply || localReply(q), at: timeNow() }]);
    setBusy(false);
  };

  if (!open) {
    return (
      <button type="button" className="daggy-launcher" onClick={() => setOpen(true)} aria-label="Chat with Daggy">
        <span className="daggy-dot" />
        Chat with Daggy
      </button>
    );
  }

  return (
    <section className="daggy-panel" aria-label="Daggy chat">
      <header className="daggy-head">
        <div>
          <strong>Daggy</strong>
          <span className="daggy-sub">MajiSafe assistant &middot; replies instantly</span>
        </div>
        <button type="button" className="daggy-close" onClick={() => setOpen(false)} aria-label="Close chat">Close</button>
      </header>
      <div className="daggy-body" ref={bodyRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.from === 'bot' ? 'bot' : 'me'}`}>
            <p>{m.text}</p>
            <span className="msg-time">{m.at}</span>
          </div>
        ))}
        {busy && (
          <div className="msg bot typing"><span /><span /><span /></div>
        )}
      </div>
      <div className="daggy-quick">
        {QUICK.map((q) => (
          <button type="button" key={q} onClick={() => send(q)}>{q}</button>
        ))}
      </div>
      <form className="daggy-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          aria-label="Type your question"
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>Send</button>
      </form>
    </section>
  );
}
