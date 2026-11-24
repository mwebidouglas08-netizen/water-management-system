const express = require('express');
const bcrypt = require('bcryptjs');
const { query, isTransientDbError, explainDbFailure } = require('../db');
const { signToken } = require('../middleware/auth');
const { migrate } = require('../migrate');

const router = express.Router();

const RETRY_HINT = 'Please try again in a moment.';

/**
 * Turn a database failure into an answer the user can act on.
 *
 * The previous version mapped *every* exception to "the database is
 * unavailable", which hid wrong credentials, missing tables and TLS problems
 * behind advice that could never fix them. Now:
 *  - transient outages (instance asleep/down, connection dropped) keep the
 *    retry wording, because retrying genuinely helps;
 *  - a missing table triggers one self-heal, then says the schema is not ready;
 *  - anything else is reported as an application error and logged with detail.
 * Only the server log carries the raw message; the client never sees internals.
 */
function dbFailure(res, e, action) {
  const code = e && e.code;
  const detail = explainDbFailure(e);
  console.error(`[auth/${action}] ${code || 'error'}: ${e && e.message}`);

  if (code === 'NO_DATABASE_URL') {
    return res.status(503).json({ error: `The service database is not connected yet. ${RETRY_HINT}` });
  }
  if (isTransientDbError(e)) {
    return res.status(503).json({ error: `The service database is unavailable right now. ${RETRY_HINT}` });
  }
  return res.status(500).json({ error: 'The sign-in service hit an unexpected error. Please try again; if it persists, contact support.' });
}

/**
 * Runs an auth handler, healing a missing schema once. Login/registration are
 * the first requests a fresh deployment ever receives, so they are also the
 * requests that must be able to finish applying the schema.
 */
async function withDb(fn, req, res, action) {
  try {
    return await fn(req, res);
  } catch (e) {
    // Two different recoveries:
    //  - 42P01: the schema is missing → apply it, then retry.
    //  - a connectivity failure: the configured target may have been wrong or
    //    the database may have been away. Re-run hostname detection and the
    //    migration once, then retry. This is what lets a corrected
    //    DATABASE_URL take effect without a redeploy, and it is why sign-in
    //    can recover by itself instead of sitting on a stale failure.
    const schemaMissing = e && e.code === '42P01';
    const connectivity = isTransientDbError(e);

    if (schemaMissing || connectivity) {
      console.warn(
        `[auth/${action}] ${schemaMissing ? 'schema not ready' : 'database unreachable'} — re-checking target and migrating, then retrying once`
      );
      try {
        const { detectPublicHost } = require('../db');
        await detectPublicHost();
      } catch { /* detection is best-effort; migrate below reports the truth */ }
      const result = await migrate();
      if (result.ran) {
        try {
          return await fn(req, res);
        } catch (e2) {
          return dbFailure(res, e2, action);
        }
      }
      console.error(`[auth/${action}] migration did not complete: ${result.reason}`);
      return res.status(503).json({
        error: `The service database is still being set up. ${RETRY_HINT}`
      });
    }
    return dbFailure(res, e, action);
  }
}

async function handleRegister(req, res) {
  const { name, email, password, org_name = '', phone = '', location = '', role = 'user',
    id_number = '', specialization = '', experience_years = 0, cert_details = '', cert_url = '' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (!['user', 'technician'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (role === 'technician' && !id_number) return res.status(400).json({ error: 'Technicians must provide a national ID number for verification.' });
  const exists = await query('SELECT id FROM users WHERE email=$1', [String(email).toLowerCase()]);
  if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const status = role === 'technician' ? 'pending' : 'active';
  const r = await query(
    `INSERT INTO users(name,email,password_hash,role,org_name,phone,location,status,id_number,specialization,experience_years,cert_details,cert_url)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,name,email,role,org_name,phone,location,status,created_at`,
    [name, String(email).toLowerCase(), hash, role, org_name, phone, location, status,
     id_number, specialization, Number(experience_years) || 0, cert_details, cert_url]
  );
  const user = r.rows[0];
  const token = signToken(user);
  if (status === 'pending') {
    // Unverified technicians sign in too, but land on a locked dashboard
    // until an admin approves them (tech routes enforce active status).
    return res.status(201).json({
      token, user,
      message: 'Application received. Your technician account is unverified until an admin reviews your documents.'
    });
  }
  if (role === 'user') {
    // A living dashboard beats an empty one — but this is a nicety, never a
    // reason to fail a signup that already committed.
    try {
      const { provisionDemoDevice } = require('../services/provision');
      await provisionDemoDevice(user.id);
    } catch (e) {
      console.error('[auth/register] demo provisioning skipped:', e.message);
    }
  }
  res.status(201).json({ token, user });
}

async function handleLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const r = await query('SELECT * FROM users WHERE email=$1', [String(email).toLowerCase()]);
  const u = r.rows[0];
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(String(password), u.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (u.status !== 'active') {
    const pendingUser = { id: u.id, name: u.name, email: u.email, role: u.role, org_name: u.org_name, phone: u.phone, location: u.location, status: u.status };
    if (u.status === 'pending' && u.role === 'technician')
      // Let them into the locked dashboard (it polls verification);
      // technician API routes independently require an active account.
      return res.json({ token: signToken(pendingUser), user: pendingUser });
    return res.status(403).json({ error: `Account ${u.status}. Contact admin.` });
  }
  const user = { id: u.id, name: u.name, email: u.email, role: u.role, org_name: u.org_name, phone: u.phone, location: u.location, status: u.status };
  res.json({ token: signToken(user), user });
}

// GET /api/auth/me — full own profile (KYC + verification status), no password
router.get('/me', require('../middleware/auth').authRequired, async (req, res) => {
  const r = await query(
    `SELECT id,name,email,role,org_name,phone,location,status,created_at,id_number,specialization,experience_years,cert_details,cert_url
     FROM users WHERE id=$1`, [req.user.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

// POST /api/auth/register {name,email,password,org_name,phone,location,role=user|technician}
router.post('/register', (req, res) => withDb(handleRegister, req, res, 'register'));

// POST /api/auth/login
router.post('/login', (req, res) => withDb(handleLogin, req, res, 'login'));

module.exports = router;
