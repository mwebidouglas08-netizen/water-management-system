import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const dash = user ? (user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/tech' : '/app') : '/login';
  return (
    <div className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand"><span className="brand-drop">💧</span> MajiSafe</Link>
        <div className="nav-links">
          <a href="/#problem">Problem</a>
          <a href="/#how">How it works</a>
          <a href="/#kit">IoT Kit</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!user ? (<>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/register" className="btn btn-primary">Get started</Link>
          </>) : (<>
            <Link to={dash} className="btn btn-ghost">Dashboard</Link>
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          </>)}
        </div>
      </div>
    </div>
  );
}
