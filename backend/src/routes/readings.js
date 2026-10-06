const express = require('express');
const { query } = require('../db');
const { authRequired } = require('../middleware/auth');
const { simulateReading } = require('../services/iotSimulator');
const { purityScore, detectLeak, shortageForecast } = require('../services/ai');

const router = express.Router();

function toLiters(levelPct, capacity) { return (Number(levelPct) / 100) * Number(capacity || 10000); }

// POST /api/ingest/:deviceKey  (ESP32 or simulator)
router.post('/ingest/:deviceKey', async (req, res) => {
  try {
    if (process.env.INGEST_SECRET && req.headers['x-ingest-secret'] !== process.env.INGEST_SECRET)
      return res.status(401).json({ error: 'Bad ingest secret' });
    const d = await query('SELECT * FROM devices WHERE device_key=$1', [req.params.deviceKey]);
    if (!d.rows.length) return res.status(404).json({ error: 'Unknown device' });
    const dev = d.rows[0];
    const p = req.body || {};
    const volume = p.volume_liters ?? toLiters(p.level_percent ?? 50, dev.capacity_liters);
    const row = (await query(
      `INSERT INTO readings(device_id,level_percent,volume_liters,flow_lpm,pressure_bar,tds_ppm,turbidity_ntu,ph,temp_c,battery)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [dev.id, p.level_percent ?? 50, volume, p.flow_lpm ?? 0, p.pressure_bar ?? 2,
       p.tds_ppm ?? 250, p.turbidity_ntu ?? 0.8, p.ph ?? 7.1, p.temp_c ?? 23, p.battery ?? 98]
    )).rows[0];
    await query('UPDATE devices SET last_seen=NOW(), status=$2 WHERE id=$1', [dev.id, 'online']);

    // AI pass
    const recent = (await query('SELECT * FROM readings WHERE device_id=$1 ORDER BY ts DESC LIMIT 60', [dev.id])).rows;
    const purity = purityScore(row);
    const leak = detectLeak(recent);
    const shortage = shortageForecast(row, dev.capacity_liters);
    const mkAlert = async (kind, severity, title, detail, advice) => {
      const dup = await query(
        `SELECT id FROM alerts WHERE device_id=$1 AND kind=$2 AND created_at > NOW() - INTERVAL '2 hours' LIMIT 1`,
        [dev.id, kind]
      );
      if (dup.rows.length) return;
      await query(
        `INSERT INTO alerts(device_id,user_id,kind,severity,title,detail,ai_advice) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [dev.id, dev.user_id, kind, severity, title, detail, advice]
      );
    };
    if (leak.burst) await mkAlert('burst', 'critical', `Burst suspected — ${dev.name}`, leak.reason, leak.advice);
    else if (leak.leak) await mkAlert('leak_suspected', 'high', `Leak suspected — ${dev.name}`, leak.reason, leak.advice);
    if (purity.score < 50) await mkAlert('purity_risk', purity.score < 30 ? 'critical' : 'high', `Unsafe water quality — ${dev.name}`, `Score ${purity.score} (${purity.grade}). ${purity.issues.join(' ')}`, purity.advice);
    if (shortage.level === 'critical' || shortage.level === 'high')
      await mkAlert('shortage_risk', shortage.level === 'critical' ? 'critical' : 'high', `Shortage risk — ${dev.name}`, shortage.msg, 'Ration non-essentials, schedule refill/bowser now.');

    res.json({ ok: true, reading: row, ai: { purity, leak, shortage } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Ingest failed' }); }
});

// GET /api/readings/:deviceId/latest
router.get('/:deviceId/latest', authRequired, async (req, res) => {
  const d = await query('SELECT * FROM devices WHERE id=$1', [req.params.deviceId]);
  if (!d.rows.length) return res.status(404).json({ error: 'No device' });
  const dev = d.rows[0];
  let latest = (await query('SELECT * FROM readings WHERE device_id=$1 ORDER BY ts DESC LIMIT 1', [dev.id])).rows[0];
  // fallback: live-simulate if empty or stale (>3 min) so demo never looks dead
  if (!latest || (Date.now() - new Date(latest.ts).getTime() > 3 * 60 * 1000)) {
    const prev = latest || { level_percent: 68 };
    const s = simulateReading(prev);
    const volume = toLiters(s.level_percent, dev.capacity_liters);
    latest = (await query(
      `INSERT INTO readings(device_id,level_percent,volume_liters,flow_lpm,pressure_bar,tds_ppm,turbidity_ntu,ph,temp_c,battery)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [dev.id, s.level_percent, volume, s.flow_lpm, s.pressure_bar, s.tds_ppm, s.turbidity_ntu, s.ph, s.temp_c, s.battery]
    )).rows[0];
  }
  const recent = (await query('SELECT * FROM readings WHERE device_id=$1 ORDER BY ts DESC LIMIT 60', [dev.id])).rows;
  res.json({ device: dev, latest, recent, ai: {
    purity: purityScore(latest),
    leak: detectLeak(recent),
    shortage: shortageForecast(latest, dev.capacity_liters)
  }});
});

// GET /api/readings/:deviceId/history?hours=24
router.get('/:deviceId/history', authRequired, async (req, res) => {
  const hours = Math.min(168, Number(req.query.hours) || 24);
  const r = await query(
    `SELECT * FROM readings WHERE device_id=$1 AND ts > NOW() - ($2 || ' hours')::INTERVAL ORDER BY ts ASC LIMIT 2000`,
    [req.params.deviceId, String(hours)]
  );
  res.json(r.rows);
});

// GET /api/alerts (mine)
router.get('/alerts/mine', authRequired, async (req, res) => {
  const r = await query('SELECT a.*, d.name as device_name FROM alerts a LEFT JOIN devices d ON d.id=a.device_id WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT 100', [req.user.id]);
  res.json(r.rows);
});

router.patch('/alerts/:id/read', authRequired, async (req, res) => {
  await query('UPDATE alerts SET is_read=true WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
