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

// CORS: a browser whose origin is not allowed never receives an
// Access-Control-Allow-Origin header, and the fetch then fails as
// "Failed to fetch" — the exact symptom users see on sign-in/sign-up.
// So the allowlist is normalised (trailing slash, scheme, case) and the
// project's own Vercel hostnames are always accepted.
function normaliseOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normaliseOrigin)
  .filter(Boolean);

const allowedOriginPatterns = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https?:\/\/[a-z0-9-]+\.onrender\.com$/i,
  // Sandbox / tunnel preview hosts
  /^https?:\/\/[a-z0-9-]+\.e2b\.app$/i,
  /^https?:\/\/[a-z0-9-]+\.ngrok(-free)?\.app$/i
];

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl, server-to-server, same-origin
  const o = normaliseOrigin(origin);
  if (configuredOrigins.includes(o)) return true;
  if (configuredOrigins.length === 0) return true; // nothing configured: reflect any origin
  return allowedOriginPatterns.some((re) => re.test(o));
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, origin || true);
    console.warn(`[cors] blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'X-Ingest-Secret'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // explicit preflight for every route
app.use((req, res, next) => {
  // Vary on Origin so caches never replay one origin's CORS headers to another.
  res.header('Vary', 'Origin');
  next();
});
app.use(express.json({ limit: '5mb' })); // room for KYC document uploads (images/PDFs as data URLs)
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ name: 'MajiSafe API', version: '1.0.0', docs: '/api/health' }));
// Health check must succeed even without DB so Render can pass deploy checks.
// DB status is reported explicitly instead of crashing the process.
app.get('/api/health', async (req, res) => {
  const { checkDb, isDbConfigured, tablesReady } = require('./db');
  const { migrateStatus } = require('./migrate');
  const db = await checkDb();
  res.json({
    ok: true,
    time: new Date().toISOString(),
    dbConfigured: isDbConfigured,
    dbOk: db.ok,
    dbError: db.error || null,
    tables: await tablesReady(),
    migrate: migrateStatus(),
    // Quick answer to "why does the browser say Failed to fetch?"
    origin: req.headers.origin || null,
    originAllowed: isAllowedOrigin(req.headers.origin),
    corsAllowlist: configuredOrigins
  });
});

// Proves the browser is talking to *this* API, and shows whether its origin is
// allowed. The frontend calls it before sign-in to explain misconfiguration.
app.get('/api/health/cors', (req, res) => {
  res.json({ ok: true, origin: req.headers.origin || null, allowed: isAllowedOrigin(req.headers.origin), corsAllowlist: configuredOrigins });
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
const server = app.listen(PORT, HOST, () => {
  console.log(`[majisafe] API on ${HOST}:${PORT} dbConfigured=${require('./db').isDbConfigured}`);
  // Say out loud whether the allowlist could cause a browser "Failed to fetch".
  if (!configuredOrigins.length) {
    console.warn('[cors] FRONTEND_URL is not set — every origin is reflected. Set it to your frontend URL in production.');
  } else {
    console.log(`[cors] allowed origins: ${configuredOrigins.join(', ')}`);
  }
  require('./migrate').migrateWithRetry().then(ensureAdmin).catch((e) => console.error('[boot] loop error', e.message));
});
server.on('error', (e) => console.error('[boot] listen failed:', e.message));
