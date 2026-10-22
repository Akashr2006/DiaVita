// Creates six dummy patients, each with 14 days of their own glucose, meal, activity and medicine data.
// Safe to run again: existing patients are updated and their logs are regenerated.
// Usage: npm run db:seed   (all patients log in with the password demo1234)
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { seedUserData, DEFAULT_PERSONA } = require('./demoData');
const { scoreIdrs } = require('./routes/risk');

const PASSWORD = 'demo1234';

const PATIENTS = [
  {
    profile: { name: 'Ravi Kumar', email: 'demo@diavita.app', age: 52, gender: 'male', diabetes_type: 'type2', height_cm: 170, weight_kg: 78, waist_cm: 96, target_min: 70, target_max: 180, daily_carb_goal: 180, daily_step_goal: 7000 },
    persona: DEFAULT_PERSONA,
    risk: { activity: 'mild', family_history: 'one_parent' },
  },
  {
    profile: { name: 'Lakshmi Narayanan', email: 'lakshmi@diavita.app', age: 58, gender: 'female', diabetes_type: 'type2', height_cm: 155, weight_kg: 68, waist_cm: 92, target_min: 80, target_max: 180, daily_carb_goal: 160, daily_step_goal: 6000 },
    persona: {
      seed: 7, fasting: 128, preMeal: 124, bedtime: 126, k: 2.6, mealOffset: 1,
      factors: { 'White Rice': 1.25, Idli: 1.2, 'Ven Pongal': 1.3, 'Ragi Dosa': 0.8, 'Foxtail Millet Rice': 0.85 },
      walkAfterLunch: (day) => day % 2 === 0, walkEffect: 0.75,
      evening: { type: 'walking', minutes: 30, steps: 3200, calories: 110, on: (day) => day % 3 !== 2 },
      meds: [['Metformin', '500 mg', 'tablet', '08:00'], ['Glimepiride', '1 mg', 'tablet', '08:00'], ['Metformin', '500 mg', 'tablet', '20:00']],
      missEvery: 6,
      voice: { lang: 'ta', on: (day) => day % 3 === 0 },
      notes: { 2: 'Temple prasadam after lunch', 10: 'Relatives visited, ate sweets' },
    },
    risk: { activity: 'mild', family_history: 'both_parents' },
  },
  {
    profile: { name: 'Arjun Mehta', email: 'arjun@diavita.app', age: 34, gender: 'male', diabetes_type: 'type1', height_cm: 178, weight_kg: 72, waist_cm: 84, target_min: 70, target_max: 180, daily_carb_goal: 200, daily_step_goal: 9000 },
    persona: {
      seed: 99, fasting: 134, preMeal: 128, bedtime: 130, k: 3.1, noise: 1.7, mealOffset: 3,
      factors: { 'Veg Biryani': 1.3, 'White Rice': 1.15, 'Oats Porridge': 0.85, 'Brown Rice': 0.9 },
      walkAfterLunch: (day) => day % 4 === 0, walkEffect: 0.7,
      evening: { type: 'gym', minutes: 45, steps: 0, calories: 320, on: (day) => day % 2 === 1 },
      meds: [['Insulin Aspart', '6 units', 'insulin', '08:00'], ['Insulin Aspart', '8 units', 'insulin', '13:00'], ['Insulin Glargine', '18 units', 'insulin', '22:00']],
      missEvery: 7,
      voice: { lang: 'en', on: (day) => day % 5 === 1 },
      notes: { 6: 'Took lunch insulin 30 minutes late' },
      lows: { 3: 64, 11: 61 },
    },
    risk: null, // the risk score screens for type 2 diabetes, so it is not used for type 1
  },
  {
    profile: { name: 'Fathima Begum', email: 'fathima@diavita.app', age: 46, gender: 'female', diabetes_type: 'prediabetes', height_cm: 160, weight_kg: 74, waist_cm: 90, target_min: 70, target_max: 140, daily_carb_goal: 150, daily_step_goal: 8000 },
    persona: {
      seed: 2024, fasting: 104, preMeal: 102, bedtime: 108, k: 1.8, mealOffset: 2,
      factors: { 'Veg Biryani': 1.35, 'Plain Dosa': 1.15, 'Chapati (Whole Wheat)': 0.8, 'Dal (Lentils)': 0.85 },
      walkAfterLunch: (day) => day % 3 !== 0, walkEffect: 0.7,
      evening: { type: 'walking', minutes: 30, steps: 3400, calories: 120, on: () => true },
      meds: [],
      voice: { lang: 'en', on: (day) => day % 4 === 3 },
      notes: { 7: 'Had biryani at a wedding' },
    },
    risk: { activity: 'moderate', family_history: 'one_parent' },
  },
  {
    profile: { name: 'Suresh Babu', email: 'suresh@diavita.app', age: 63, gender: 'male', diabetes_type: 'type2', height_cm: 165, weight_kg: 70, waist_cm: 98, target_min: 70, target_max: 180, daily_carb_goal: 170, daily_step_goal: 5000 },
    persona: {
      seed: 555, fasting: 142, preMeal: 136, bedtime: 138, k: 2.8, mealOffset: 4,
      factors: { 'Plain Dosa': 1.35, 'Ven Pongal': 1.25, Poha: 1.2, 'Chapati (Whole Wheat)': 0.8 },
      walkAfterLunch: (day) => day % 4 === 0, walkEffect: 0.78,
      evening: { type: 'walking', minutes: 20, steps: 2000, calories: 70, on: (day) => day % 3 === 0 },
      meds: [['Metformin', '1000 mg', 'tablet', '08:00'], ['Metformin', '1000 mg', 'tablet', '20:00'], ['Atorvastatin', '10 mg', 'other', '21:00']],
      missEvery: 3,
      voice: { lang: 'ta', on: (day) => day % 2 === 1 },
      notes: { 3: 'Forgot the morning tablet', 12: 'Knee pain, no walk today' },
      lows: { 8: 66 },
    },
    risk: { activity: 'sedentary', family_history: 'one_parent' },
  },
  {
    profile: { name: 'Priya Sharma', email: 'priya@diavita.app', age: 29, gender: 'female', diabetes_type: 'gestational', height_cm: 162, weight_kg: 64, waist_cm: 82, target_min: 70, target_max: 140, daily_carb_goal: 150, daily_step_goal: 7000 },
    persona: {
      seed: 314, fasting: 92, preMeal: 96, bedtime: 102, k: 1.9, noise: 0.8, mealOffset: 5,
      factors: { Poha: 1.2, 'Oats Porridge': 0.8, 'White Rice': 1.1 },
      walkAfterLunch: (day) => day % 3 !== 2, walkEffect: 0.7,
      evening: { type: 'yoga', minutes: 20, steps: 0, calories: 55, on: (day) => day % 2 === 0 },
      meds: [['Prenatal vitamin', '1 tablet', 'other', '09:00']],
      missEvery: 8,
      voice: { lang: 'hi', on: (day) => day % 3 === 1 },
      notes: { 6: 'Mild nausea in the morning' },
    },
    risk: null, // gestational diabetes is screened by the doctor, not by the risk score
  },
];

