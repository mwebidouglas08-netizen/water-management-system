#!/usr/bin/env node
/**
 * Prints exactly what the app will do with the database it is configured with.
 *
 *   cd backend && node scripts/check-db.js
 *   DATABASE_URL=postgres://… node scripts/check-db.js
 *
 * Runs on Render's shell (inside the network) or locally. It never prints the
 * password. Use it when sign-in says "database unavailable" — it names the
 * cause instead of leaving you to guess.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('dotenv').config();

const { Client } = require('pg');

const RAW = (process.env.DATABASE_URL || '').trim();

function maskUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

function sslFor(url) {
  const { resolveSslOptions } = require('../src/db');
  return resolveSslOptions(url);
}

(async () => {
  console.log('MajiSafe database check');
  console.log('-----------------------');
  if (!RAW) {
    console.error('DATABASE_URL is not set. Render → your service → Environment → add DATABASE_URL.');
    process.exit(1);
  }
  console.log('DATABASE_URL :', maskUrl(RAW));
  const u = new URL(RAW);
  console.log('host         :', u.hostname);
  console.log('database     :', u.pathname.replace(/^\//, ''));
  console.log('user         :', u.username);
  console.log('sslmode      :', u.searchParams.get('sslmode') || '(none in URL)');
  if (/^dpg-[a-z0-9]+-a$/i.test(u.hostname)) {
    console.log('NOTE         : this is Render\'s INTERNAL hostname. It only resolves inside');
    console.log('               Render, for a service the database is attached to.');
  }
  console.log('ssl          :', JSON.stringify(sslFor(RAW)));

  const client = new Client({
    connectionString: RAW,
    ssl: sslFor(RAW),
    connectionTimeoutMillis: 20000
  });
  client.on('error', (e) => console.error('client error:', e.code || '', e.message));

  const t0 = Date.now();
  try {
    await client.connect();
    console.log('\nCONNECTED in', Date.now() - t0, 'ms');
    const v = await client.query('SELECT version() v, current_database() d, current_user u');
    console.log('server       :', String(v.rows[0].v).split(',')[0]);
    console.log('database     :', v.rows[0].d, '| user:', v.rows[0].u);

    const t = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"
    );
    const names = t.rows.map((r) => r.table_name);
    console.log('tables       :', names.join(', ') || '(none — run: npm run migrate)');

    if (names.includes('users')) {
      const c = await client.query('SELECT count(*)::int c FROM users');
      console.log('users        :', c.rows[0].c, 'row(s)');
    }
    console.log('\nRESULT: the app can use this database.');
    await client.end();
  } catch (e) {
    const { explainDbFailure } = require('../src/db');
    console.error('\nFAILED:', e.code || 'ERR', '-', e.message);
    console.error('cause :', explainDbFailure(e));
    console.error('\nRESULT: the app cannot use this database yet.');
    try { await client.end(); } catch { /* ignore */ }
    process.exit(1);
  }
})();
