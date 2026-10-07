const express = require('express');
const { query } = require('../db');
const { authRequired, roleRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, roleRequired('admin'));

// GET /api/admin/overview
router.get('/overview', async (req, res) => {
  const [users, devs, reps, alerts, pending, open] = await Promise.all([
    query(`SELECT role, status, count(*) c FROM users GROUP BY role, status`),
    query(`SELECT count(*) c FROM devices`),
    query(`SELECT status, count(*) c FROM reports GROUP BY status`),
    query(`SELECT count(*) c FROM alerts WHERE created_at > NOW() - INTERVAL '7 days'`),
    query(`SELECT count(*) c FROM users WHERE role='technician' AND status='pending'`),
    query(`SELECT count(*) c FROM reports WHERE status='open'`)
  ]);
  const totals = await query(`SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM devices) devices, (SELECT count(*) FROM reports) reports, (SELECT count(*) FROM readings) readings`);
  res.json({ byRole: users.rows, devices: devs.rows, reports: reps.rows, alerts7d: alerts.rows[0].c, totals: totals.rows[0], pendingCount: Number(pending.rows[0].c), openCount: Number(open.rows[0].c) });
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

// POST /api/admin/seed-demo — one-click demo dataset: demo institution with a
// live tank, plus sample reports so every dashboard looks composed.
router.post('/seed-demo', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { provisionDemoDevice } = require('../services/provision');
    const { triageReport } = require('../services/ai');
    let school = await query(`SELECT id FROM users WHERE email='demo.school@majisafe.ke'`);
    let schoolId;
    if (!school.rows.length) {
      const hash = await bcrypt.hash('Demo123!', 10);
      const u = await query(
        `INSERT INTO users(name,email,password_hash,role,org_name,phone,location,status)
         VALUES('Demo Academy','demo.school@majisafe.ke',$1,'user','Demo Academy','+254700000000','Nairobi','active') RETURNING id`,
        [hash]
      );
      schoolId = u.rows[0].id;
    } else {
      schoolId = school.rows[0].id;
    }
    const existing = await query(`SELECT count(*) c FROM devices WHERE user_id=$1`, [schoolId]);
    if (Number(existing.rows[0].c) >= 5)
      return res.json({ ok: true, note: 'Demo dataset already present (5 sites max).' });
    const n = Number(existing.rows[0].c) + 1;
    const dev = await provisionDemoDevice(schoolId, `Demo Tank ${n}`, n === 1 ? 'Main Building' : `Annex ${n}`);
    const tech = await query(`SELECT id FROM users WHERE role='technician' AND status='active' ORDER BY created_at LIMIT 1`);
    const techId = tech.rows[0]?.id || null;
    const samples = [
      { category: 'leakage', title: 'Dripping riser in Block C bathrooms', description: 'Water runs constantly in two cubicles, floor always wet.', location: 'Block C, Demo Academy', status: 'open', assigned: null },
      { category: 'burst', title: 'Burst main near the front gate', description: 'Water gushing across the driveway since morning.', location: 'Front gate, Demo Academy', status: techId ? 'assigned' : 'open', assigned: techId },
      { category: 'quality', title: 'Brown water after heavy rain', description: 'Taps run brown every rainy afternoon.', location: 'Kitchen block, Demo Academy', status: 'open', assigned: null }
    ];
    for (const s of samples) {
      const tri = triageReport({ category: s.category, title: s.title, description: s.description });
      const r = await query(
        `INSERT INTO reports(reporter_id,reporter_name,category,title,description,location,priority,ai_triage,status,assigned_to)
         VALUES($1,'Demo Academy',$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [schoolId, s.category, s.title, s.description, s.location, tri.priority, tri.note, s.status, s.assigned]
      );
      if (s.assigned) await query(`INSERT INTO jobs(report_id, technician_id, status) VALUES($1,$2,'assigned')`, [r.rows[0].id, s.assigned]);
    }
    res.status(201).json({ ok: true, device: dev.device_key, note: `Demo Tank ${n} plus 3 sample reports ready.` });
  } catch (e) {
    console.error('[admin/seed-demo]', e.message);
    res.status(503).json({ error: 'Demo seeding failed. Try again in a moment.' });
  }
});

module.exports = router;
