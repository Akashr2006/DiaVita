const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Copy .env.example to .env and paste your Neon connection string.');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

// Neon requires SSL; the connection string from the Neon console already has sslmode=require.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Postgres pool error:', err.message));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};

// "Today" in the user's local timezone (Neon servers run in UTC)
const APP_TZ = (process.env.APP_TZ || 'Asia/Kolkata').replace(/[^A-Za-z_/]/g, '');
module.exports.TODAY = `(NOW() AT TIME ZONE '${APP_TZ}')::date`;
module.exports.LOCAL = (col) => `(${col} AT TIME ZONE '${APP_TZ}')`;
