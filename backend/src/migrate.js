// Creates all tables in Neon and seeds the food library.
// Usage: npm run db:migrate
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  await pool.query(sql);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM foods');
  console.log(`Migration complete. Food library has ${rows[0].count} items.`);
}

if (require.main === module) {
  migrate()
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = migrate;