const COLS = ['name', 'email', 'age', 'gender', 'diabetes_type', 'height_cm', 'weight_kg', 'waist_cm', 'target_min', 'target_max', 'daily_carb_goal', 'daily_step_goal'];

async function upsertUser(client, profile, hash) {
  const values = COLS.map((c) => profile[c]);
  const { rows } = await client.query(
    `INSERT INTO users (${COLS.join(', ')}, password_hash)
     VALUES (${COLS.map((_, i) => `$${i + 1}`).join(', ')}, $${COLS.length + 1})
     ON CONFLICT (email) DO UPDATE SET ${COLS.filter((c) => c !== 'email').map((c) => `${c} = EXCLUDED.${c}`).join(', ')}
     RETURNING id`,
    [...values, hash]
  );
  return rows[0].id;
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const summary = [];
  for (const { profile, persona, risk } of PATIENTS) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = await upsertUser(client, profile, hash);
      const counts = await seedUserData(client, id, persona, { resetMeds: true });
      await client.query('DELETE FROM risk_assessments WHERE user_id = $1', [id]);
      if (risk) {
        const s = scoreIdrs({ ...profile, ...risk });
        await client.query(
          `INSERT INTO risk_assessments (user_id, age_score, waist_score, activity_score, family_score, total_score, risk_level)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, s.ageScore, s.waistScore, s.activityScore, s.familyScore, s.total, s.level]
        );
      }
      await client.query('COMMIT');
      summary.push({ id, name: profile.name, email: profile.email, type: profile.diabetes_type, ...counts });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  console.table(summary);
  console.log(`All patients log in with the password "${PASSWORD}".`);
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
