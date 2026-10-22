// Loads 14 days of realistic demo data for the logged-in user (for project reviews and demos).
const express = require('express');
const db = require('../db');
const { seedUserData } = require('../demoData');

const router = express.Router();

router.post('/seed', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const counts = await seedUserData(client, req.user.id);
    await client.query('COMMIT');
    res.status(201).json(counts);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
