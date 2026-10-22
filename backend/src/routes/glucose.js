const express = require('express');
const db = require('../db');

const router = express.Router();
const CONTEXTS = ['fasting', 'pre_meal', 'post_meal', 'bedtime', 'random'];

router.get('/', async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
  const { rows } = await db.query(
    `SELECT id, value_mgdl::float AS value, context, note, recorded_at
     FROM glucose_readings
     WHERE user_id = $1 AND recorded_at >= NOW() - ($2 || ' days')::interval
     ORDER BY recorded_at DESC`,
    [req.user.id, days]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { value, context = 'random', note, recorded_at } = req.body || {};
  const v = Number(value);
  if (!v || v < 20 || v > 600) return res.status(400).json({ error: 'Glucose value must be between 20 and 600 mg/dL' });
  if (!CONTEXTS.includes(context)) return res.status(400).json({ error: 'Invalid reading type' });
  const { rows } = await db.query(
    `INSERT INTO glucose_readings (user_id, value_mgdl, context, note, recorded_at)
     VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
     RETURNING id, value_mgdl::float AS value, context, note, recorded_at`,
    [req.user.id, v, context, note || null, recorded_at || null]
  );
  const reading = rows[0];
  // Instant safety feedback for the reading just logged
  let alert = null;
  if (v < 70) alert = { level: 'danger', message: 'Low sugar (hypoglycemia). Follow the 15-15 rule: take 15 g fast sugar (3 glucose tablets / 150 ml juice), recheck after 15 minutes.' };
  else if (v > 250) alert = { level: 'danger', message: 'Very high sugar. Drink water, avoid exercise if unwell, and contact your doctor if it stays above 250 mg/dL.' };
  else if (v > 180) alert = { level: 'warning', message: 'Above target. A 10–15 minute walk after meals can help bring it down.' };
  res.status(201).json({ reading, alert });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM glucose_readings WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.status(204).end();
});

module.exports = router;
