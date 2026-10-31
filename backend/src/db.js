const { Pool } = require('pg');
require('dotenv').config();

// DiaVita stores all data in Neon (serverless PostgreSQL). Nothing is kept in a local database.
const url = process.env.DATABASE_URL || '';
if (!/\.neon\.tech\//.test(url)) {
  console.error('DATABASE_URL must be your Neon connection string (Neon Console -> Connect -> Node.js). See backend/.env.example.');
  process.exit(1);
}

// Neon only accepts encrypted connections; the certificate is always verified
const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Postgres pool error:', err.message));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  // shown by /api/health, e.g. "Neon PostgreSQL (ap-southeast-1)"
  provider: `Neon PostgreSQL (${(url.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech/) || [])[1] || 'cloud'})`,
};

// "Today" in the user's local timezone (Neon servers run in UTC)
const APP_TZ = (process.env.APP_TZ || 'Asia/Kolkata').replace(/[^A-Za-z_/]/g, '');
module.exports.TODAY = `(NOW() AT TIME ZONE '${APP_TZ}')::date`;
module.exports.LOCAL = (col) => `(${col} AT TIME ZONE '${APP_TZ}')`;
