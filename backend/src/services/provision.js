const crypto = require('crypto');
const { query } = require('../db');
const { simulateReading } = require('./iotSimulator');

// Gives a brand-new account a living dashboard: one demo device plus
// 48 backfilled readings (24h at 30-min steps) so charts, analytics,
// briefings and alerts all work from the first sign-in.
async function provisionDemoDevice(userId, name = 'Main Roof Tank', site = 'Main Building', cap = 10000) {
  const key = 'MS-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const dev = (await query(
    `INSERT INTO devices(user_id,name,site,device_key,capacity_liters,lat,lng)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, name, site, key, cap, -1.2921, 36.8219]
  )).rows[0];
  let prev = { level_percent: 70 };
  for (let i = 48; i >= 0; i--) {
    const s = simulateReading(prev);
    prev = s;
    const vol = (Number(s.level_percent) / 100) * cap;
    await query(
      `INSERT INTO readings(device_id,ts,level_percent,volume_liters,flow_lpm,pressure_bar,tds_ppm,turbidity_ntu,ph,temp_c,battery)
       VALUES($1, NOW() - ($2 || ' minutes')::INTERVAL,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [dev.id, String(i * 30), s.level_percent, vol, s.flow_lpm, s.pressure_bar, s.tds_ppm, s.turbidity_ntu, s.ph, s.temp_c, s.battery]
    );
  }
  return dev;
}

module.exports = { provisionDemoDevice };
