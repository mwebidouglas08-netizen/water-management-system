const express = require('express');
const { query } = require('../db');
const { authRequired, roleRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, roleRequired('admin'));

// GET /api/admin/overview
router.get('/overview', async (req, res) => {
  const [users, devs, reps, alerts] = await Promise.all([
    query(`SELECT role, status, count(*) c FROM users GROUP BY role, status`),
    query(`SELECT count(*) c FROM devices`),
    query(`SELECT status, count(*) c FROM reports GROUP BY status`),
    query(`SELECT count(*) c FROM alerts WHERE created_at > NOW() - INTERVAL '7 days'`)
  ]);
  const totals = await query(`SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM devices) devices, (SELECT count(*) FROM reports) reports, (SELECT count(*) FROM readings) readings`);
  res.json({ byRole: users.rows, devices: devs.rows, reports: reps.rows, alerts7d: alerts.rows[0].c, totals: totals.rows[0] });
});

// GET /api/admin/users?search=&status=pending — includes technician KYC for approvals
router.get('/users', async (req, res) => {
  const s = `%${req.query.search || ''}%`;
  const clauses = [`(name ILIKE $1 OR email ILIKE $1 OR org_name ILIKE $1)`];
  const params = [s];
  if (req.query.status) { params.push(req.query.status); clauses.push(`status=$${params.length}`); }
  if (req.query.role) { params.push(req.query.role); clauses.push(`role=$${params.length}`); }
  const r = await query(
    `SELECT id,name,email,role,org_name,phone,location,status,created_at,id_number,specialization,experience_years,cert_details,cert_url
     FROM users WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 200`, params);
  res.json(r.rows);
});

// POST /api/admin/users/:id/verify — approve technician (unlocks features on next sign-in)
router.post('/users/:id/verify', async (req, res) => {
  const r = await query(`UPDATE users SET status='active' WHERE id=$1 RETURNING id,name,email,role,status`, [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

// POST /api/admin/users/:id/reject — reject application (suspends account)
router.post('/users/:id/reject', async (req, res) => {
  const r = await query(`UPDATE users SET status='suspended' WHERE id=$1 RETURNING id,name,email,role,status`, [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

// PATCH /api/admin/users/:id {status, role}
router.patch('/users/:id', async (req, res) => {
  const { status, role } = req.body;
  const r = await query(
    `UPDATE users SET status=COALESCE($2,status), role=COALESCE($3,role) WHERE id=$1 RETURNING id,name,email,role,status`,
    [req.params.id, status || null, role || null]
  );
  res.json(r.rows[0]);
});

// POST /api/admin/users {name,email,password,role,org_name...} — onboard directly
router.post('/users', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, password, role = 'user', org_name = '', phone = '', location = '' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name/email/password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await query(
      `INSERT INTO users(name,email,password_hash,role,org_name,phone,location,status) VALUES($1,$2,$3,$4,$5,$6,$7,'active') RETURNING id,name,email,role,status`,
      [name, email.toLowerCase(), hash, role, org_name, phone, location]
    );
    res.status(201).json(r.rows[0]);
  } catch { res.status(409).json({ error: 'Email exists' }); }
});

// GET /api/admin/reports + assign handled via /api/reports/:id (admin allowed)
// GET /api/admin/consumption — daily volume proxy
router.get('/consumption', async (req, res) => {
  const r = await query(`
    SELECT date_trunc('day', ts) day, AVG(flow_lpm)::float avg_flow, COUNT(*) samples
    FROM readings WHERE ts > NOW() - INTERVAL '14 days' GROUP BY 1 ORDER BY 1 ASC`);
  res.json(r.rows);
});

module.exports = router;
