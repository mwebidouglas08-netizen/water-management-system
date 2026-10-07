require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

const configuredOrigins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
// Reflect the request origin when no allowlist is configured (dev / first deploy),
// otherwise enforce the allowlist. Never send '*' together with credentials.
app.use(cors({ origin: configuredOrigins.length ? configuredOrigins : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
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
  res.status(500).json({ error: 'Server error' });
});

const HOST = '0.0.0.0';
// Listen immediately so health checks pass, then keep ensuring tables in the
// background (free-tier Postgres is often still waking at boot).
app.listen(PORT, HOST, () => {
  console.log(`[majisafe] API on ${HOST}:${PORT} dbConfigured=${require('./db').isDbConfigured}`);
  require('./migrate').migrateWithRetry().catch((e) => console.error('[migrate] loop error', e.message));
});
