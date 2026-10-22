// Loads 14 days of realistic demo data for the logged-in user (for project reviews and demos).
// Glucose rises are simulated from each meal's glycemic load, so Food Fingerprint and the
// Spike Predictor have real patterns to learn from.
const express = require('express');
const db = require('../db');

const router = express.Router();

const IST_OFFSET = 5.5 * 3600 * 1000;
const TRUE_K = 2.3; // simulated personal sensitivity (mg/dL per GL unit)
// Simulated persona: like real people (Zeevi et al., Cell 2015) this user reacts to some foods
// more or less than their GI suggests. Food Fingerprint should rediscover these factors.
const PERSONAL_FACTOR = {
  Idli: 1.4, 'Plain Dosa': 1.3, 'Oats Porridge': 1.25, 'White Rice': 1.1,
  'Chapati (Whole Wheat)': 0.75, 'Foxtail Millet Rice': 0.75, 'Ragi Dosa': 0.8,
};

const BREAKFASTS = [
  [['Idli', 1], ['Sambar', 0.5]], [['Plain Dosa', 1], ['Sambar', 0.5]], [['Oats Porridge', 1], ['Boiled Egg', 1]],
  [['Ragi Dosa', 1], ['Sambar', 0.5]], [['Poha', 1], ['Tea with Sugar', 1]], [['Ven Pongal', 1]],
];
const LUNCHES = [
  [['White Rice', 1.5], ['Sambar', 1], ['Curd', 0.5]], [['Chapati (Whole Wheat)', 2], ['Dal (Lentils)', 1]],
  [['Foxtail Millet Rice', 1.5], ['Sambar', 1]], [['Veg Biryani', 1.5], ['Curd', 0.5]],
  [['Brown Rice', 1.5], ['Dal (Lentils)', 0.5]], [['White Rice', 1], ['Chicken Curry', 1], ['Vegetable Salad', 1]],
];
const DINNERS = [
  [['Chapati (Whole Wheat)', 2], ['Paneer', 0.5]], [['Idli', 1], ['Sambar', 1]],
  [['Plain Dosa', 1], ['Sambar', 0.5]], [['Chapati (Whole Wheat)', 2], ['Dal (Lentils)', 0.5]],
];

// Small deterministic PRNG so every demo looks the same
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

