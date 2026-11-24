const { Pool } = require('pg');

const RAW_DATABASE_URL = (process.env.DATABASE_URL || '').trim();

/**
 * Render's INTERNAL Postgres address looks like
 *   postgres://user:pass@dpg-abc123-a/dbname
 * — a bare container hostname that only resolves *inside* Render's network and
 * only while that instance is attached to the service. Copied anywhere else
 * (a laptop, a CI runner, a service in another account) it fails DNS with
 * `getaddrinfo ENOTFOUND dpg-…`, and the app then cannot sign anyone in.
 *
 * This normaliser keeps an internal address when we appear to be running on
 * Render and otherwise rewrites it to Render's public hostname shape:
 *   dpg-abc123-a  ->  dpg-abc123-a.REGION-postgres.render.com
 *
 * Region comes from DATABASE_REGION / RENDER_REGION when provided. Without one
 * it is detected at boot (see detectPublicHost) by checking which regional
 * hostname answers, so a single correct DATABASE_URL is all a deploy needs.
 */
const RENDER_REGIONS = ['oregon', 'frankfurt', 'ohio', 'virginia', 'singapore', 'california'];

function isBareRenderDbHost(host) {
  return /^dpg-[a-z0-9]+-a$/i.test(String(host || ''));
}

function looksLikeWeAreOnRender() {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_HOSTNAME);
}

function splitUrl(url) {
  try { const u = new URL(url); return u; } catch { return null; }
}

function rewriteHost(url, newHost) {
  const u = splitUrl(url);
  if (!u) return url;
  u.hostname = newHost;
  return u.toString();
}

function candidatePublicHosts(bareHost) {
  const region = (process.env.DATABASE_REGION || process.env.RENDER_REGION || '').toLowerCase().trim();
  const ordered = region && RENDER_REGIONS.includes(region)
    ? [region, ...RENDER_REGIONS.filter((r) => r !== region)]
    : RENDER_REGIONS;
  return ordered.map((r) => `${bareHost}.${r}-postgres.render.com`);
}

let DATABASE_URL = RAW_DATABASE_URL;
let databaseUrlNote = '';
// When DATABASE_URL carries Render's internal hostname we keep the raw value
// here so boot can probe every region for the public name that answers.
const bareHost = (() => {
  const u = splitUrl(RAW_DATABASE_URL);
  return u && isBareRenderDbHost(u.hostname) ? u.hostname : null;
})();
if (bareHost && looksLikeWeAreOnRender()) {
  // Inside Render the internal name is correct and is the fastest route.
  databaseUrlNote = `Using Render internal database hostname ${bareHost}.`;
}

const isDbConfigured = Boolean(DATABASE_URL);

/**
 * TLS decision, in priority order:
 *  1. an explicit sslmode in the URL wins (sslmode=disable → no TLS,
 *     sslmode=require/no-verify/prefer → TLS without cert verification);
 *  2. PGSSL=true → TLS;
 *  3. the URL points at a managed host (render.com, …) → TLS.
 * Otherwise no TLS (localhost, CI, unix-socket style hosts).
 *
 * Getting this wrong is invisible at boot but makes every query fail, which
 * the auth routes used to report as "database unavailable".
 */
function resolveSslOptions(url) {
  let sslmode = '';
  try {
    sslmode = (new URL(url).searchParams.get('sslmode') || '').toLowerCase();
  } catch {
    sslmode = '';
  }
  if (sslmode === 'disable' || sslmode === 'allow') return false;
  if (['require', 'verify-ca', 'verify-full', 'prefer', 'no-verify'].includes(sslmode)) {
    return { rejectUnauthorized: sslmode === 'verify-full' };
  }
  const managedHost = /(^|\.)(render\.com|railway\.app|neon\.tech|supabase\.co|aws\.neon\.tech)$/i;
  let host = '';
  try { host = new URL(url).hostname; } catch { host = ''; }
  if (process.env.PGSSL === 'true' || managedHost.test(host)) return { rejectUnauthorized: false };
  if (process.env.PGSSL === 'false') return false;
  return false;
}

let lastPoolError = null;
let pool = null;

function buildPool() {
  if (!isDbConfigured) return null;
  const p = new Pool({
    connectionString: DATABASE_URL,
    ssl: resolveSslOptions(DATABASE_URL),
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    // A sleeping free-tier Postgres can take a while to accept connections.
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 20000),
    // Recycle half-open sockets left behind by a paused/restarted database.
    maxUses: 7500
  });
  p.on('error', (err) => {
    // Idle clients being dropped (DB restart, network blip) must never crash
    // the process; the pool replaces them on the next query.
    lastPoolError = err.message;
    console.error('[db] pool error:', err.message);
  });
  return p;
}

pool = buildPool();

/** Swap the connection target at runtime (used when the hostname is corrected). */
function setDatabaseUrl(nextUrl, reason) {
  if (!nextUrl || nextUrl === DATABASE_URL) return false;
  DATABASE_URL = nextUrl;
  if (reason) databaseUrlNote = reason;
  console.warn(`[db] DATABASE_URL target changed -> ${new URL(nextUrl).host}: ${reason || ''}`);
  const old = pool;
  pool = buildPool();
  try { if (old) old.end().catch(() => {}); } catch { /* ignore */ }
  return true;
}

/**
 * Boot-time self-correction: if the configured database hostname does not
 * resolve but it looks like a Render internal ID, find the regional public
 * hostname that actually answers and switch to it — no dashboard edit needed.
 */
