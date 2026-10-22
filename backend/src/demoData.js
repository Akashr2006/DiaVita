// Generates 14 days of realistic data (glucose, meals, activity, medicines) for one person.
// Glucose rises are simulated from each meal's glycemic load, so Food Fingerprint and the
// Spike Predictor have real patterns to learn from. Each persona reacts to food differently.
const db = require('./db');

const IST_OFFSET = 5.5 * 3600 * 1000;

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

const VOICE_PHRASE = {
  en: (v) => `sugar ${v} after breakfast`,
  ta: (v) => `சர்க்கரை ${v} சாப்பிட்ட பின்`,
  hi: (v) => `शुगर ${v} खाने के बाद`,
};

// The original demo persona (Ravi Kumar). Its numbers match the results reported in the project report:
// sensitivity 2.3 mg/dL per GL unit, walk after lunch lowers the rise by 28 %, seven foods with personal factors.
const DEFAULT_PERSONA = {
  seed: 42,
  fasting: 116, preMeal: 118, bedtime: 118,
  k: 2.3,
  factors: { Idli: 1.4, 'Plain Dosa': 1.3, 'Oats Porridge': 1.25, 'White Rice': 1.1, 'Chapati (Whole Wheat)': 0.75, 'Foxtail Millet Rice': 0.75, 'Ragi Dosa': 0.8 },
  mealOffset: 0,
  noise: 1,
  walkAfterLunch: (day) => day % 3 !== 1,
  walkEffect: 0.72,
  evening: { type: 'yoga', minutes: 25, steps: 0, calories: 70, on: (day) => day % 2 === 0 },
  meds: [['Metformin', '500 mg', 'tablet', '08:00'], ['Metformin', '500 mg', 'tablet', '20:00']],
  missEvery: 5,
  voice: { lang: 'en', on: (day) => day % 4 === 2 },
  notes: { 4: 'Felt sleepy after lunch', 9: 'Walked only 10 minutes, it was raining' },
  lows: {},
};

