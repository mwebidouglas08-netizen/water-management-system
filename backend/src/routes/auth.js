const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { signToken } = require('../middleware/auth');
const { migrate } = require('../migrate');

const router = express.Router();

function dbUnavailable(res, e, action) {
  console.error(`[auth/${action}]`, e.code || '', e.message);
  if (e.code === 'NO_DATABASE_URL')
    return res.status(503).json({ error: 'The service database is still connecting. Please wait a minute and try again.' });
  return res.status(503).json({ error: 'The service database is unavailable right now. Please wait a moment and try again.' });
}

// If tables were missed at boot (code 42P01 = undefined_table), heal once
// and retry the handler instead of failing the user's signup/signin.
async function withHeal(fn, req, res, action) {
  try {
    return await fn(req, res);
  } catch (e) {
    if (e && e.code === '42P01') {
      console.warn(`[auth/${action}] missing table — running migrate and retrying once`);
      try {
        await migrate();
        return await fn(req, res);
      } catch (e2) {
        return dbUnavailable(res, e2, action);
      }
    }
    return dbUnavailable(res, e, action);
  }
}

async function handleRegister(req, res) {
  const { name, email, password, org_name = '', phone = '', location = '', role = 'user',
    id_number = '', specialization = '', experience_years = 0, cert_details = '', cert_url = '' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (!['user', 'technician'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (role === 'technician' && !id_number) return res.status(400).json({ error: 'Technicians must provide a national ID number for verification.' });
  const exists = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const status = role === 'technician' ? 'pending' : 'active';
  const r = await query(
    `INSERT INTO users(name,email,password_hash,role,org_name,phone,location,status,id_number,specialization,experience_years,cert_details,cert_url)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,name,email,role,org_name,phone,location,status,created_at`,
    [name, email.toLowerCase(), hash, role, org_name, phone, location, status,
     id_number, specialization, Number(experience_years) || 0, cert_details, cert_url]
  );
  const user = r.rows[0];
  if (status === 'pending') return res.status(201).json({ message: 'Application received. Your technician account is unverified until an admin reviews your documents. You will be able to sign in once approved.', user });
  const token = signToken(user);
  res.status(201).json({ token, user });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;
  const r = await query('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase()]);
  const u = r.rows[0];
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password || '', u.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (u.status !== 'active') {
    if (u.status === 'pending' && u.role === 'technician')
      return res.status(403).json({ error: 'Your technician application is still under review. You will be able to sign in as soon as an admin verifies your documents.' });
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
router.post('/register', (req, res) => withHeal(handleRegister, req, res, 'register'));

// POST /api/auth/login
router.post('/login', (req, res) => withHeal(handleLogin, req, res, 'login'));

module.exports = router;
