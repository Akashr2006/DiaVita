const express = require('express');
const db = require('../db');

const router = express.Router();
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// Glycemic Load of a meal: low <= 10, medium 11-19, high >= 20
function glRating(gl) {
  if (gl <= 10) return 'low';
  if (gl < 20) return 'medium';
  return 'high';
}

router.get('/foods', async (req, res) => {
  const q = (req.query.q || '').trim();
  const { rows } = await db.query(
    `SELECT id, name, category, serving, carbs_g::float AS carbs, calories, gi, fiber_g::float AS fiber
     FROM foods WHERE ($1 = '' OR name ILIKE '%' || $1 || '%') ORDER BY category, name`,
    [q]
  );
  res.json(rows);
});

router.get('/', async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 365);
  const { rows } = await db.query(
    `SELECT id, meal_type, items, total_carbs::float AS total_carbs, total_calories,
            glycemic_load::float AS glycemic_load, recorded_at
     FROM meals WHERE user_id = $1 AND recorded_at >= NOW() - ($2 || ' days')::interval
     ORDER BY recorded_at DESC`,
    [req.user.id, days]
  );
  res.json(rows.map((m) => ({ ...m, rating: glRating(m.glycemic_load) })));
});

// Body: { meal_type, items: [{ food_id, qty }] }
router.post('/', async (req, res) => {
  const { meal_type, items, recorded_at } = req.body || {};
  if (!MEAL_TYPES.includes(meal_type)) return res.status(400).json({ error: 'Choose a meal type' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Add at least one food item' });

  const ids = items.map((i) => Number(i.food_id));
  const { rows: foods } = await db.query('SELECT * FROM foods WHERE id = ANY($1::int[])', [ids]);
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));

  let carbs = 0, calories = 0, gl = 0;
  const detailed = [];
  for (const item of items) {
    const f = byId[Number(item.food_id)];
    if (!f) continue;
    const qty = Math.max(Number(item.qty) || 1, 0.5);
    const c = Number(f.carbs_g) * qty;
    const itemGl = (f.gi * c) / 100;
    carbs += c;
    calories += f.calories * qty;
    gl += itemGl;
    detailed.push({ food_id: f.id, name: f.name, serving: f.serving, qty, carbs: +c.toFixed(1),
      calories: Math.round(f.calories * qty), gi: f.gi, gl: +itemGl.toFixed(1) });
  }
  if (!detailed.length) return res.status(400).json({ error: 'Food items not found' });

  const { rows } = await db.query(
    `INSERT INTO meals (user_id, meal_type, items, total_carbs, total_calories, glycemic_load, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
     RETURNING id, meal_type, items, total_carbs::float AS total_carbs, total_calories,
               glycemic_load::float AS glycemic_load, recorded_at`,
    [req.user.id, meal_type, JSON.stringify(detailed), carbs.toFixed(1), Math.round(calories), gl.toFixed(1), recorded_at || null]
  );
  const meal = { ...rows[0], rating: glRating(rows[0].glycemic_load) };

  // Smart swap: suggest a lower-GI alternative in the same category for the highest-GI item
  const worst = [...detailed].sort((a, b) => b.gi - a.gi)[0];
  let swap = null;
  if (worst && worst.gi >= 65) {
    const cat = byId[worst.food_id].category;
    const { rows: alt } = await db.query(
      'SELECT name, gi FROM foods WHERE category = $1 AND gi < $2 AND gi > 0 ORDER BY gi ASC LIMIT 1',
      [cat, worst.gi - 10]
    );
    if (alt[0]) swap = `Try ${alt[0].name} (GI ${alt[0].gi}) instead of ${worst.name} (GI ${worst.gi}) next time.`;
  }
  res.status(201).json({ meal, swap });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.status(204).end();
});

module.exports = router;
module.exports.glRating = glRating;
