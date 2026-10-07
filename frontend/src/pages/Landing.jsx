import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Reveal, CountUp } from '../components/motion';

// Real documentary photography (Pexels, free licence) from Kenya and the
// wider region — each with a fallback so an image can never break the page.
const px = (id, w = 800) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const U = (id) => `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`;

const IMG = {
  hero: px(30441497, 1600),      // African woman carrying water jugs outdoors
  leak: px(32588548),            // plumber repairing a pipe with a wrench
  dry: px(1108822),              // girl carrying a water container, Turkana Kenya at sunset
  unsafe: px(32154739),          // child drawing water from a village pump
  tech: px(6419128, 1200),       // plumber fitting pipes
  band: px(30253169, 1600),      // mother and child with water containers at home
  schools: px(30058872),         // African classroom, teacher and students
  hospitals: px(4173251),        // doctor in a clinic corridor
  estates: px(30370976),         // woman with yellow water containers at her home
  utilities: px(29069429)        // Nairobi city skyline, Kenya
};

const FALLBACK = {
  hero: U('photo-1541675154750-0444c7d51e8e'),
  leak: U('photo-1581244277943-fe4a9c777189'),
  dry: U('photo-1439405326854-014607f694d7'),
  unsafe: U('photo-1548839140-29a749e1cf4d'),
  tech: U('photo-1581092160562-40aa08e78837'),
  band: U('photo-1504893524553-b855bce32c67'),
  schools: U('photo-1504893524553-b855bce32c67'),
  hospitals: U('photo-1548839140-29a749e1cf4d'),
  estates: U('photo-1541675154750-0444c7d51e8e'),
  utilities: U('photo-1439405326854-014607f694d7')
};

// Builds <img> props with a one-time fallback swap — images never break.
function pic(key, alt, className, extra = {}) {
  return {
    src: IMG[key],
    alt,
    className,
    loading: 'lazy',
    onError: (e) => {
      const el = e.currentTarget;
      if (!el.dataset.fb) {
        el.dataset.fb = '1';
        el.src = FALLBACK[key];
      }
    },
    ...extra
  };
}

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
    a: 'The dashboard converts the live tank percentage into litres, compares it with your site\u2019s daily use, and shows days of water remaining. Below two days the alert turns urgent, which leaves time to ration sensibly and book a refill instead of waking up to dry taps.'
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

const VOICES = [
  {
    quote: 'We used to discover an empty tank at 5am, with four hundred boarders to feed. Now the warning comes two days ahead and the kitchen plan simply adjusts.',
    name: 'Beatrice W.',
    role: 'Boarding Matron, Nakuru'
  },
  {
    quote: 'A riser had been dripping inside a duct for months. The night-flow alert found it in one evening. Our quarterly bill fell by a fifth.',
    name: 'Eng. D. Otieno',
    role: 'Estate Manager, Ruaka'
  },
  {
    quote: 'When mothers ask whether the water is safe, I no longer guess. I open the purity panel and show them the score.',
    name: 'Sr. Margaret A.',
    role: 'Hospital Administrator, Kisumu'
  }
];

const BARS = [38, 52, 44, 66, 58, 74, 62, 82, 70, 88, 76, 64];

