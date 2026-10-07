import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?q=80&w=1400&auto=format&fit=crop',
  burst: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1200&auto=format&fit=crop',
  river: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=1200&auto=format&fit=crop',
  tech: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop',
  glass: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=1200&auto=format&fit=crop',
  wave: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?q=80&w=1200&auto=format&fit=crop'
};

const FAQS = [
  {
    q: 'Do we need sensors installed to start using MajiSafe?',
    a: 'No. Every account opens with a live simulation of tank levels, flow and water quality, so your team can learn the dashboards, practise filing reports and see how leak and shortage alerts work. When you are ready, a technician fits the sensor unit to your tank and the same dashboard switches to real readings.'
  },
  {
    q: 'How does MajiSafe catch a leak before anyone sees it?',
    a: 'The system studies flow around the clock. Water moving between midnight and 4am, when every tap should be closed, is the classic signature of a hidden leak. Flow that never pauses for six hours or more, or a sudden spike paired with a pressure drop, raises a burst alert with the exact numbers quoted, so the caretaker knows what to check.'
  },
  {
    q: 'How does the shortage warning work?',
    a: 'The dashboard converts the live tank percentage into litres, compares it with your site’s daily use, and shows days of water remaining. Below two days the alert turns urgent, which leaves time to ration sensibly and book a refill instead of waking up to dry taps.'
  },
  {
    q: 'What happens after I file a report?',
    a: 'Your report is triaged automatically by category and urgency, then appears in the technician inbox alongside direct messages from residents. You follow it from Open to Assigned to In Progress to Resolved, and the technician can message you back from the same thread.'
  },
  {
    q: 'Who is MajiSafe built for?',
    a: 'Any institution that cannot afford to run dry: schools, hospitals and clinics, residential estates, factories, and the water utilities and vendors that serve them. Residents around those institutions use the same reporting channel.'
  },
  {
    q: 'Does it work where the internet is weak?',
    a: 'Yes. The sensor unit buffers readings and retries when the connection returns, and the dashboards are deliberately light so they load on 3G phones and shared office computers.'
  }
];

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <div className="container">
          <div className="hero-new">
            <div className="hero-copy">
              <span className="eyebrow">Water monitoring for institutions and communities</span>
              <h1>Know your water <em>before</em> it runs out.</h1>
              <p className="lead">
                MajiSafe watches your tank levels, pipe flow and water quality around the
                clock. It flags leaks and shortages early, and connects residents to the
                technicians who fix them — built for schools, hospitals, estates and utilities.
              </p>
              <div className="hero-cta">
                <Link to="/register" className="btn btn-primary">Get started</Link>
                <a href="#problem" className="btn btn-ghost">Understand the problem</a>
              </div>
              <p className="hero-note">No hardware needed to explore — the demo simulates live sensor data.</p>
            </div>
            <div className="hero-media">
              <img src={IMG.hero} alt="Reservoir holding clean water at golden hour" />
              <div className="hero-caption">A full reservoir tells you nothing about the leak halfway down the hill. MajiSafe does.</div>
            </div>
          </div>

          <div className="stat-band" aria-label="Key figures">
            <div className="stat"><strong>38%</strong><span>of treated urban water never reaches a tap — it escapes through leaks and bursts.</span></div>
            <div className="stat"><strong>48 hrs</strong><span>of early warning before a monitored tank runs dry, time enough to act.</span></div>
            <div className="stat"><strong>24/7</strong><span>watch over level, flow, pressure and purity at every connected site.</span></div>
          </div>

          <section id="problem" className="section">
            <div className="section-head">
              <span className="eyebrow">The problem</span>
              <h2>Water disappears quietly. The damage does not.</h2>
              <p>Most water crises do not begin with a dramatic burst. They begin with a toilet cistern that never quite closes, a joint dripping underground, a tank nobody checked on Friday. By the time anyone notices, kitchens are closed and the repair bill has tripled.</p>
            </div>
            <div className="prob-grid">
              <article className="prob-card">
                <img src={IMG.burst} alt="Plumber repairing a leaking pipe" loading="lazy" />
                <div className="prob-body">
                  <h3>Leaks run for weeks, unseen</h3>
                  <p>Bursts flood roads while slow underground leaks quietly drain tanks and inflate bills. Reports die in chat groups and never reach the person with the wrench.</p>
                </div>
              </article>
              <article className="prob-card">
                <img src={IMG.wave} alt="Water running out over dark stone" loading="lazy" />
                <div className="prob-body">
                  <h3>Tanks empty overnight</h3>
                  <p>Schools and clinics discover at dawn that the roof tank hit zero. Kitchens close, toilets lock, and the day’s programme collapses — with no warning the evening before.</p>
                </div>
              </article>
              <article className="prob-card">
                <img src={IMG.glass} alt="Glass of clear drinking water" loading="lazy" />
                <div className="prob-body">
                  <h3>Unsafe water looks fine</h3>
                  <p>Blended borehole water can spike in dissolved solids or cloudiness after rain. Without live purity checks, children drink it for days before anyone tests a sample.</p>
                </div>
              </article>
            </div>
          </section>

          <section id="approach" className="section">
            <div className="section-head">
              <span className="eyebrow">Our approach</span>
              <h2>Sense the water. Read the signs. Send help.</h2>
              <p>One loop, running every minute: small sensors report the facts, the system interprets them in plain language, and people — residents, technicians, managers — act on them.</p>
            </div>
            <div className="steps">
              <div className="step">
                <span className="step-no">Step 01</span>
                <h3>Sense</h3>
                <p>A compact unit on each tank and line reports level, flow, pressure and quality every minute. No hardware yet? The dashboard simulates the same feed so you can start today.</p>
              </div>
              <div className="step">
                <span className="step-no">Step 02</span>
                <h3>Interpret</h3>
                <p>Night-flow analysis finds hidden leaks, spike detection catches bursts, and a 0–100 purity score grades every reading — each alert written in plain language with what to do next.</p>
              </div>
              <div className="step">
                <span className="step-no">Step 03</span>
                <h3>Resolve</h3>
                <p>Residents file geo-tagged reports in seconds. Technicians receive them in a proper inbox with a diagnosis checklist, and managers watch every ticket through to resolution.</p>
              </div>
            </div>
            <div className="split">
              <img src={IMG.tech} alt="Water technician inspecting equipment" loading="lazy" />
              <div>
                <h2>Built around the people who keep water flowing</h2>
                <ul className="check-list">
                  <li><strong>Caretakers and managers</strong> see every tank at a glance instead of climbing ladders with a dipstick.</li>
                  <li><strong>Residents and parents</strong> report a burst or dry tap once — and can see it being fixed.</li>
                  <li><strong>Technicians</strong> stop chasing rumours and start each job with readings, a likely cause and a parts list.</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="serve" className="section">
            <div className="section-head">
              <span className="eyebrow">Who we serve</span>
              <h2>One system, from a single school tank to a whole utility</h2>
            </div>
            <div className="serve-grid">
              <div className="serve-card">
                <img src={IMG.river} alt="Clean river water" loading="lazy" />
                <div><h3>Schools</h3><p>Keep kitchens and dormitories supplied, and prove water safety to parents and boards.</p></div>
              </div>
              <div className="serve-card">
                <img src={IMG.glass} alt="Safe drinking water" loading="lazy" />
                <div><h3>Hospitals and clinics</h3><p>Guarantee sterile, uninterrupted supply for wards, theatres and laboratories.</p></div>
              </div>
              <div className="serve-card">
                <img src={IMG.hero} alt="Estate water storage at sunset" loading="lazy" />
                <div><h3>Estates and apartments</h3><p>Share fairly during rationing, split bills honestly, and fix riser leaks fast.</p></div>
              </div>
              <div className="serve-card">
                <img src={IMG.tech} alt="Utility technician at work" loading="lazy" />
                <div><h3>Utilities and vendors</h3><p>Cut non-revenue water, prioritise bursts by evidence, and answer the public with data.</p></div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="split">
              <div>
                <span className="eyebrow">Inside the product</span>
                <h2>Three workspaces, one shared truth</h2>
                <p><strong>Institutions</strong> get live gauges, daily charts, purity grades and shortage forecasts. <strong>Technicians</strong> get an inbox, a diagnosis helper and a job board. <strong>Admins</strong> get oversight of users, tickets and consumption.</p>
                <p className="muted">Daggy, the built-in assistant, sits in the corner of every page and answers questions about your water and the system itself.</p>
                <div className="hero-cta">
                  <Link to="/register" className="btn btn-primary">Create an account</Link>
                  <Link to="/login" className="btn btn-ghost">Sign in</Link>
                </div>
              </div>
              <img src={IMG.river} alt="Clear water flowing over stones" loading="lazy" />
            </div>
          </section>

          <section id="faq" className="section">
            <div className="section-head">
              <span className="eyebrow">Questions</span>
              <h2>Asked by caretakers, answered plainly</h2>
            </div>
            <div className="faq">
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="cta-band">
            <h2>Bring MajiSafe to your institution.</h2>
            <p>Create an account in a minute, explore with simulated live data, and connect your first tank whenever you are ready.</p>
            <div className="row">
              <Link to="/register" className="btn btn-light">Get started</Link>
              <Link to="/login" className="btn btn-outline-light">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