async function detectPublicHost() {
  const u = splitUrl(DATABASE_URL);
  const bare = bareHost || (u && isBareRenderDbHost(u.hostname) ? u.hostname : null);
  if (!bare) return { corrected: false, host: u ? u.hostname : null };
  if (looksLikeWeAreOnRender()) return { corrected: false, host: u ? u.hostname : null, reason: 'running inside Render; internal hostname is correct' };
  const candidates = candidatePublicHosts(bare);
  const dns = require('dns').promises;
  for (const host of candidates) {
    try {
      await dns.lookup(host);
    } catch {
      continue;
    }
    // The name exists — also confirm something answers before switching.
    const changed = setDatabaseUrl(rewriteHost(RAW_DATABASE_URL, host), `DATABASE_URL used the internal Render hostname ${bare}, which only resolves inside Render. Switched to the public hostname ${host}.`);
    return { corrected: changed, host, tried: candidates };
  }
  return { corrected: false, host: u ? u.hostname : null, tried: candidates, reason: `the database hostname ${bare} does not resolve in any region — the instance is probably suspended or deleted` };
}

if (!pool) {
  console.warn(
    '[db] WARNING: DATABASE_URL is not set. The API boots, but database routes return 503. ' +
    'On Render: link the Postgres instance (Environment → DATABASE_URL → fromDatabase), then redeploy.'
  );
}

function noDatabaseError() {
  const err = new Error(
    'DATABASE_URL is missing. Attach the Postgres database to this service (Render → Environment → DATABASE_URL → Link majisafe-db), then redeploy.'
  );
  err.code = 'NO_DATABASE_URL';
  err.status = 503;
  return err;
}

async function query(text, params) {
  if (!pool) throw noDatabaseError();
  return pool.query(text, params);
}

// Errors that mean "the database itself is not usable right now" (as opposed
// to a bad statement or a missing table, which are application problems).
const TRANSIENT_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH',
  'ENOTFOUND', 'EAI_AGAIN', '57P01', '57P02', '57P03', '53300', '53400', '08000',
  '08001', '08003', '08004', '08006', '08007', '08P01', 'XX000'
]);

// Connectivity/authentication problems: retrying or fixing credentials helps.
// Deliberately does NOT include `42P01 relation does not exist` or `42704 type
// does not exist` — those are schema/SQL defects, and reporting them as an
// outage sends everyone hunting for a database that is actually fine.
function isTransientDbError(e) {
  if (!e) return false;
  if (e.code === 'NO_DATABASE_URL') return true;
  if (TRANSIENT_CODES.has(e.code)) return true;
  const msg = String(e.message || '');
  return /terminated unexpectedly|Connection terminated|timeout expired|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|self.signed certificate|unable to verify the first certificate|no pg_hba\.conf entry|password authentication failed|the database system is (starting up|shutting down)|too many clients/i
    .test(msg);
}

async function checkDb() {
  if (!pool) return { configured: false, ok: false, error: 'DATABASE_URL is not set' };
  try {
    const t0 = Date.now();
    await pool.query('SELECT 1');
    return { configured: true, ok: true, latencyMs: Date.now() - t0, lastPoolError };
  } catch (e) {
    return { configured: true, ok: false, error: e.message, code: e.code || null, lastPoolError };
  }
}

// True when the core tables exist (i.e. migrate ran). Lets /api/health —
// and support — distinguish "no database" from "schema not applied".
async function tablesReady() {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

// Human-readable, actionable explanation of why the DB is not answering.
// Only used for logging and the health endpoint, never for credentials errors.
function explainDbFailure(e) {
  const msg = String((e && e.message) || '');
  const code = e && e.code;
  if (code === 'NO_DATABASE_URL') return 'DATABASE_URL is not set on this service.';
  if (/self.signed certificate|unable to verify|certificate/i.test(msg))
    return 'TLS certificate rejected. Set PGSSL=true for managed Postgres, or sslmode=no-verify in DATABASE_URL.';
  if (/password authentication failed|role .* does not exist/i.test(msg))
    return 'DATABASE_URL credentials are wrong (check user/password/database name).';
  if (/database .* does not exist/i.test(msg))
    return 'The database named in DATABASE_URL does not exist.';
  if (code === 'ECONNREFUSED' || /ECONNREFUSED/.test(msg))
    return 'The database refused the connection (wrong host/port, or the instance is down).';
  if (/ENOTFOUND|EAI_AGAIN/.test(msg))
    return 'The database hostname does not resolve (wrong host, or no network egress).';
  if (/timeout|ETIMEDOUT|terminated unexpectedly|Connection terminated/i.test(msg))
    return 'The database did not answer in time (it may be suspended/cold-starting).';
  if (code === '42P01' || /relation .* does not exist/i.test(msg))
    return 'The database is reachable but the schema has not been applied (run the migration / redeploy).';
  if (code === '42501' || /permission denied/i.test(msg))
    return 'The database user lacks permission on the schema.';
  return msg || 'Unknown database error.';
}

/** Current pool (may be swapped at runtime, so always read the getter). */
function getPool() { return pool; }

module.exports = {
  // `pool` is a live binding: read it through getPool() in long-lived code.
  get pool() { return pool; },
  getPool, setDatabaseUrl, detectPublicHost, isBareRenderDbHost, candidatePublicHosts,
  query, checkDb, isDbConfigured, tablesReady,
  isTransientDbError, explainDbFailure, noDatabaseError, resolveSslOptions,
  get databaseUrl() { return DATABASE_URL; },
  get databaseUrlNote() { return databaseUrlNote; }
};
