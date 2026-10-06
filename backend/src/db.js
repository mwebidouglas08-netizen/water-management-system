const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : undefined
});

pool.on('error', (err) => console.error('[db] pool error', err.message));

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