// Small deterministic PRNG so every run gives the same data
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Replaces one person's logs with 14 days of persona data. Runs inside the caller's transaction.
async function seedUserData(client, userId, persona = DEFAULT_PERSONA, { resetMeds = false } = {}) {
  const p = { ...DEFAULT_PERSONA, ...persona };
  const rand = rng(p.seed);
  const noise = (amp) => Math.round((rand() * 2 - 1) * amp * p.noise);

  const { rows: foodRows } = await client.query('SELECT * FROM foods');
  const foods = Object.fromEntries(foodRows.map((f) => [f.name, f]));
  const buildMeal = (list) => {
    let carbs = 0, calories = 0, gl = 0, personalGl = 0;
    const items = list.map(([name, qty]) => {
      const f = foods[name];
      const c = Number(f.carbs_g) * qty;
      const itemGl = (f.gi * c) / 100;
      carbs += c; calories += f.calories * qty; gl += itemGl;
      personalGl += itemGl * (p.factors[name] || 1);
      return { food_id: f.id, name, serving: f.serving, qty, carbs: +c.toFixed(1), calories: Math.round(f.calories * qty), gi: f.gi, gl: +itemGl.toFixed(1) };
    });
    return { items, carbs: +carbs.toFixed(1), calories: Math.round(calories), gl: +gl.toFixed(1), personalGl };
  };

  const istNow = new Date(Date.now() + IST_OFFSET);
  const at = (daysAgo, h, m) => new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo, h, m) - IST_OFFSET);
  const now = Date.now();

  const readings = []; const meals = []; const acts = [];
  const addReading = (t, v, context, note = null, source = 'manual') => {
    if (t.getTime() > now) return;
    const value = Math.max(55, Math.min(380, v));
    readings.push([value, context, t.toISOString(), note, source]);
  };
  const addMeal = (t, type, list) => {
    const m = buildMeal(list);
    if (t.getTime() <= now) meals.push([type, JSON.stringify(m.items), m.carbs, m.calories, m.gl, t.toISOString()]);
    return m;
  };
  const addAct = (t, type, min, steps, cal) => t.getTime() <= now && acts.push([type, min, steps, cal, t.toISOString()]);

  for (let d = 13; d >= 0; d--) {
    const day = 13 - d;
    const mealDay = day + p.mealOffset;
    const fasting = p.fasting + noise(14);
    addReading(at(d, 7, 0), fasting, 'fasting');

    const bf = addMeal(at(d, 8, 15), 'breakfast', BREAKFASTS[mealDay % BREAKFASTS.length]);
    const afterBf = fasting + p.k * bf.personalGl + noise(8);
    if (p.voice && p.voice.on(day)) {
      // the stored value stays unrounded so the learning results match the non-voice run exactly
      const spoken = Math.round(Math.max(55, Math.min(380, afterBf)));
      addReading(at(d, 10, 0), afterBf, 'post_meal', `Voice: ${VOICE_PHRASE[p.voice.lang](spoken)}`, 'voice');
    } else {
      addReading(at(d, 10, 0), afterBf, 'post_meal');
    }

    const preLunch = p.preMeal + noise(10);
    addReading(at(d, 12, 45), preLunch, 'pre_meal');
    const lunch = addMeal(at(d, 13, 0), 'lunch', LUNCHES[mealDay % LUNCHES.length]);
    const walked = p.walkAfterLunch(day);
    if (walked) addAct(at(d, 13, 25), 'brisk_walking', 20, 2100, 95);
    const lunchRise = p.k * lunch.personalGl * (walked ? p.walkEffect : 1);
    addReading(at(d, 14, 45), preLunch + lunchRise + noise(10), 'post_meal', p.notes[day] || null);

    if (p.evening && p.evening.on(day)) addAct(at(d, 18, 0), p.evening.type, p.evening.minutes, p.evening.steps, p.evening.calories);

    const dinner = addMeal(at(d, 20, 30), 'dinner', DINNERS[mealDay % DINNERS.length]);
    const bedtime = p.bedtime + p.k * dinner.personalGl + noise(8);
    if (p.lows[day]) addReading(at(d, 22, 0), p.lows[day], 'bedtime', 'Felt shaky, took 3 glucose tablets');
    else addReading(at(d, 22, 0), bedtime, 'bedtime');
  }

  for (const t of ['glucose_readings', 'meals', 'activities', 'medication_logs']) {
    await client.query(`DELETE FROM ${t} WHERE user_id = $1`, [userId]);
  }
  if (resetMeds) await client.query('DELETE FROM medications WHERE user_id = $1', [userId]);

  await client.query(
    `INSERT INTO glucose_readings (user_id, value_mgdl, context, recorded_at, note, source)
     SELECT $1, * FROM unnest($2::numeric[], $3::text[], $4::timestamptz[], $5::text[], $6::text[])`,
    [userId, ...[0, 1, 2, 3, 4].map((i) => readings.map((r) => r[i]))]
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
    for (const [name, dosage, type, time] of p.meds) {
      await client.query(
        'INSERT INTO medications (user_id, name, dosage, med_type, schedule_time) VALUES ($1, $2, $3, $4, $5)',
        [userId, name, dosage, type, time]
      );
    }
  }
  await client.query(
    `INSERT INTO medication_logs (medication_id, user_id, taken_on, taken_at)
     SELECT m.id, $1, d::date, d::date + m.schedule_time
     FROM medications m, generate_series(${db.TODAY} - 13, ${db.TODAY} - 1, '1 day') d
     WHERE m.user_id = $1 AND m.active = TRUE AND (EXTRACT(DAY FROM d)::int % $2) <> 0
     ON CONFLICT DO NOTHING`,
    [userId, p.missEvery]
  );
  return { readings: readings.length, meals: meals.length, activities: acts.length };
}

module.exports = { seedUserData, DEFAULT_PERSONA };
