require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const { simulateReading } = require('./services/iotSimulator');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('[seed] schema ok');

  const users = [
    { name: 'Amina Admin', email: 'admin@majisafe.ke', pw: 'Admin123!', role: 'admin', org: 'MajiSafe HQ', loc: 'Nairobi' },
    { name: 'David Mwangi', email: 'tech@majisafe.ke', pw: 'Tech123!', role: 'technician', org: 'Ruiru Water Technicians', loc: 'Ruiru, Kiambu' },
    { name: 'Greenhill School', email: 'school@majisafe.ke', pw: 'User123!', role: 'user', org: 'Greenhill Academy', loc: 'Githurai, Nairobi' },
  ];
  const ids = {};
  for (const u of users) {
    const h = await bcrypt.hash(u.pw, 10);
    const r = await pool.query(
      `INSERT INTO users(name,email,password_hash,role,org_name,location,status)
       VALUES($1,$2,$3,$4,$5,$6,'active')
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role, status='active'
       RETURNING id,email`,
      [u.name, u.email, h, u.role, u.org, u.loc]
    );
    ids[u.email] = r.rows[0].id;
  }
  console.log('[seed] users ok', ids);

  const devs = [
    { user: 'school@majisafe.ke', name: 'Main Roof Tank', site: 'Block A Roof', cap: 10000 },
    { user: 'school@majisafe.ke', name: 'Borehole Storage', site: 'Borehole Yard', cap: 5000 },
  ];
  for (const d of devs) {
    const key = 'MS-' + Math.random().toString(16).slice(2, 6).toUpperCase() + Math.random().toString(16).slice(2, 6).toUpperCase();
    const r = await pool.query(
      `INSERT INTO devices(user_id,name,site,device_key,capacity_liters,lat,lng)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,device_key`,
      [ids[d.user], d.name, d.site, key, d.cap, -1.2921, 36.8219]
    );
    // 48 sample readings
    let prev = { level_percent: 70 };
    for (let i = 48; i >= 0; i--) {
      const s = simulateReading(prev);
      prev = s;
      const vol = (s.level_percent / 100) * d.cap;
      await pool.query(
        `INSERT INTO readings(device_id,ts,level_percent,volume_liters,flow_lpm,pressure_bar,tds_ppm,turbidity_ntu,ph,temp_c,battery)
         VALUES($1, NOW() - ($2 || ' minutes')::INTERVAL,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r.rows[0].id, String(i * 30), s.level_percent, vol, s.flow_lpm, s.pressure_bar, s.tds_ppm, s.turbidity_ntu, s.ph, s.temp_c, s.battery]
      );
    }
    console.log('[seed] device', d.name, r.rows[0].device_key);
  }
  await pool.end();
  console.log('[seed] DONE. Login: admin@majisafe.ke/Admin123! tech@majisafe.ke/Tech123! school@majisafe.ke/User123!');
}
run().catch(e => { console.error(e); process.exit(1); });