function DashboardMock() {
  return (
    <div className="mock" aria-label="Preview of the institution dashboard">
      <div className="mock-top">
        <span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" />
        <span className="mock-title">MajiSafe &middot; Main Roof Tank</span>
        <span className="mock-live">Live</span>
      </div>
      <div className="mock-grid">
        <div className="mock-gauge-card">
          <div className="mock-ring"><span>72%</span></div>
          <strong>7,200 L</strong>
          <small>2.4 days remaining</small>
        </div>
        <div className="mock-bars-card">
          <small>Flow today, litres per minute</small>
          <div className="mock-bars">
            {BARS.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
          </div>
        </div>
      </div>
      <div className="mock-row">
        <div><small>Purity score</small><strong>86 &middot; Good</strong></div>
        <div><small>Night flow</small><strong>0.4 L/min &middot; Normal</strong></div>
      </div>
      <div className="mock-alert"><strong>Heads up:</strong> Tank B drops faster than usual after 9pm — worth a look at the ball valve.</div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        {/* HERO — real photography, full-bleed background */}
        <header className="hero-bg">
          <img {...pic('hero', 'African woman carrying water containers home', 'hero-bg-img', { loading: 'eager' })} />
          <div className="hero-shade" />
          <div className="container hero-inner">
            <Reveal>
              <span className="eyebrow eyebrow-light">Water monitoring for institutions and communities</span>
              <h1>Know your water <em>before</em> it runs out.</h1>
              <p className="hero-sub">
                MajiSafe watches your tank levels, pipe flow and water quality around the
                clock. It flags leaks and shortages early, and connects residents to the
                technicians who fix them — built for schools, hospitals, estates and utilities.
              </p>
              <div className="hero-cta">
                <Link to="/register" className="btn btn-light">Get started</Link>
                <a href="#problem" className="btn btn-outline-light">Understand the problem</a>
              </div>
              <div className="hero-chips">
                <span><strong>38%</strong> of treated water lost to leaks</span>
                <span><strong>48 hrs</strong> of warning before dry tanks</span>
                <span><strong>24/7</strong> watch on every site</span>
              </div>
            </Reveal>
          </div>
          <a href="#problem" className="scroll-cue" aria-label="Scroll to content"><span /></a>
        </header>

        {/* TRUST STRIP */}
        <div className="strip">
          <div className="container strip-inner">
            <span>Built for the places that cannot run dry</span>
            <strong>Schools &middot; Hospitals &middot; Estates &middot; Utilities</strong>
          </div>
        </div>

        <div className="container">
          {/* STATS */}
          <section className="section stats-row">
            <Reveal>
              <div className="stat-card"><strong><CountUp to={38} suffix="%" /></strong><p>of treated urban water never reaches a tap. It escapes through leaks and bursts.</p></div>
            </Reveal>
            <Reveal delay={120}>
              <div className="stat-card"><strong><CountUp to={48} suffix=" hrs" /></strong><p>of early warning before a monitored tank runs dry — time enough to act.</p></div>
            </Reveal>
            <Reveal delay={240}>
              <div className="stat-card"><strong>24/7</strong><p>watch over level, flow, pressure and purity at every connected site.</p></div>
            </Reveal>
          </section>

          {/* PROBLEM */}
          <section id="problem" className="section">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">The problem</span>
                <h2>Water disappears quietly. The damage does not.</h2>
                <p>Most water crises do not begin with a dramatic burst. They begin with a cistern that never quite closes, a joint dripping underground, a tank nobody checked on Friday. By the time anyone notices, kitchens are closed and the repair bill has tripled.</p>
              </div>
            </Reveal>
            <div className="prob-grid">
              <Reveal>
                <article className="prob-card">
                  <img {...pic('leak', 'Plumber repairing a leaking pipe with a wrench')} />
                  <div className="prob-body">
                    <h3>Leaks run for weeks, unseen</h3>
                    <p>Bursts flood roads while slow underground leaks quietly drain tanks and inflate bills. Reports die in chat groups and never reach the person with the wrench.</p>
                  </div>
                </article>
              </Reveal>
              <Reveal delay={120}>
                <article className="prob-card">
                  <img {...pic('dry', 'Girl carrying a water container at sunset in Turkana, Kenya')} />
                  <div className="prob-body">
                    <h3>Tanks empty overnight</h3>
                    <p>Schools and clinics discover at dawn that the roof tank hit zero. Kitchens close, toilets lock, and the day&rsquo;s programme collapses — with no warning the evening before.</p>
                  </div>
                </article>
              </Reveal>
              <Reveal delay={240}>
                <article className="prob-card">
                  <img {...pic('unsafe', 'Child drawing water from a village hand pump')} />
                  <div className="prob-body">
                    <h3>Unsafe water looks fine</h3>
                    <p>Blended borehole water can spike in dissolved solids or cloudiness after rain. Without live purity checks, children drink it for days before anyone tests a sample.</p>
                  </div>
                </article>
              </Reveal>
            </div>
          </section>

          {/* APPROACH */}
          <section id="approach" className="section">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">Our approach</span>
                <h2>Sense the water. Read the signs. Send help.</h2>
                <p>One loop, running every minute: small sensors report the facts, the system interprets them in plain language, and people — residents, technicians, managers — act on them.</p>
              </div>
            </Reveal>
            <div className="steps">
              <Reveal>
                <div className="step"><span className="step-no">Step 01</span><h3>Sense</h3><p>A compact unit on each tank and line reports level, flow, pressure and quality every minute. No hardware yet? The dashboard simulates the same feed so you can start today.</p></div>
              </Reveal>
              <Reveal delay={120}>
                <div className="step"><span className="step-no">Step 02</span><h3>Interpret</h3><p>Night-flow analysis finds hidden leaks, spike detection catches bursts, and a 0–100 purity score grades every reading — each alert written in plain language with what to do next.</p></div>
              </Reveal>
              <Reveal delay={240}>
                <div className="step"><span className="step-no">Step 03</span><h3>Resolve</h3><p>Residents file geo-tagged reports in seconds. Technicians receive them in a proper inbox with a diagnosis checklist, and managers watch every ticket through to resolution.</p></div>
              </Reveal>
            </div>
            <div className="split">
              <Reveal>
                <img {...pic('tech', 'Technician fitting water pipes')} />
              </Reveal>
              <Reveal delay={120}>
                <div>
                  <h2>Built around the people who keep water flowing</h2>
                  <ul className="check-list">
                    <li><strong>Caretakers and managers</strong> see every tank at a glance instead of climbing ladders with a dipstick.</li>
                    <li><strong>Residents and parents</strong> report a burst or dry tap once — and can watch it being fixed.</li>
                    <li><strong>Technicians</strong> stop chasing rumours and start each job with readings, a likely cause and a parts list.</li>
                  </ul>
                </div>
              </Reveal>
            </div>
          </section>

          {/* LIVE PREVIEW */}
          <section className="section">
            <div className="split split-reverse">
              <Reveal>
                <div>
                  <span className="eyebrow">Inside the product</span>
                  <h2>Your whole site, on one screen</h2>
                  <p>Live gauges replace the ladder and dipstick. Daily charts show exactly when water goes missing. Every anomaly arrives as a plain-language alert, and every report becomes a trackable ticket.</p>
                  <ul className="check-list">
                    <li><strong>Live levels and flow</strong> for every tank and line, refreshed each minute.</li>
                    <li><strong>Shortage forecasts</strong> in days remaining, not percentages to decode.</li>
                    <li><strong>Purity grades</strong> with the exact reading behind each score.</li>
                  </ul>
                  <div className="hero-cta">
                    <Link to="/register" className="btn btn-primary">Create an account</Link>
                    <Link to="/login" className="btn btn-ghost">Sign in</Link>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={150}>
                <DashboardMock />
              </Reveal>
            </div>
          </section>
        </div>

        {/* FULL-BLEED BACKGROUND BAND */}
        <section className="band-bg">
          <img {...pic('band', 'Mother and child with household water containers', 'band-bg-img')} />
          <div className="band-shade" />
          <div className="container band-inner">
            <Reveal>
              <h2>&ldquo;You cannot manage what you cannot see. We make every litre visible.&rdquo;</h2>
              <p>The MajiSafe field principle — from the first school tank to the whole network.</p>
              <Link to="/register" className="btn btn-light">Start with your site</Link>
            </Reveal>
          </div>
        </section>

        <div className="container">
          {/* WHO WE SERVE */}
          <section id="serve" className="section">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">Who we serve</span>
                <h2>One system, from a single school tank to a whole utility</h2>
              </div>
            </Reveal>
            <div className="serve-grid">
              <Reveal>
                <div className="serve-card">
                  <img {...pic('schools', 'Teacher with students in an African classroom')} />
                  <div><h3>Schools</h3><p>Keep kitchens and dormitories supplied, and prove water safety to parents and boards.</p></div>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="serve-card">
                  <img {...pic('hospitals', 'Doctor standing in a clinic corridor')} />
                  <div><h3>Hospitals and clinics</h3><p>Guarantee sterile, uninterrupted supply for wards, theatres and laboratories.</p></div>
                </div>
              </Reveal>
              <Reveal delay={200}>
                <div className="serve-card">
                  <img {...pic('estates', 'Woman with household water containers at home')} />
                  <div><h3>Estates and apartments</h3><p>Share fairly during rationing, split bills honestly, and fix riser leaks fast.</p></div>
                </div>
              </Reveal>
              <Reveal delay={300}>
                <div className="serve-card">
                  <img {...pic('utilities', 'Nairobi city skyline, Kenya')} />
                  <div><h3>Utilities and vendors</h3><p>Cut non-revenue water, prioritise bursts by evidence, and answer the public with data.</p></div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* VOICES */}
          <section className="section">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">Field notes</span>
                <h2>What early users tell us</h2>
              </div>
            </Reveal>
            <div className="voices">
              {VOICES.map((v, i) => (
                <Reveal key={v.name} delay={i * 120}>
                  <figure className="voice-card">
                    <blockquote>{v.quote}</blockquote>
                    <figcaption>
                      <span className="avatar">{v.name.charAt(0)}</span>
                      <span><strong>{v.name}</strong><small>{v.role}</small></span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>

          {/* GETTING STARTED */}
          <section className="section">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">Getting started</span>
                <h2>Monitoring your site in three sittings</h2>
              </div>
            </Reveal>
            <ol className="get-steps">
              <Reveal><li><strong>Create your account</strong><p>Register as an institution or resident. Technicians apply separately for admin approval.</p></li></Reveal>
              <Reveal delay={120}><li><strong>Add your site</strong><p>Name the tank, set its capacity, and watch simulated live data while hardware is arranged.</p></li></Reveal>
              <Reveal delay={240}><li><strong>Act on the alerts</strong><p>Follow shortage forecasts, file reports in seconds, and track each fix to done.</p></li></Reveal>
            </ol>
          </section>

          {/* FAQ */}
          <section id="faq" className="section">
            <Reveal>
              <div className="section-head">
                <span className="eyebrow">Questions</span>
                <h2>Asked by caretakers, answered plainly</h2>
              </div>
            </Reveal>
            <div className="faq">
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <Reveal>
            <div className="cta-band">
              <h2>Bring MajiSafe to your institution.</h2>
              <p>Create an account in a minute, explore with simulated live data, and connect your first tank whenever you are ready.</p>
              <div className="row">
                <Link to="/register" className="btn btn-light">Get started</Link>
                <Link to="/login" className="btn btn-outline-light">Sign in</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
