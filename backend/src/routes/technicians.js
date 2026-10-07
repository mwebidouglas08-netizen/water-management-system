const express = require('express');
const { query } = require('../db');
const { authRequired, roleRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/tech/overview — KPIs + assigned jobs + open pool
router.get('/overview', authRequired, roleRequired('technician', 'admin'), async (req, res) => {
  const techId = req.user.role === 'technician' ? req.user.id : null;
  const assigned = await query(
    techId
      ? `SELECT r.* FROM reports r WHERE r.assigned_to=$1 AND r.status IN ('assigned','in_progress') ORDER BY r.created_at DESC`
      : `SELECT r.* FROM reports r WHERE r.status IN ('assigned','in_progress') ORDER BY r.created_at DESC LIMIT 100`,
    techId ? [techId] : []
  );
  const openPool = await query(`SELECT * FROM reports WHERE status='open' ORDER BY created_at DESC LIMIT 100`);
  const done = await query(
    techId ? `SELECT count(*) c FROM reports WHERE assigned_to=$1 AND status='resolved'` : `SELECT count(*) c FROM reports WHERE status='resolved'`,
    techId ? [techId] : []
  );
  const inbox = await query(`SELECT count(*) c FROM messages WHERE receiver_id=$1 AND is_read=false`, [req.user.id]);
  const devices = await query(`SELECT d.*, u.name as owner, u.location FROM devices d LEFT JOIN users u ON u.id=d.user_id ORDER BY d.last_seen DESC LIMIT 50`);
  const threads = await query(
    `SELECT m.*, s.name as sender_name, r.title as report_title FROM messages m
     LEFT JOIN users s ON s.id=m.sender_id LEFT JOIN reports r ON r.id=m.report_id
     WHERE m.receiver_id=$1 OR m.sender_id=$1 ORDER BY m.created_at DESC LIMIT 30`,
    [req.user.id]
  );
  res.json({ assigned: assigned.rows, openPool: openPool.rows, doneCount: Number(done.rows[0].c), unread: Number(inbox.rows[0].c), devices: devices.rows, threads: threads.rows });
});

// POST /api/tech/diagnose { readings?, description, deviceName? } — AI assist
router.post('/diagnose', authRequired, roleRequired('technician', 'admin'), async (req, res) => {
  const { triageReport, purityScore } = require('../services/ai');
  const { description = '', category = 'leakage', readings = null } = req.body;
  const tri = triageReport({ category, title: description.slice(0, 80), description });
  let extra = '';
  if (readings) {
    const p = purityScore(readings);
    extra = ` Purity check from pasted readings: ${p.score}/100 (${p.grade}). ${p.advice}`;
  }
  const steps = [
    '1. Confirm safety: isolate power/pump, wear boots + gloves.',
    '2. Verify on site: photos, meter reading, pressure test.',
    `3. Likely cause: ${tri.cause}`,
    `4. Carry: ${tri.checklist.join(', ')}`,
    '5. Fix, flush line 2–3 min, re-test flow + pressure, log before/after.',
    '6. Update job to in_progress → resolved with note + advise caretaker on prevention.'
  ];
  res.json({ ...tri, steps, note: tri.note + extra });
});

module.exports = router;
