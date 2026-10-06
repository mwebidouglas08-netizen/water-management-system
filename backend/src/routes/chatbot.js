const express = require('express');
const router = express.Router();

// POST /api/chat { message } — Daggy rule-based brain (works offline, no API key needed)
const RULES = [
  { k: ['leak', 'leakage', 'drip', 'loss', 'non-revenue', 'nrw'], a: `A suspected leak means continuous/unusual flow. In the User dashboard check the AI Insight card: night-flow above 2 L/min (00–04h) or 6h+ nonstop flow = leak. Walk the line (meter → toilets → roof tank → joints), read the meter at 10pm vs 5am, then file a Report → category Leakage. Daggy tip (EN/SW): "Zima maji usiku, soma mita — ikisonga bila matumizi, kuna mvujo."` },
  { k: ['burst', 'gush', 'flood', 'pipe burst'], a: `Burst = flow spike >3x median + pressure drop. Action NOW: 1) Close zonal valve 2) Photo + location 3) Report → category Burst (priority Critical auto) 4) Technician brings cutter + couplings. Do not touch live wires in flooded areas.` },
  { k: ['shortage', 'empty', 'tank', 'dry', 'bowser', 'ration'], a: `Shortage forecast = litres ÷ daily use. Under 2 days = high risk. Ration kitchens/toilets first, schedule refill/bowser early (prices spike when everyone orders late). In Reports choose Shortage and state litres left + people served.` },
  { k: ['purity', 'tds', 'turbid', 'dirty', 'brown', 'smell', 'ph', 'quality', 'safe', 'drink'], a: `Purity score blends TDS, turbidity, pH. 85+ Excellent, 70+ Good, 50+ Fair (boil), below 50 Poor/Unsafe (filter+boil+chlorinate, don't drink). Brown after rain = turbidity spike: flush + clean tank, re-test in 48h. File category Quality if score <50 for 2+ readings.` },
  { k: ['technician', 'inbox', 'job', 'assign'], a: `Technicians: open Tech dashboard → Inbox for citizen reports + direct messages. Use AI Diagnose: paste description (+ readings) to get likely cause, confidence, tools + step checklist. Update status assigned → in_progress → resolved so the reporter sees progress.` },
  { k: ['admin', 'approve', 'onboard', 'suspend'], a: `Admins: Admin dashboard → Users to approve pending technicians, suspend abusers, onboard institutions (Add user). Reports tab to triage + assign to a technician. Overview shows NRW proxy, resolution counts, 14-day consumption.` },
  { k: ['device', 'sensor', 'esp32', 'install', 'iot', 'hardware', 'kit'], a: `IoT kit per site: ESP32 (~KSh 1,800) + ultrasonic level (tank %) + YF-S201 flow + TDS + turbidity + pH probe + 5V supply. Posts JSON every 60s to POST /api/ingest/DEVICE_KEY. Full wiring + Arduino code: docs/IOT_GUIDE.md. No hardware? Demo auto-simulates live data.` },
  { k: ['register', 'sign up', 'account', 'login', 'password'], a: `Register as Institution/User instantly. Choose Technician only if you fix water systems — admin must approve you first (pending status). Login with email + password; JWT lasts 7 days. Forgot flow in v2 — ask admin to reset for now.` },
  { k: ['report', 'how to report', 'ticket'], a: `To report: User dashboard → New Report → category (Leakage/Shortage/Quality/Burst) + title + photo note + location pin. AI auto-triages priority. Track status Open → Assigned → In Progress → Resolved. Reply in the thread if technician messages you.` },
  { k: ['price', 'cost', 'pricing', 'pay'], a: `Starter (1 site, 1 device) free for pilot schools; Institution KES 2,500/mo up to 5 sites; Utility custom. Hardware ~KES 12–18k per site one-off. This demo runs fully without paying.` },
  { k: ['swahili', 'kiswahili'], a: `Ninaongea Kiswahili pia! MajiSafe inafuatilia mita za maji moja kwa moja: kiwango cha tanki, mtiririko, ubora (TDS/turbidity/pH), na kugundua uvujaji na uhaba kabla haujaumiza. Uliza chochote kuhusu ripoti, fundi, au admin.` },
  { k: ['who are you', 'daggy', 'your name'], a: `I'm Daggy 🐶 — MajiSafe's water watchdog! I know every page of this app: landing, auth, user/tech/admin dashboards, IoT, AI leak + purity, reports, and deployment. Ask me "how do I...", "what does X mean", or paste a reading and I'll explain.` },
  { k: ['hello', 'hi', 'hey', 'habari', 'niaje'], a: `Habari! I'm Daggy. Ask me about monitoring tanks, finding leaks, purity scores, reporting bursts, technician jobs, or admin approvals — or type "help" for a tour.` },
  { k: ['help', 'tour', 'start', 'how'], a: `Quick tour: 1) Landing explains the crisis + solution 2) Register/Login 3) User dashboard = live gauges + charts + AI insights + reports 4) Tech dashboard = inbox + AI diagnose + jobs 5) Admin = users + triage + analytics. Tell me where you are stuck and I'll walk you through.` },
];

router.post('/', (req, res) => {
  const msg = (req.body.message || '').toLowerCase();
  if (!msg) return res.json({ reply: 'Woof! Ask me anything about MajiSafe.' });
  for (const r of RULES) {
    if (r.k.some(k => msg.includes(k))) return res.json({ reply: r.a, source: 'daggy-rules-v1' });
  }
  // numeric reading paste? e.g. "tds 800 turbidity 6 ph 9"
  if (/\b(tds|turb|ph|flow|level)\b/.test(msg)) {
    return res.json({ reply: `Paste values like "TDS 450, turbidity 2.1, pH 7.2, flow 8, level 34%" and I'll interpret. Rough guide: TDS<600 good, turbidity<5 good, pH 6.5–8.5 good, night flow should be ~0, level <20% = refill soon.` });
  }
  res.json({ reply: `Good question! I don't have that exact answer yet, but here's how I can help: leaks/bursts, shortage forecasts, purity scores, filing reports, technician inbox + AI diagnose, admin approvals, IoT kit wiring, or deployment (Vercel/Render). Try: "how do I report a leak?"` });
});

module.exports = router;
