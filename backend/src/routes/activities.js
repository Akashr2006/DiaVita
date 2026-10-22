const express = require('express');
const db = require('../db');

const router = express.Router();

// Approximate MET values used to estimate calories burned
const MET = { walking: 3.5, brisk_walking: 4.3, jogging: 7, cycling: 6, yoga: 2.5, swimming: 6, gym: 5, dance: 4.5, sports: 6 };

router.get('/', async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 365);
  const { rows } = await db.query(
    `SELECT id, activity_type, duration_min, steps, calories_burned, recorded_at
     FROM activities WHERE user_id = $1 AND recorded_at >= NOW() - ($2 || ' days')::interval
     ORDER BY recorded_at DESC`,
    [req.user.id, days]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { activity_type, duration_min, steps, recorded_at } = req.body || {};
  const minutes = parseInt(duration_min, 10);
  if (!MET[activity_type]) return res.status(400).json({ error: 'Choose an activity type' });
  if (!minutes || minutes <= 0 || minutes > 600) return res.status(400).json({ error: 'Duration must be 1–600 minutes' });

  const { rows: u } = await db.query('SELECT weight_kg FROM users WHERE id = $1', [req.user.id]);
  const weight = Number(u[0]?.weight_kg) || 65;
  const calories = Math.round((MET[activity_type] * 3.5 * weight / 200) * minutes);
  const estSteps = steps ? parseInt(steps, 10) : (['walking', 'brisk_walking', 'jogging'].includes(activity_type) ? minutes * 100 : 0);

  const { rows } = await db.query(
    `INSERT INTO activities (user_id, activity_type, duration_min, steps, calories_burned, recorded_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
     RETURNING id, activity_type, duration_min, steps, calories_burned, recorded_at`,
    [req.user.id, activity_type, minutes, estSteps, calories, recorded_at || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM activities WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.status(204).end();
});

module.exports = router;
