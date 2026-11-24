const fs = require('fs');
const path = require('path');

/**
 * Applies database/schema.sql.
 *
 * Design rules (each one is a bug we hit in production):
 *
 *  1. NON-DESTRUCTIVE: node-postgres sends a multi-statement string as ONE
 *     implicit transaction, so a single failing statement used to roll back
 *     every CREATE TABLE. The database then had no tables at all and every
 *     sign-in answered "the database is unavailable". Statements are now
 *     executed one at a time: a broken future statement can no longer erase
 *     a working schema.
 *  2. SERIALISED: boot, the auth self-heal and the seed all call this. Runs are
 *     coalesced in-process and guarded by a Postgres advisory lock across
 *     instances, so concurrent CREATE ... IF NOT EXISTS cannot deadlock
 *     (40P01) or abort each other.
 *  3. HONEST STATUS: migrateStatus() exposes ran/failed counts and the first
 *     error, so /api/health says *why* the schema is not ready.
 */
const ADVISORY_LOCK_KEY = 918273645; // arbitrary, stable across instances

const last = {
  ran: false,
  reason: 'not attempted yet',
  at: null,
  attempts: 0,
  statements: 0,
  failures: []
};

let inFlight = null;

function schemaPath() {
  return path.join(__dirname, '..', '..', 'database', 'schema.sql');
}

/**
 * Split SQL into individual statements, respecting dollar-quoted bodies and
 * line comments. schema.sql contains no functions today, but this keeps the
 * splitter correct if one is added.
 */
function splitStatements(sql) {
  const out = [];
  let buf = '';
  let i = 0;
  let dollarTag = null;
  while (i < sql.length) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);

    if (!dollarTag && two === '--') {              // line comment
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      buf += '\n';
      continue;
    }
    if (!dollarTag && ch === "'") {                // single-quoted literal
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") break;
        j++;
      }
      buf += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '$') {                              // dollar quoting
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        if (!dollarTag) { dollarTag = tag; } else if (dollarTag === tag) { dollarTag = null; }
        buf += tag;
        i += tag.length;
        continue;
      }
    }
    if (!dollarTag && ch === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function runMigration() {
  last.attempts += 1;
  const { pool, isDbConfigured, isTransientDbError, explainDbFailure } = require('./db');

  if (!isDbConfigured || !pool) {
    Object.assign(last, { ran: false, reason: 'DATABASE_URL is not set', at: new Date().toISOString() });
    console.warn('[migrate] skipped: DATABASE_URL is not set');
    return { ...last };
  }

  const file = schemaPath();
  if (!fs.existsSync(file)) {
    Object.assign(last, { ran: false, reason: `schema file missing at ${file}`, at: new Date().toISOString() });
    console.error(`[migrate] skipped: ${last.reason}`);
    return { ...last };
  }

  const statements = splitStatements(fs.readFileSync(file, 'utf8'));
  let client;
  let locked = false;
  let ok = 0;
  const failures = [];

  try {
    client = await pool.connect();
  } catch (e) {
    Object.assign(last, {
      ran: false, statements: statements.length,
      reason: explainDbFailure(e), at: new Date().toISOString(), failures: [{ statement: '(connect)', code: e.code || null, message: e.message }]
    });
    console.error(`[migrate] cannot connect: ${last.reason}`);
    return { ...last };
  }

  try {
    // Serialise across processes/instances. If the lock is busy, another
    // instance is already applying the same idempotent DDL — wait, don't fight.
    try {
      await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
      locked = true;
    } catch (e) {
      console.warn('[migrate] advisory lock unavailable, continuing:', e.message);
    }

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok += 1;
      } catch (e) {
        const benign = e.code === '42P07' || e.code === '42710' || e.code === '42P16';
        if (benign) { ok += 1; continue; }
        failures.push({ statement: stmt.slice(0, 120).replace(/\s+/g, ' '), code: e.code || null, message: e.message });
        console.error(`[migrate] statement failed (${e.code || 'no code'}) in "${stmt.slice(0, 60).replace(/\s+/g, ' ')}…": ${e.message}`);
        // A broken statement must not abort the rest of the schema, but a
        // dead connection ends the run.
        if (isTransientDbError(e)) throw e;
      }
    }

    // Runs that only hit the harmless "already exists" codes are a success.
    const ran = failures.length === 0;
    Object.assign(last, {
      ran,
      reason: ran
        ? 'ok'
        : `${failures.length} schema statement(s) failed; the rest applied — see failures`,
      at: new Date().toISOString(),
      statements: statements.length,
      failures
    });
    if (failures.length === 0) console.log(`[migrate] schema ensured (${ok} statements)`);
    return { ...last };
  } catch (e) {
    Object.assign(last, {
      ran: false,
      reason: explainDbFailure(e),
      at: new Date().toISOString(),
      statements: statements.length,
      failures: [...failures, { statement: '(connection lost)', code: e.code || null, message: e.message }]
    });
    console.error('[migrate] FAILED:', last.reason);
    return { ...last };
  } finally {
    if (locked) {
      try { await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]); } catch { /* ignore */ }
    }
    try { client.release(); } catch { /* ignore */ }
  }
}

/** Coalescing wrapper: concurrent callers share one run. */
async function migrate() {
  if (inFlight) return inFlight;
  inFlight = runMigration().finally(() => { inFlight = null; });
  return inFlight;
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

module.exports = { migrate, migrateWithRetry, migrateStatus, splitStatements };
