const fs = require('fs');
const path = require('path');

// Applies database/schema.sql. Every statement is IF NOT EXISTS,
// so this is safe to run repeatedly.
//
// Two layers of defence:
//  1. migrateWithRetry() runs in the background at boot (the database on a
//     free tier is often still waking when the server starts).
//  2. Auth routes call migrate() once more if they ever hit error 42P01
//     (undefined_table), so a first request can heal a missed migration.
const last = { ran: false, reason: 'not attempted yet', at: null, attempts: 0 };

async function migrate() {
  last.attempts += 1;
  const { pool, isDbConfigured } = require('./db');
  if (!isDbConfigured || !pool) {
    last.ran = false;
    last.reason = 'DATABASE_URL is not set';
    last.at = new Date().toISOString();
    console.warn('[migrate] skipped: DATABASE_URL is not set');
    return { ...last };
  }
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    last.ran = false;
    last.reason = `schema file missing at ${schemaPath}`;
    last.at = new Date().toISOString();
    console.warn(`[migrate] skipped: ${last.reason}`);
    return { ...last };
  }
  try {
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));
    last.ran = true;
    last.reason = 'ok';
    last.at = new Date().toISOString();
    console.log('[migrate] schema ensured (all tables IF NOT EXISTS)');
    return { ...last };
  } catch (e) {
    last.ran = false;
    last.reason = e.message;
    last.at = new Date().toISOString();
    console.error('[migrate] FAILED:', e.message);
    return { ...last };
  }
}

async function migrateWithRetry({ tries = 20, delayMs = 15000 } = {}) {
  for (let i = 1; i <= tries; i++) {
    const r = await migrate();
    if (r.ran) return r;
    if (i < tries) await new Promise((res) => setTimeout(res, delayMs));
  }
  console.error(`[migrate] gave up after ${tries} attempts. Last: ${last.reason}`);
  return { ...last };
}

function migrateStatus() {
  return { ...last };
}

module.exports = { migrate, migrateWithRetry, migrateStatus };
