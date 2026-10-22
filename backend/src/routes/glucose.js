const express = require('express');
const db = require('../db');

const router = express.Router();
const CONTEXTS = ['fasting', 'pre_meal', 'post_meal', 'bedtime', 'random'];
const SOURCES = ['manual', 'voice'];

router.get('/', async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
  // After-meal readings carry the meal eaten in the 3 hours before them (the pair Food Fingerprint learns from)
  const { rows } = await db.query(
    `SELECT g.id, g.value_mgdl::float AS value, g.context, g.note, g.source, g.recorded_at,
            m.meal_type, m.glycemic_load::float AS meal_gl,
            (SELECT string_agg(i->>'name', ', ') FROM jsonb_array_elements(m.items) i) AS meal_foods,
            ROUND(EXTRACT(EPOCH FROM (g.recorded_at - m.recorded_at)) / 60)::int AS minutes_after_meal
     FROM glucose_readings g
     LEFT JOIN LATERAL (
       SELECT meal_type, glycemic_load, items, recorded_at FROM meals
       WHERE user_id = g.user_id AND g.context = 'post_meal'
         AND recorded_at BETWEEN g.recorded_at - INTERVAL '3 hours' AND g.recorded_at
       ORDER BY recorded_at DESC LIMIT 1
     ) m ON TRUE
     WHERE g.user_id = $1 AND g.recorded_at >= NOW() - ($2 || ' days')::interval
     ORDER BY g.recorded_at DESC`,
    [req.user.id, days]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { value, context = 'random', note, recorded_at, source = 'manual' } = req.body || {};
  const v = Number(value);
  if (!v || v < 20 || v > 600) return res.status(400).json({ error: 'Glucose value must be between 20 and 600 mg/dL' });
  if (!CONTEXTS.includes(context)) return res.status(400).json({ error: 'Invalid reading type' });
  if (!SOURCES.includes(source)) return res.status(400).json({ error: 'Invalid reading source' });
  const { rows } = await db.query(
    `INSERT INTO glucose_readings (user_id, value_mgdl, context, note, source, recorded_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
     RETURNING id, value_mgdl::float AS value, context, note, source, recorded_at`,
    [req.user.id, v, context, note || null, source, recorded_at || null]
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