router.post('/seed', async (req, res) => {
  const userId = req.user.id;
  const rand = rng(42);
  const noise = (amp) => Math.round((rand() * 2 - 1) * amp);

  const { rows: foodRows } = await db.query('SELECT * FROM foods');
  const foods = Object.fromEntries(foodRows.map((f) => [f.name, f]));
  const buildMeal = (list) => {
    let carbs = 0, calories = 0, gl = 0, personalGl = 0;
    const items = list.map(([name, qty]) => {
      const f = foods[name];
      const c = Number(f.carbs_g) * qty;
      const itemGl = (f.gi * c) / 100;
      carbs += c; calories += f.calories * qty; gl += itemGl;
      personalGl += itemGl * (PERSONAL_FACTOR[name] || 1);
      return { food_id: f.id, name, serving: f.serving, qty, carbs: +c.toFixed(1), calories: Math.round(f.calories * qty), gi: f.gi, gl: +itemGl.toFixed(1) };
    });
    return { items, carbs: +carbs.toFixed(1), calories: Math.round(calories), gl: +gl.toFixed(1), personalGl };
  };

  const istNow = new Date(Date.now() + IST_OFFSET);
  const at = (daysAgo, h, m) => new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo, h, m) - IST_OFFSET);
  const now = Date.now();

  const readings = []; const meals = []; const acts = [];
  const addReading = (t, v, context) => t.getTime() <= now && readings.push([Math.max(55, Math.min(380, v)), context, t.toISOString()]);
  const addMeal = (t, type, list) => {
    const m = buildMeal(list);
    if (t.getTime() <= now) meals.push([type, JSON.stringify(m.items), m.carbs, m.calories, m.gl, t.toISOString()]);
    return m;
  };
  const addAct = (t, type, min, steps, cal) => t.getTime() <= now && acts.push([type, min, steps, cal, t.toISOString()]);

  for (let d = 13; d >= 0; d--) {
    const day = 13 - d;
    const fasting = 116 + noise(14);
    addReading(at(d, 7, 0), fasting, 'fasting');

    const bf = addMeal(at(d, 8, 15), 'breakfast', BREAKFASTS[day % BREAKFASTS.length]);
    addReading(at(d, 10, 0), fasting + TRUE_K * bf.personalGl + noise(8), 'post_meal');

    const preLunch = 118 + noise(10);
    addReading(at(d, 12, 45), preLunch, 'pre_meal');
    const lunch = addMeal(at(d, 13, 0), 'lunch', LUNCHES[day % LUNCHES.length]);
    const walked = day % 3 !== 1; // walks after lunch on 2 of every 3 days
    if (walked) addAct(at(d, 13, 25), 'brisk_walking', 20, 2100, 95);
    const lunchRise = TRUE_K * lunch.personalGl * (walked ? 0.72 : 1);
    addReading(at(d, 14, 45), preLunch + lunchRise + noise(10), 'post_meal');

    if (day % 2 === 0) addAct(at(d, 18, 0), 'yoga', 25, 0, 70);

    const dinner = addMeal(at(d, 20, 30), 'dinner', DINNERS[day % DINNERS.length]);
    addReading(at(d, 22, 0), 118 + TRUE_K * dinner.personalGl + noise(8), 'bedtime');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of ['glucose_readings', 'meals', 'activities', 'medication_logs']) {
      await client.query(`DELETE FROM ${t} WHERE user_id = $1`, [userId]);
    }
    await client.query(
      `INSERT INTO glucose_readings (user_id, value_mgdl, context, recorded_at)
       SELECT $1, * FROM unnest($2::numeric[], $3::text[], $4::timestamptz[])`,
      [userId, readings.map((r) => r[0]), readings.map((r) => r[1]), readings.map((r) => r[2])]
    );
    await client.query(
      `INSERT INTO meals (user_id, meal_type, items, total_carbs, total_calories, glycemic_load, recorded_at)
       SELECT $1, * FROM unnest($2::text[], $3::jsonb[], $4::numeric[], $5::int[], $6::numeric[], $7::timestamptz[])`,
      [userId, ...[0, 1, 2, 3, 4, 5].map((i) => meals.map((m) => m[i]))]
    );
    await client.query(
      `INSERT INTO activities (user_id, activity_type, duration_min, steps, calories_burned, recorded_at)
       SELECT $1, * FROM unnest($2::text[], $3::int[], $4::int[], $5::int[], $6::timestamptz[])`,
      [userId, ...[0, 1, 2, 3, 4].map((i) => acts.map((a) => a[i]))]
    );
    const { rows: meds } = await client.query('SELECT id FROM medications WHERE user_id = $1 AND active = TRUE', [userId]);
    if (!meds.length) {
      await client.query(
        `INSERT INTO medications (user_id, name, dosage, med_type, schedule_time) VALUES
         ($1, 'Metformin', '500 mg', 'tablet', '08:00'), ($1, 'Metformin', '500 mg', 'tablet', '20:00')`,
        [userId]
      );
    }
    await client.query(
      `INSERT INTO medication_logs (medication_id, user_id, taken_on, taken_at)
       SELECT m.id, $1, d::date, d::date + m.schedule_time
       FROM medications m, generate_series(${db.TODAY} - 13, ${db.TODAY} - 1, '1 day') d
       WHERE m.user_id = $1 AND m.active = TRUE AND (EXTRACT(DAY FROM d)::int % 5) <> 0
       ON CONFLICT DO NOTHING`,
      [userId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.status(201).json({ readings: readings.length, meals: meals.length, activities: acts.length });
});

module.exports = router;
