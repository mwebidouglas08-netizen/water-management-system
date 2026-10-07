const express = require('express');
const { query } = require('../db');
const { authRequired } = require('../middleware/auth');
const { triageReport } = require('../services/ai');

const router = express.Router();

// GET /api/reports?status=&mine=1 (regular users only ever see their own)
router.get('/', authRequired, async (req, res) => {
  const { status, mine } = req.query;
  let sql = `SELECT r.*, u.name as tech_name FROM reports r LEFT JOIN users u ON u.id=r.assigned_to ORDER BY r.created_at DESC LIMIT 200`;
  let params = [];
  if (mine === '1' || req.user.role === 'user') {
    sql = `SELECT r.*, u.name as tech_name FROM reports r LEFT JOIN users u ON u.id=r.assigned_to WHERE r.reporter_id=$1 ORDER BY r.created_at DESC LIMIT 200`;
    params = [req.user.id];
  } else if (status) {
    sql = `SELECT r.*, u.name as tech_name FROM reports r LEFT JOIN users u ON u.id=r.assigned_to WHERE r.status=$1 ORDER BY r.created_at DESC LIMIT 200`;
    params = [status];
  } else if (req.user.role === 'technician') {
    sql = `SELECT r.* FROM reports r WHERE r.assigned_to=$1 OR r.status='open' ORDER BY r.created_at DESC LIMIT 200`;
    params = [req.user.id];
  }
  const r = await query(sql, params);
  res.json(r.rows);
});

// POST /api/reports
router.post('/', authRequired, async (req, res) => {
  try {
    const { category='leakage', title, description='', location='', lat=0, lng=0, photo_url='', phone='' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const tri = triageReport({ category, title, description });
    const r = await query(
      `INSERT INTO reports(reporter_id,reporter_name,phone,category,title,description,location,lat,lng,photo_url,priority,ai_triage)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, req.user.name, phone, category, title, description, location, lat, lng, photo_url, tri.priority, `${tri.note} Checklist: ${tri.checklist.join('; ')}`]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('[reports/create]', e.code || '', e.message);
    res.status(503).json({ error: 'Could not send your report right now. Please wait a moment and try again.' });
  }
});

// PATCH /api/reports/:id  {status, assigned_to, priority}
router.patch('/:id', authRequired, async (req, res) => {
  const { status, assigned_to, priority } = req.body;
  const cur = await query('SELECT * FROM reports WHERE id=$1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
  const rep = cur.rows[0];
  // Reporters manage their own tickets (e.g. mark resolved); only
  // technicians/admins may (re)assign tickets to someone.
  const canAssign = req.user.role === 'admin' || req.user.role === 'technician';
  const allowed = canAssign || rep.reporter_id === req.user.id;
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  if (assigned_to && !canAssign) return res.status(403).json({ error: 'Only technicians or admins can assign tickets.' });
  const r = await query(
    `UPDATE reports SET status=COALESCE($2,status), assigned_to=COALESCE($3,assigned_to), priority=COALESCE($4,priority), updated_at=NOW() WHERE id=$1 RETURNING *`,
    [req.params.id, status || null, assigned_to || null, priority || null]
  );
  if (status === 'assigned' || (assigned_to && status !== 'resolved')) {
    await query(`INSERT INTO jobs(report_id, technician_id, status) VALUES($1,$2,'assigned')`, [req.params.id, assigned_to || req.user.id]);
  }
  if (status === 'resolved') {
    await query(`UPDATE jobs SET status='done', completed_at=NOW() WHERE report_id=$1 AND status != 'done'`, [req.params.id]);
  }
  // Keep the reporter informed automatically — visible in their thread + inbox.
  try {
    if ((status === 'assigned' && assigned_to) || (assigned_to && status !== 'resolved')) {
      const t = await query('SELECT name FROM users WHERE id=$1', [assigned_to]);
      const techName = t.rows[0]?.name || 'a technician';
      await query(`INSERT INTO messages(sender_id, receiver_id, report_id, body) VALUES($1,$2,$3,$4)`,
        [req.user.id, rep.reporter_id, req.params.id, `Good news on "${rep.title}": ${techName} has been assigned and will take it from here.`]);
    } else if (status === 'resolved') {
      await query(`INSERT INTO messages(sender_id, receiver_id, report_id, body) VALUES($1,$2,$3,$4)`,
        [req.user.id, rep.reporter_id, req.params.id, `Resolved: "${rep.title}" is marked fixed. Reply here if the problem returns.`]);
    } else if (status === 'in_progress') {
      await query(`INSERT INTO messages(sender_id, receiver_id, report_id, body) VALUES($1,$2,$3,$4)`,
        [req.user.id, rep.reporter_id, req.params.id, `Work has started on "${rep.title}". You can follow progress here.`]);
    }
  } catch (e) {
    console.error('[reports/notify]', e.message); // status change itself already saved
  }
  res.json(r.rows[0]);
});

// ---- inbox messages ----
// GET /api/reports/inbox/all  (technician + admin + user threads)
router.get('/inbox/all', authRequired, async (req, res) => {
  const r = await query(
    `SELECT m.*, s.name as sender_name FROM messages m LEFT JOIN users s ON s.id=m.sender_id
     WHERE m.receiver_id=$1 OR m.sender_id=$1 ORDER BY m.created_at DESC LIMIT 200`,
    [req.user.id]
  );
  res.json(r.rows);
});

// POST /api/reports/:id/message {receiver_id, body}
router.post('/:id/message', authRequired, async (req, res) => {
  const { receiver_id, body } = req.body;
  if (!body) return res.status(400).json({ error: 'Empty message' });
  const r = await query(
    `INSERT INTO messages(sender_id,receiver_id,report_id,body) VALUES($1,$2,$3,$4) RETURNING *`,
    [req.user.id, receiver_id, req.params.id, body]
  );
  res.status(201).json(r.rows[0]);
});

// POST /api/reports/message {receiver_id, body} (direct, no report)
router.post('/message/direct', authRequired, async (req, res) => {
  const { receiver_id, body } = req.body;
  if (!receiver_id || !body) return res.status(400).json({ error: 'receiver + body required' });
  const r = await query(`INSERT INTO messages(sender_id,receiver_id,body) VALUES($1,$2,$3) RETURNING *`, [req.user.id, receiver_id, body]);
  res.status(201).json(r.rows[0]);
});

router.patch('/inbox/:id/read', authRequired, async (req, res) => {
  await query('UPDATE messages SET is_read=true WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// POST /api/reports/assist {title, description, category} — AI pre-check while filing
router.post('/assist', authRequired, async (req, res) => {
  const { title = '', description = '', category = 'leakage' } = req.body;
  if (!title && !description) return res.status(400).json({ error: 'Describe the problem first.' });
  const tri = triageReport({ category, title, description });
  res.json({
    priority: tri.priority,
    cause: tri.cause,
    checklist: tri.checklist,
    tip: `${tri.note} Filing under "${category}" routes this to the right technicians. Add the exact location and since-when for a faster fix.`
  });
});

module.exports = router;
