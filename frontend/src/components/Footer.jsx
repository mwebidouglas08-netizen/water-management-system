import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="brand"><span className="brand-mark">M</span> MajiSafe</div>
          <p>Live water monitoring for institutions and the communities around them. Watch every tank, catch every leak, and make sure the water is safe to drink.</p>
          <p className="footer-locale">Nairobi &middot; Ruiru &middot; Kisumu &middot; Mombasa</p>
        </div>
        <div>
          <h4>Platform</h4>
          <ul>
            <li><a href="#problem">The water problem</a></li>
            <li><a href="#approach">Our approach</a></li>
            <li><a href="#serve">Who we serve</a></li>
            <li><a href="#faq">Questions</a></li>
          </ul>
        </div>
        <div>
          <h4>Accounts</h4>
          <ul>
            <li><Link to="/register">Create an account</Link></li>
            <li><Link to="/login">Sign in</Link></li>
            <li><Link to="/app">Institution dashboard</Link></li>
            <li><Link to="/tech">Technician dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@majisafe.ke">hello@majisafe.ke</a></li>
            <li><a href="tel:+254700000000">+254 700 000 000</a></li>
            <li>Monday to Saturday, 8am to 6pm EAT</li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>&copy; 2026 MajiSafe. Built for Kenyan institutions, ready for the world.</span>
        <span>Every drop, accounted for.</span>
      </div>
    </footer>
  );
}
