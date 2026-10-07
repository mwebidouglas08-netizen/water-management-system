const express = require('express');
const router = express.Router();

// POST /api/chat { message } — Daggy rule-based brain (works offline, no API key needed)
const RULES = [
  { k: ['leak', 'drip', 'non-revenue', 'nrw', 'water loss', 'losing water'], a: `A suspected leak means continuous or unusual flow. In the user dashboard, check the insights card: night flow above 2 L/min (00-04h) or nonstop flow for 6+ hours points to a leak. Walk the line from meter to toilets to roof tank to joints, compare the meter at 10pm and 5am, then file a report under Leakage.` },
  { k: ['burst', 'gush', 'flood', 'pipe burst'], a: `A burst shows as a flow spike above 3x the median together with a pressure drop. Act now: 1) Close the zonal valve 2) Photograph the site and note the location 3) File a report under Burst (priority becomes Critical automatically) 4) The technician should bring a cutter, couplings and a pressure gauge. Keep clear of flooded electrical fittings.` },
  { k: ['shortage', 'empty', 'tank', 'dry', 'bowser', 'ration', 'no water'], a: `The shortage forecast is litres remaining divided by daily use. Under 2 days is high risk. Ration kitchens and toilets first and schedule a refill or bowser early. When reporting a shortage, state litres left and people served.` },
  { k: ['purity', 'tds', 'turbid', 'dirty', 'brown', 'smell', 'ph', 'quality', 'safe', 'drink'], a: `The purity score blends TDS, turbidity and pH. 85+ Excellent, 70+ Good, 50+ Fair (boil drinking water), below 50 Poor or Unsafe (filter, boil and chlorinate; do not drink). Brown water after rain is usually a turbidity spike: flush the line, clean the tank and re-test in 48 hours.` },
  { k: ['technician', 'inbox', 'job', 'assign'], a: `Technicians: open the technician dashboard inbox for citizen reports and direct messages. Use the Diagnose helper: paste the description with readings to get the likely cause plus a tools and steps checklist. Update each job from assigned to in progress to resolved so the reporter sees progress.` },
  { k: ['admin', 'approve', 'onboard', 'suspend'], a: `Admins: use the admin dashboard Users section to approve pending technicians, suspend accounts and onboard institutions. The Reports section triages and assigns tickets. The overview shows resolution counts and 14-day consumption.` },
  { k: ['device', 'sensor', 'esp32', 'install', 'iot', 'hardware', 'kit'], a: `Each site uses an ESP32 with an ultrasonic level sensor (tank percent), a flow sensor, a pressure transducer, and TDS, turbidity and pH probes. It posts JSON every 60 seconds to POST /api/ingest/DEVICE_KEY. Full wiring and the Arduino sketch are in docs/IOT_GUIDE.md. Without hardware, the demo simulates live data automatically.` },
  { k: ['register', 'sign up', 'account', 'login', 'password'], a: `Register as an institution or user for instant access. Choose Technician only if you repair water systems; an admin must approve you first. Sign in with email and password; sessions last 7 days.` },
  { k: ['report', 'ticket', 'complaint'], a: `To report: user dashboard, New Report, pick a category (Leakage, Shortage, Quality, Burst), add a title, description and location. The system sets the priority automatically. Track it from Open to Assigned to In Progress to Resolved.` },
  { k: ['price', 'cost', 'pricing', 'pay', 'pilot', 'partner'], a: `MajiSafe is currently onboarding pilot institutions directly. Create an account or contact the team through the details in the footer to arrange a site visit.` },
  { k: ['swahili', 'kiswahili'], a: `Ninaongea Kiswahili pia. MajiSafe inafuatilia kiwango cha tanki, mtiririko wa maji na ubora wake moja kwa moja, na kutahadharisha mapema kuhusu uvujaji na uhaba. Uliza chochote kuhusu ripoti, mafundi au usimamizi.` },
  { k: ['who are you', 'daggy', 'your name'], a: `I am Daggy, the MajiSafe assistant. I can guide you through monitoring tanks, finding leaks, reading purity scores, filing reports, technician jobs and admin approvals. Ask me "how do I..." or paste a reading and I will explain it.` },
];

const GREETING = /\b(hello|hi|hey|habari|niaje|good morning|good afternoon|good evening)\b/;
const HELP = /\b(help|tour|guide|how (do|does|can|to)|where (do|is)|what (is|does))\b/;

function greetingReply() {
  return `Hello. I am Daggy, the MajiSafe assistant. Ask me about monitoring tanks, finding leaks, purity scores, reporting bursts, technician jobs or admin approvals, or type "help" for a tour.`;
}

function helpReply() {
  return `Quick tour: 1) The home page explains the water problem and the approach 2) Register or sign in 3) The user dashboard shows live gauges, charts, insights and reports 4) The technician dashboard holds the inbox, diagnosis helper and jobs 5) The admin dashboard covers users, ticket assignment and analytics. Tell me where you are stuck and I will walk you through it.`;
}

router.post('/', (req, res) => {
  const msg = (req.body.message || '').toLowerCase().trim();
  if (!msg) return res.json({ reply: 'Hello. Ask me anything about MajiSafe and I will point you in the right direction.' });
  for (const r of RULES) {
    if (r.k.some((k) => msg.includes(k))) return res.json({ reply: r.a, source: 'daggy-rules-v2' });
  }
  if (/\b(tds|turb|ph|flow|level)\b/.test(msg)) {
    return res.json({ reply: `Paste values like "TDS 450, turbidity 2.1, pH 7.2, flow 8, level 34%" and I will interpret them. Rough guide: TDS under 600 is good, turbidity under 5 is good, pH between 6.5 and 8.5 is good, night flow should sit near zero, and level under 20 percent means refill soon.` });
  }
  if (GREETING.test(msg)) return res.json({ reply: greetingReply(), source: 'daggy-rules-v2' });
  if (HELP.test(msg)) return res.json({ reply: helpReply(), source: 'daggy-rules-v2' });
  res.json({ reply: `I do not have that exact answer yet, but I can help with leaks and bursts, shortage forecasts, purity scores, filing reports, the technician inbox, admin approvals and the IoT kit. Try: "how do I report a leak?"` });
});

module.exports = router;
