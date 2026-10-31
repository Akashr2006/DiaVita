// Runs the DiaVita API on a normal server (your laptop, Render, any VM)
const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`DiaVita API running on http://localhost:${PORT} · database: ${db.provider}`));
