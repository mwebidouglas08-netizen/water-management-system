import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#approach', label: 'Our approach' },
  { href: '#serve', label: 'Who we serve' },
  { href: '#faq', label: 'FAQ' }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dash = user ? (user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/tech' : '/app') : '/login';

  return (
    <div className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">M</span> MajiSafe
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <div className="nav-actions">
          {!user ? (<>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/register" className="btn btn-primary">Get started</Link>
          </>) : (<>
            <Link to={dash} className="btn btn-ghost">Dashboard</Link>
            <button type="button" className="btn btn-ghost" onClick={logout}>Sign out</button>
          </>)}
        </div>
        <button
          type="button"
          className={`menu-btn${open ? ' open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <nav className="mobile-menu" aria-label="Mobile">
          {LINKS.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
          <div className="mobile-actions">
            {!user ? (<>
              <Link to="/login" className="btn btn-ghost" onClick={() => setOpen(false)}>Sign in</Link>
              <Link to="/register" className="btn btn-primary" onClick={() => setOpen(false)}>Get started</Link>
            </>) : (
              <Link to={dash} className="btn btn-primary" onClick={() => setOpen(false)}>Dashboard</Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
