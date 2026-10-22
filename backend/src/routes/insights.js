// Smart insights engine: turns logged data into scores, trends and personalised tips
const express = require('express');
const db = require('../db');
const { TODAY, LOCAL } = db;

const router = express.Router();

const round = (n, d = 0) => (n === null || n === undefined ? null : Number(Number(n).toFixed(d)));

// Estimated HbA1c (ADAG formula): eA1c = (average glucose + 46.7) / 28.7
const estimateA1c = (avg) => (avg ? round((avg + 46.7) / 28.7, 1) : null);

async function buildSummary(userId) {
  const { rows: [user] } = await db.query(
    'SELECT name, target_min, target_max, daily_carb_goal, daily_step_goal FROM users WHERE id = $1', [userId]);
  const { target_min: lo, target_max: hi } = user;

  const [g7, g30, byCtx, latest, meals, act, meds, trend] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS count, AVG(value_mgdl)::float AS avg, MIN(value_mgdl)::float AS min, MAX(value_mgdl)::float AS max,
              COUNT(*) FILTER (WHERE value_mgdl BETWEEN $2 AND $3)::int AS in_range,
              COUNT(*) FILTER (WHERE value_mgdl < 70)::int AS hypo,
              COUNT(*) FILTER (WHERE value_mgdl > $3)::int AS hyper
       FROM glucose_readings WHERE user_id = $1 AND recorded_at >= NOW() - INTERVAL '7 days'`, [userId, lo, hi]),
    db.query(`SELECT AVG(value_mgdl)::float AS avg, COUNT(*)::int AS count FROM glucose_readings
              WHERE user_id = $1 AND recorded_at >= NOW() - INTERVAL '30 days'`, [userId]),
    db.query(`SELECT context, AVG(value_mgdl)::float AS avg, COUNT(*)::int AS count FROM glucose_readings
              WHERE user_id = $1 AND recorded_at >= NOW() - INTERVAL '14 days' GROUP BY context`, [userId]),
    db.query(`SELECT value_mgdl::float AS value, context, recorded_at FROM glucose_readings
              WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`, [userId]),
    db.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total_carbs),0)::float AS carbs,
                     COALESCE(SUM(total_calories),0)::int AS calories, COALESCE(SUM(glycemic_load),0)::float AS gl,
                     COUNT(*) FILTER (WHERE glycemic_load >= 20)::int AS high_gl_meals
              FROM meals WHERE user_id = $1 AND ${LOCAL('recorded_at')}::date = ${TODAY}`, [userId]),
    db.query(`SELECT COALESCE(SUM(duration_min),0)::int AS minutes, COALESCE(SUM(steps),0)::int AS steps,
                     COALESCE(SUM(calories_burned),0)::int AS calories
              FROM activities WHERE user_id = $1 AND ${LOCAL('recorded_at')}::date = ${TODAY}`, [userId]),
    db.query(`SELECT COUNT(m.id)::int AS total, COUNT(l.id)::int AS taken FROM medications m
              LEFT JOIN medication_logs l ON l.medication_id = m.id AND l.taken_on = ${TODAY}
              WHERE m.user_id = $1 AND m.active = TRUE`, [userId]),
    db.query(`SELECT to_char(${LOCAL('recorded_at')}::date, 'YYYY-MM-DD') AS day, AVG(value_mgdl)::float AS avg,
                     MIN(value_mgdl)::float AS min, MAX(value_mgdl)::float AS max, COUNT(*)::int AS count
              FROM glucose_readings WHERE user_id = $1 AND recorded_at >= NOW() - INTERVAL '14 days'
              GROUP BY 1 ORDER BY 1`, [userId]),
  ]);

  const week = g7.rows[0];
  const tir = week.count ? round((week.in_range / week.count) * 100) : null;
  const ctx = Object.fromEntries(byCtx.rows.map((r) => [r.context, { avg: round(r.avg), count: r.count }]));
  const today = { meals: meals.rows[0], activity: act.rows[0], meds: meds.rows[0] };

  // DiaVita Score (0-100): glucose control 40 + activity 25 + diet 20 + medication 15
  const glucosePts = tir === null ? 20 : (tir / 100) * 40;
  const activityPts = Math.min(today.activity.minutes / 30, 1) * 25;
  const dietPts = today.meals.count === 0 ? 10
    : Math.max(0, 20 - today.meals.high_gl_meals * 7 - Math.max(0, today.meals.carbs - user.daily_carb_goal) / 10);
  const medPts = today.meds.total === 0 ? 15 : (today.meds.taken / today.meds.total) * 15;
  const score = Math.round(glucosePts + activityPts + dietPts + medPts);

  const tips = [];
  if (week.hypo > 0) tips.push({ type: 'danger', title: `${week.hypo} low reading(s) this week`, text: 'Keep glucose tablets or juice handy. Follow the 15-15 rule and tell your doctor about repeated lows.' });
  if (ctx.post_meal?.avg > 180) tips.push({ type: 'warning', title: 'After-meal sugar is high', text: `Average post-meal reading is ${ctx.post_meal.avg} mg/dL. Take a 10–15 minute walk after meals and reduce high-GI foods like white rice.` });
  if (ctx.fasting?.avg > 130) tips.push({ type: 'warning', title: 'Fasting sugar above 130', text: `Average fasting reading is ${ctx.fasting.avg} mg/dL. Avoid late-night heavy dinners and review medicines with your doctor.` });
  if (today.activity.minutes < 30) tips.push({ type: 'info', title: `${30 - today.activity.minutes} more active minutes today`, text: 'Aim for 150 minutes per week. Even short walks improve insulin sensitivity.' });
  if (today.meals.high_gl_meals > 0) tips.push({ type: 'info', title: 'High glycemic load meal logged', text: 'Pair carbs with protein / fibre (dal, sprouts, salad) and switch to millets or chapati to flatten spikes.' });
  if (today.meds.total > today.meds.taken) tips.push({ type: 'info', title: `${today.meds.total - today.meds.taken} medicine dose(s) pending`, text: 'Mark doses as taken on the Medications page to keep your streak.' });
  if (tir !== null && tir >= 70) tips.push({ type: 'success', title: `Great control: ${tir}% time in range`, text: 'You are meeting the international target of 70% time in range. Keep it up!' });
  if (!week.count) tips.push({ type: 'info', title: 'Log your first glucose reading', text: 'Add fasting and post-meal readings to unlock trends, eA1c and personalised insights.' });

  return {
    user: { name: user.name, target_min: lo, target_max: hi, daily_carb_goal: user.daily_carb_goal, daily_step_goal: user.daily_step_goal },
    glucose: {
      latest: latest.rows[0] || null,
      week: { ...week, avg: round(week.avg), time_in_range: tir },
      by_context: ctx,
      avg30: round(g30.rows[0].avg),
      estimated_a1c: estimateA1c(g30.rows[0].avg),
      trend: trend.rows.map((r) => ({ ...r, avg: round(r.avg) })),
    },
    today,
    score,
    score_breakdown: { glucose: round(glucosePts), activity: round(activityPts), diet: round(dietPts), medication: round(medPts) },
    tips,
  };
}

