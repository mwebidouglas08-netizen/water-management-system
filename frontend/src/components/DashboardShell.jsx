import { useState } from 'react';
import { Link } from 'react-router-dom';

// Shared shell for all dashboards: sidebar nav (desktop), topbar with menu
// button + slide-in drawer (mobile), verification badge, sign-out.
export default function DashboardShell({ brand, org, items, active, onNav, onLogout, badge, children }) {
  const [drawer, setDrawer] = useState(false);
  const go = (key) => { setDrawer(false); onNav(key); };

  const nav = (mobile) => (
    <>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`dash-item${active === it.key ? ' active' : ''}`}
          onClick={() => go(it.key)}
        >
          <span className="dash-ico" aria-hidden="true">{it.icon}</span> {it.label}
          {it.count > 0 && <span className="dash-count">{it.count}</span>}
        </button>
      ))}
      <button type="button" className="dash-item" onClick={onLogout}>
        <span className="dash-ico" aria-hidden="true">◂</span> Sign out
      </button>
      {!mobile && <div className="dash-side-foot">Every drop, accounted for.</div>}
    </>
  );

  return (
    <div className="dash">
      <aside className="dash-side">
        <Link to="/" className="brand"><span className="brand-mark">M</span> MajiSafe</Link>
        <p className="dash-org">{org}</p>
        {badge}
        <nav className="dash-nav">{nav(false)}</nav>
      </aside>
      <div className="dash-body">
        <div className="dash-top">
          <button type="button" className="menu-btn dash-menu" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <span /><span /><span />
          </button>
          <strong className="dash-title">{brand}</strong>
          <span className="dash-top-right">{badge}</span>
        </div>
        {drawer && (
          <div className="drawer-wrap" onClick={() => setDrawer(false)}>
            <div className="drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head">
                <span className="brand"><span className="brand-mark">M</span> MajiSafe</span>
                <button type="button" className="daggy-close" onClick={() => setDrawer(false)}>Close</button>
              </div>
              <nav className="dash-nav">{nav(true)}</nav>
            </div>
          </div>
        )}
        <main className="dash-main">{children}</main>
      </div>
    </div>
  );
}
