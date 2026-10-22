// Indian Diabetes Risk Score (IDRS) - Madras Diabetes Research Foundation
const express = require('express');
const db = require('../db');

const router = express.Router();

function scoreIdrs({ age, gender, waist_cm, activity, family_history }) {
  const a = Number(age);
  const w = Number(waist_cm);
  const ageScore = a >= 50 ? 30 : a >= 35 ? 20 : 0;
  const female = gender === 'female';
  const waistScore = female ? (w >= 90 ? 20 : w >= 80 ? 10 : 0) : (w >= 100 ? 20 : w >= 90 ? 10 : 0);
  const activityScore = { vigorous: 0, moderate: 10, mild: 20, sedentary: 30 }[activity] ?? 30;
  const familyScore = { none: 0, one_parent: 10, both_parents: 20 }[family_history] ?? 0;
  const total = ageScore + waistScore + activityScore + familyScore;
  const level = total >= 60 ? 'high' : total >= 30 ? 'moderate' : 'low';
  return { ageScore, waistScore, activityScore, familyScore, total, level };
}

const ADVICE = {
  low: 'Low risk. Keep up an active lifestyle and check your sugar once a year.',
  moderate: 'Moderate risk. Increase daily activity to 30+ minutes, reduce refined carbs and get an HbA1c test this year.',
  high: 'High risk. Please consult a doctor for an Oral Glucose Tolerance Test / HbA1c and start lifestyle changes now.',
};

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM risk_assessments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [req.user.id]
  );
  res.json(rows.map((r) => ({ ...r, advice: ADVICE[r.risk_level] })));
});

router.post('/', async (req, res) => {
  const { age, waist_cm, activity, family_history } = req.body || {};
  if (!age || !waist_cm || !activity || !family_history) return res.status(400).json({ error: 'Answer all four questions' });
  const s = scoreIdrs(req.body);
  const { rows } = await db.query(
    `INSERT INTO risk_assessments (user_id, age_score, waist_score, activity_score, family_score, total_score, risk_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, s.ageScore, s.waistScore, s.activityScore, s.familyScore, s.total, s.level]
  );
  res.status(201).json({ ...rows[0], advice: ADVICE[s.level] });
});

module.exports = router;
module.exports.scoreIdrs = scoreIdrs;
