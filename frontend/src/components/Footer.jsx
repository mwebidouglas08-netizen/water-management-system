export default function Footer() {
  return (
    <div className="footer">
      <div className="container grid grid-3">
        <div>
          <h3 style={{ color: '#fff' }}>💧 MajiSafe</h3>
          <p>IoT + AI water management for institutions and communities. Stop leaks, avoid shortages, drink safe water.</p>
          <p className="muted">Nairobi • Ruiru • Kisumu • Mombasa</p>
        </div>
        <div>
          <h4 style={{ color: '#fff' }}>Product</h4>
          <p><a href="/#how">How it works</a><br /><a href="/#kit">IoT kit</a><br /><a href="/register">Create account</a></p>
        </div>
        <div>
          <h4 style={{ color: '#fff' }}>Contact</h4>
          <p>hello@majisafe.ke<br />+254 700 000 000<br />Mon–Sat 8am–6pm EAT</p>
        </div>
      </div>
      <div className="container"><p className="muted">© 2026 MajiSafe founding team. Built for Kenyan institutions, ready for the world.</p></div>
    </div>
  );
}
