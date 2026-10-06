const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register {name,email,password,org_name,phone,location,role=user|technician}
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, org_name = '', phone = '', location = '', role = 'user' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    if (!['user', 'technician'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const exists = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const status = role === 'technician' ? 'pending' : 'active';
    const r = await query(
      `INSERT INTO users(name,email,password_hash,role,org_name,phone,location,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,role,org_name,phone,location,status,created_at`,
      [name, email.toLowerCase(), hash, role, org_name, phone, location, status]
    );
    const user = r.rows[0];
    if (status === 'pending') return res.status(201).json({ message: 'Technician application received. Await admin approval.', user });
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Register failed' }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await query('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase()]);
    const u = r.rows[0];
    if (!u) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (u.status !== 'active') return res.status(403).json({ error: `Account ${u.status}. Contact admin.` });
    const user = { id: u.id, name: u.name, email: u.email, role: u.role, org_name: u.org_name, phone: u.phone, location: u.location, status: u.status };
    res.json({ token: signToken(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

module.exports = router;
