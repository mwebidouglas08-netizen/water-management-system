const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/devices (own devices; admin/tech see more via admin routes)
router.get('/', authRequired, async (req, res) => {
  const r = await query('SELECT * FROM devices WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  // admin sees all
  if (req.user.role === 'admin') {
    const all = await query('SELECT d.*, u.name as owner FROM devices d LEFT JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC LIMIT 200');
    return res.json(all.rows);
  }
  res.json(r.rows);
});

// POST /api/devices
router.post('/', authRequired, async (req, res) => {
  const { name, site = 'Main Tank', type = 'tank-node', capacity_liters = 10000, lat = 0, lng = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'Device name required' });
  const key = 'MS-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const r = await query(
    `INSERT INTO devices(user_id,name,site,device_key,type,capacity_liters,lat,lng)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, name, site, key, type, capacity_liters, lat, lng]
  );
  res.status(201).json(r.rows[0]);
});

// DELETE /api/devices/:id
router.delete('/:id', authRequired, async (req, res) => {
  if (req.user.role === 'admin') await query('DELETE FROM devices WHERE id=$1', [req.params.id]);
  else await query('DELETE FROM devices WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