router.get('/summary', async (req, res) => {
  res.json(await buildSummary(req.user.id));
});

// Doctor-ready report: day-by-day glucose, carbs and activity
router.get('/report', async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
  const { rows } = await db.query(
    `WITH d AS (
       SELECT generate_series(${TODAY} - ($2::int - 1), ${TODAY}, '1 day')::date AS day
     )
     SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
       (SELECT ROUND(AVG(value_mgdl))::int FROM glucose_readings g WHERE g.user_id = $1 AND ${LOCAL('g.recorded_at')}::date = d.day) AS avg_glucose,
       (SELECT COUNT(*)::int FROM glucose_readings g WHERE g.user_id = $1 AND ${LOCAL('g.recorded_at')}::date = d.day) AS readings,
       (SELECT COALESCE(SUM(total_carbs),0)::int FROM meals m WHERE m.user_id = $1 AND ${LOCAL('m.recorded_at')}::date = d.day) AS carbs,
       (SELECT COALESCE(SUM(duration_min),0)::int FROM activities a WHERE a.user_id = $1 AND ${LOCAL('a.recorded_at')}::date = d.day) AS active_min
     FROM d ORDER BY d.day`,
    [req.user.id, days]
  );
  const summary = await buildSummary(req.user.id);
  res.json({ days, rows, summary });
});

module.exports = router;
