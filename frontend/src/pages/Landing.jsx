import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?q=80&w=1200&auto=format&fit=crop', // dam water
  leak: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1200&auto=format&fit=crop', // pipe/leak
  tank: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=1200&auto=format&fit=crop', // river/clean water
  school: 'https://images.unsplash.com/photo-1497375638960-ca368c7231e4?q=80&w=1200&auto=format&fit=crop', // school kids? fallback water
  tech: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop', // technician
  pure: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=1200&auto=format&fit=crop', // clean glass
};

export default function Landing() {
  return (
    <>
      <Navbar />
      <div className="container">
        <div className="hero">
          <div>
            <span className="pill">🇰🇪 BUILT FOR INSTITUTIONS • SCHOOLS • ESTATES • HOSPITALS</span>
            <h1>Stop losing water.<br />See every litre, <span style={{ color: '#1591e6' }}>live.</span></h1>
            <p>MajiSafe pairs low-cost IoT sensors with AI to catch leaks, predict shortages, score purity — and routes citizen reports straight to technicians. From a single school tank to a whole utility.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <Link to="/register" className="btn btn-primary">Start monitoring free</Link>
              <a href="#how" className="btn btn-ghost">See how it works</a>
            </div>
            <div className="grid grid-3" style={{ marginTop: 22 }}>
              <div className="card"><div className="kpi">38%</div><div className="muted">water lost as NRW in cities — we cut it to &lt;12%</div></div>
              <div className="card"><div className="kpi">48h</div><div className="muted">early shortage warning before tanks run dry</div></div>
              <div className="card"><div className="kpi">24/7</div><div className="muted">live level • flow • TDS • turbidity • pH</div></div>
            </div>
          </div>
          <img className="hero-img" src={IMG.hero} alt="Water dam HD" />
        </div>

        <div id="problem" className="split">
          <img src={IMG.leak} alt="Leaking pipe" />
          <div>
            <span className="pill">THE PROBLEM</span>
            <h2 className="section-title">Leaks run for weeks. Tanks empty overnight. No one knows.</h2>
            <ul>
              <li>🚰 Burst pipes flood roads while reports die in WhatsApp groups.</li>
              <li>🏫 Schools close kitchens when roof tanks hit 0% without warning.</li>
              <li>🦠 Borehole blending spikes TDS/turbidity — kids drink it unseen.</li>
              <li>🧾 High bills from hidden cistern + underground leaks.</li>
            </ul>
            <p className="muted">MajiSafe closes the loop: <b>Sense → AI-diagnose → Alert → Report → Fix → Verify.</b></p>
          </div>
        </div>

        <div id="how" className="card" style={{ padding: 28 }}>
          <span className="pill">HOW IT WORKS</span>
          <h2 className="section-title">IoT → AI → Action in 60 seconds</h2>
          <div className="grid grid-3">
            <div className="card"><h3>1️⃣ Sense</h3><p>ESP32 + level, flow, pressure, TDS, turbidity & pH sensors post every 60s. <code>POST /api/ingest/DEVICE_KEY</code>. No hardware? Simulator keeps demo live.</p></div>
            <div className="card"><h3>2️⃣ AI detects</h3><p>Night-flow leak logic, burst spike + pressure-drop, purity scoring (WHO-ish), days-to-empty forecast. Every alert ships with plain-language advice.</p></div>
            <div className="card"><h3>3️⃣ Humans fix</h3><p>Citizens file geo-tagged reports → technician inbox → AI checklist → job resolved. Admin sees NRW, SLA, consumption.</p></div>
          </div>
        </div>

        <div className="split">
          <div>
            <span className="pill">LIVE DEMO PREVIEW</span>
            <h2 className="section-title">Three dashboards, one truth</h2>
            <p><b>👨‍👩‍👧 User/Institution:</b> gauges, 24h charts, purity grade, AI insights, alerts, reports with status timeline, device keys.</p>
            <p><b>🔧 Technician:</b> KPIs, inbox (reports + DMs), AI Diagnose helper, jobs board, device health.</p>
            <p><b>🛡️ Admin:</b> users + technician approvals, triage + assign, analytics, broadcasts.</p>
            <Link to="/register" className="btn btn-primary">Try demo accounts</Link>
            <p className="muted">admin@majisafe.ke / tech@majisafe.ke / school@majisafe.ke</p>
          </div>
          <img src={IMG.tank} alt="Water tanks" />
        </div>

        <div id="kit" className="split">
          <img src={IMG.tech} alt="Technician at work" />
          <div>
            <span className="pill">IOT KIT • KES 12–18K PER SITE</span>
            <h2 className="section-title">Off-the-shelf parts, 1-day install</h2>
            <ul>
              <li>ESP32 DevKit + ultrasonic JSN-SR04T (tank %)</li>
              <li>YF-S201 flow + pressure transducer</li>
              <li>TDS + turbidity + pH probes (purity score)</li>
              <li>Solar trickle + battery readout</li>
            </ul>
            <p className="muted">Full wiring + Arduino sketch: <code>docs/IOT_GUIDE.md</code></p>
          </div>
        </div>

        <div className="split">
          <div>
            <span className="pill">PURITY YOU CAN TRUST</span>
            <h2 className="section-title">Know if it's safe to drink — live</h2>
            <p>Score 0–100 from TDS, turbidity, pH. <b>85+ Excellent, 70+ Good, 50+ Fair (boil), &lt;50 Poor/Unsafe.</b> Daggy explains every dip and what to do in Swahili too.</p>
          </div>
          <img src={IMG.pure} alt="Clean drinking water" />
        </div>

        <div id="pricing" className="grid grid-3" style={{ padding: '20px 0' }}>
          <div className="card"><h3>Starter</h3><div className="kpi">Free</div><p>1 site • 1 device • simulator • community reports. Perfect for pilot schools.</p><Link to="/register" className="btn btn-ghost">Start free</Link></div>
          <div className="card" style={{ border: '2px solid #1591e6' }}><h3>Institution ⭐</h3><div className="kpi">KES 2,500/mo</div><p>5 sites • AI leak + purity • SMS alerts • technician dispatch • analytics.</p><Link to="/register" className="btn btn-primary">Choose Institution</Link></div>
          <div className="card"><h3>Utility</h3><div className="kpi">Custom</div><p>Unlimited sites • NRW maps • MPesa + GIS v2 • SLA support.</p><a href="mailto:hello@majisafe.ke" className="btn btn-ghost">Talk to us</a></div>
        </div>

        <div id="faq" className="card">
          <h2 className="section-title">FAQ</h2>
          <p><b>Do I need sensors to try?</b> No — demo auto-simulates live readings. Add hardware later with the same device key.</p>
          <p><b>How are leaks found?</b> Night flow {'>'}2 L/min, 6h nonstop flow, or burst spike + pressure drop. AI cites the exact numbers.</p>
          <p><b>Who sees my report?</b> Nearby technicians + admin. You track Open → Assigned → Resolved and can message them.</p>
          <p><b>Can it work upcountry with weak internet?</b> Yes — ESP32 buffers and retries; dashboard is 3G-light.</p>
        </div>

        <div className="card" style={{ margin: '26px 0', textAlign: 'center', background: 'linear-gradient(135deg,#062b4d,#0b5fa5)', color: '#fff', border: 0 }}>
          <h2>Ready to save 30% of your water?</h2>
          <p>Join Greenhill-style pilots across Kiambu & Nairobi.</p>
          <Link to="/register" className="btn" style={{ background: '#fff', color: '#062b4d' }}>Create free account →</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
