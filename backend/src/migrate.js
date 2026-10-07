const fs = require('fs');
const path = require('path');

// Applies database/schema.sql on every boot. Every statement is
// IF NOT EXISTS, so this is safe to run repeatedly. Best-effort:
// a failure is logged but never crashes the server, because /api/health
// must stay up so the hosting platform sees a live service.
async function migrate() {
  const { pool, isDbConfigured } = require('./db');
  if (!isDbConfigured || !pool) {
    console.warn('[migrate] skipped: DATABASE_URL is not set');
    return { ran: false, reason: 'no DATABASE_URL' };
  }
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn(`[migrate] skipped: schema not found at ${schemaPath}`);
    return { ran: false, reason: 'schema file missing' };
  }
  try {
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));
    console.log('[migrate] schema ensured (all tables IF NOT EXISTS)');
    return { ran: true };
  } catch (e) {
    console.error('[migrate] FAILED:', e.message);
    return { ran: false, reason: e.message };
  }
}

module.exports = { migrate };
