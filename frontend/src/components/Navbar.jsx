import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const dash = user ? (user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/tech' : '/app') : '/login';
  return (
    <div className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand"><span className="brand-mark">M</span> MajiSafe</Link>
        <nav className="nav-links" aria-label="Primary">
          <a href="#problem">The problem</a>
          <a href="#approach">Our approach</a>
          <a href="#serve">Who we serve</a>
          <a href="#faq">FAQ</a>
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
      </div>
    </div>
  );
}
