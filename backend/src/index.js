require('dotenv').config();
require('express-async-errors'); // forward async handler rejections to the error middleware
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Last-resort safety net: a single failed query must never take the whole
// API down (Express 4 does not catch async handler rejections by itself).
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err && err.message));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err && err.message));

const app = express();
const PORT = process.env.PORT || 5000;

const configuredOrigins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
// Reflect the request origin when no allowlist is configured (dev / first deploy),
// otherwise enforce the allowlist. Never send '*' together with credentials.
app.use(cors({ origin: configuredOrigins.length ? configuredOrigins : true, credentials: true }));
app.use(express.json({ limit: '5mb' })); // room for KYC document uploads (images/PDFs as data URLs)
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ name: 'MajiSafe API', version: '1.0.0', docs: '/api/health' }));
// Health check must succeed even without DB so Render can pass deploy checks.
// DB status is reported explicitly instead of crashing the process.
app.get('/api/health', async (req, res) => {
  const { checkDb, isDbConfigured, tablesReady } = require('./db');
  const { migrateStatus } = require('./migrate');
  const db = await checkDb();
  res.json({ ok: true, time: new Date().toISOString(), dbConfigured: isDbConfigured, dbOk: db.ok, dbError: db.error || null, tables: await tablesReady(), migrate: migrateStatus() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tech', require('./routes/technicians'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chatbot'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// Friendly 503 when DB is not linked yet (instead of raw ECONNREFUSED stack).
// eslint-disable-next-line
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'NO_DATABASE_URL') return res.status(503).json({ error: err.message });
  if (err.code === 'ECONNREFUSED') return res.status(503).json({ error: 'Cannot reach Postgres. Check DATABASE_URL (Render → Environment → link majisafe-db) and redeploy.' });
  if (err.code && /^(42|53|08|57)/.test(err.code))
    return res.status(503).json({ error: 'Database temporarily unavailable. Try again in a moment.' });
  res.status(500).json({ error: 'Server error' });
});

const HOST = '0.0.0.0';

// Creates the first admin on boot when none exists, so /admin is reachable
// without manual SQL. Uses ADMIN_EMAIL/ADMIN_PASSWORD when set, otherwise
// the documented demo credentials (change right after first sign-in).
async function ensureAdmin() {
  const { pool, isDbConfigured } = require('./db');
  if (!isDbConfigured || !pool) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@majisafe.ke').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const usingDefaults = !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD;
  try {
    const existing = await pool.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
    if (existing.rows.length) return;
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users(name,email,password_hash,role,org_name,status)
       VALUES('System Admin',$1,$2,'admin','MajiSafe HQ','active')
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', status='active'`,
      [email, hash]
    );
    console.log(`[boot] admin account ready for ${email}${usingDefaults ? ' (DEFAULT credentials — change after first sign-in)' : ''}`);
  } catch (e) {
    console.error('[boot] ensureAdmin failed:', e.message);
  }
}

// Listen immediately so health checks pass, then keep ensuring tables in the
// background (free-tier Postgres is often still waking at boot).
app.listen(PORT, HOST, () => {
  console.log(`[majisafe] API on ${HOST}:${PORT} dbConfigured=${require('./db').isDbConfigured}`);
  require('./migrate').migrateWithRetry().then(ensureAdmin).catch((e) => console.error('[boot] loop error', e.message));
});
