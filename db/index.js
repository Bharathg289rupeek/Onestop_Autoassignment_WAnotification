const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

async function initDB() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('[DB] Schema initialized');

  // ~1279 rows, ON CONFLICT DO NOTHING — cheap and safe to re-run every boot.
  const pincodeSeed = fs.readFileSync(path.join(__dirname, 'pincode_city_seed.sql'), 'utf8');
  await pool.query(pincodeSeed);
  console.log('[DB] Pincode-city map seeded');
}

module.exports = { pool, initDB };
