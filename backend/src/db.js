const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
const isDbConfigured = Boolean(DATABASE_URL);
const useSsl = DATABASE_URL.includes('render.com') || process.env.PGSSL === 'true';

// IMPORTANT: never default to localhost on Render. If DATABASE_URL is missing,
// fail fast with a clear message instead of ECONNREFUSED ::1:5432.
const pool = isDbConfigured
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null;

if (pool) {
  pool.on('error', (err) => console.error('[db] pool error', err.message));
} else {
  console.warn(
    '[db] WARNING: DATABASE_URL is not set. API will boot, but DB routes will return 503. ' +
    'On Render: link a Postgres (majisafe-db) to this service so DATABASE_URL exists.'
  );
}

async function query(text, params) {
  if (!pool) {
    const err = new Error(
      'DATABASE_URL is missing. Attach a Render Postgres to this service (Environment → DATABASE_URL from database majisafe-db), then redeploy.'
    );
    err.code = 'NO_DATABASE_URL';
    err.status = 503;
    throw err;
  }
  return pool.query(text, params);
}

async function checkDb() {
  if (!pool) return { configured: false, ok: false };
  try {
    await pool.query('SELECT 1');
    return { configured: true, ok: true };
  } catch (e) {
    return { configured: true, ok: false, error: e.message };
  }
}

// True when the core tables exist (i.e. migrate ran). Lets /api/health
// — and support — distinguish "no database" from "schema not applied".
async function tablesReady() {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = { pool, query, checkDb, isDbConfigured, tablesReady };
