// DiaVita innovation layer: learns how THIS user's glucose responds to food and walking.
//  - Food Fingerprint: pairs every meal with the post-meal glucose peak and ranks foods by personal rise
//  - Spike model: per-user sensitivity k (mg/dL rise per unit of Glycemic Load) fitted by least squares
const express = require('express');
const db = require('../db');

const router = express.Router();

const DEFAULT_K = 2.0;        // population prior: mg/dL rise per GL unit (used until 3 paired meals exist)
const MIN_PAIRS = 3;
const round = (n, d = 0) => Number(Number(n).toFixed(d));

// Every meal in the last 90 days that has a glucose reading 45–180 min afterwards.
// baseline = last reading in the 90 min before the meal (falls back to the user's usual pre-meal level)
async function mealResponses(userId) {
  const { rows } = await db.query(
    `SELECT m.id, m.meal_type, m.recorded_at, m.items, m.glycemic_load::float AS gl, m.total_carbs::float AS carbs,
            b.value AS baseline, p.value AS peak, (w.minutes IS NOT NULL) AS walked, COALESCE(w.minutes, 0) AS walk_min
     FROM meals m
     LEFT JOIN LATERAL (
       SELECT value_mgdl::float AS value FROM glucose_readings g
       WHERE g.user_id = m.user_id AND g.recorded_at BETWEEN m.recorded_at - INTERVAL '90 minutes' AND m.recorded_at + INTERVAL '10 minutes'
       ORDER BY g.recorded_at DESC LIMIT 1) b ON TRUE
     JOIN LATERAL (
       SELECT MAX(value_mgdl)::float AS value FROM glucose_readings g
       WHERE g.user_id = m.user_id AND g.recorded_at BETWEEN m.recorded_at + INTERVAL '45 minutes' AND m.recorded_at + INTERVAL '180 minutes') p
       ON p.value IS NOT NULL
     LEFT JOIN LATERAL (
       SELECT SUM(duration_min)::int AS minutes FROM activities a
       WHERE a.user_id = m.user_id AND a.recorded_at BETWEEN m.recorded_at AND m.recorded_at + INTERVAL '60 minutes'
       HAVING SUM(duration_min) >= 10) w ON TRUE
     WHERE m.user_id = $1 AND m.recorded_at >= NOW() - INTERVAL '90 days'
     ORDER BY m.recorded_at DESC`,
    [userId]
  );
  const usual = await usualBaseline(userId);
  return rows.map((r) => {
    const baseline = r.baseline ?? usual;
    return { ...r, baseline, rise: Math.max(0, r.peak - baseline), estimated_baseline: r.baseline === null };
  });
}

async function usualBaseline(userId) {
  const { rows } = await db.query(
    `SELECT AVG(value_mgdl)::float AS avg FROM glucose_readings
     WHERE user_id = $1 AND context IN ('fasting', 'pre_meal') AND recorded_at >= NOW() - INTERVAL '14 days'`,
    [userId]
  );
  return rows[0].avg ? round(rows[0].avg) : 110;
}

// Least-squares fit through the origin: rise ≈ k × GL
function fitK(pairs) {
  const usable = pairs.filter((p) => p.gl > 0);
  const sxx = usable.reduce((s, p) => s + p.gl * p.gl, 0);
  if (!usable.length || !sxx) return null;
  const k = usable.reduce((s, p) => s + p.gl * p.rise, 0) / sxx;
  const mean = usable.reduce((s, p) => s + p.rise, 0) / usable.length;
  const ssTot = usable.reduce((s, p) => s + (p.rise - mean) ** 2, 0);
  const ssRes = usable.reduce((s, p) => s + (p.rise - k * p.gl) ** 2, 0);
  return { k: Math.min(Math.max(k, 0.5), 6), r2: ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0, n: usable.length };
}

// Personal sensitivity k is learned from meals WITHOUT a post-meal walk
function fitModel(pairs) {
  const fit = fitK(pairs.filter((p) => !p.walked));
  if (!fit || fit.n < MIN_PAIRS) return { k: DEFAULT_K, personalised: false, pairs: fit ? fit.n : 0 };
  return { k: round(fit.k, 2), personalised: true, pairs: fit.n, r2: round(fit.r2, 2) };
}

// Personal walk effect: compares the spike per unit of GL with vs without a 10+ min walk within 1 h
// of the meal. Normalising by GL removes the bias of walking mostly after big meals.
function walkEffect(pairs) {
  const walked = pairs.filter((p) => p.walked);
  const sat = pairs.filter((p) => !p.walked);
  if (walked.length < 2 || sat.length < MIN_PAIRS) return null;
  const kWalk = fitK(walked);
  const kSat = fitK(sat);
  if (!kWalk || !kSat) return null;
  const avgGl = walked.reduce((s, p) => s + p.gl, 0) / walked.length;
  const avgMin = walked.reduce((s, p) => s + p.walk_min, 0) / walked.length;
  return {
    percent: round((1 - kWalk.k / kSat.k) * 100),
    saved_mgdl: round((kSat.k - kWalk.k) * avgGl),
    typical_meal_gl: round(avgGl, 1),
    avg_walk_min: round(avgMin),
    samples: walked.length + sat.length,
    k_walk: kWalk.k,
  };
}

function classify(perServing) {
  if (perServing < 25) return 'friendly';
  if (perServing < 50) return 'moderate';
  return 'spike';
}

// Personal food factor = observed rise / rise predicted from GI alone, credited to each food by its
// share of the meal's glycemic load. A factor above 1 means the food spikes THIS user more than its GI says.
function foodFingerprint(pairs, model, walk) {
  const foods = {};
  for (const p of pairs) {
    if (p.gl < 3) continue;
    const expected = (p.walked && walk ? walk.k_walk : model.k) * p.gl;
    const ratio = p.rise / expected;
    for (const i of p.items || []) {
      const share = Number(i.gl || 0) / p.gl;
      if (share < 0.2) continue;
      const f = (foods[i.name] ||= { name: i.name, gi: i.gi, servingGl: Number(i.gl) / Number(i.qty || 1), w: 0, wr: 0, meals: 0 });
      f.w += share;
      f.wr += share * ratio;
      f.meals += 1;
    }
  }
  return Object.values(foods)
    .map((f) => {
      const factor = f.wr / f.w;
      const perServing = model.k * f.servingGl * factor;
      return {
        name: f.name, gi: f.gi, meals: f.meals, factor: round(factor, 2),
        rise_per_serving: round(perServing), verdict: classify(perServing),
        vs_gi: factor >= 1.15 ? 'higher' : factor <= 0.85 ? 'lower' : 'as_expected',
      };
    })
    .sort((a, b) => b.rise_per_serving - a.rise_per_serving);
}

async function analyse(userId) {
  const pairs = await mealResponses(userId);
  const model = fitModel(pairs);
  const walk = walkEffect(pairs);
  return { pairs, model, walk, foods: foodFingerprint(pairs, model, walk) };
}

router.get('/food-response', async (req, res) => {
  const { pairs, model, walk, foods } = await analyse(req.user.id);
  res.json({
    model,
    walk_effect: walk && { ...walk, k_walk: round(walk.k_walk, 2) },
    foods,
    pairs: pairs.slice(0, 20).map((p) => ({
      id: p.id, meal_type: p.meal_type, recorded_at: p.recorded_at, items: (p.items || []).map((i) => i.name),
      gl: p.gl, baseline: round(p.baseline), peak: round(p.peak), rise: round(p.rise), walked: p.walked,
    })),
  });
});

// Inputs the Smart Plate needs to predict a spike live in the browser
router.get('/spike-model', async (req, res) => {
  const { model, walk, foods } = await analyse(req.user.id);
  const { rows } = await db.query(
    // an after-meal peak is not a starting point for the next meal, so only pre-meal style readings count
    `SELECT value_mgdl::float AS value FROM glucose_readings
     WHERE user_id = $1 AND context <> 'post_meal' AND recorded_at >= NOW() - INTERVAL '2 hours'
     ORDER BY recorded_at DESC LIMIT 1`,
    [req.user.id]
  );
  const baseline = rows[0]?.value ?? (await usualBaseline(req.user.id));
  // Walk reduction per minute: personal if measured, otherwise ~1.2% of the rise per minute
  const personalWalk = Boolean(walk && walk.percent > 0);
  const perMin = personalWalk ? Math.min(walk.percent / 100 / walk.avg_walk_min, 0.02) : 0.012;
  res.json({
    ...model, baseline: round(baseline), baseline_source: rows[0] ? 'latest reading' : 'your usual pre-meal level',
    walk_reduction_per_min: round(perMin, 4), walk_personalised: personalWalk,
    // only trust a food's personal factor once it has been seen in 2+ meals
    food_factors: Object.fromEntries(foods.filter((f) => f.meals >= 2).map((f) => [f.name, f.factor])),
  });
});

module.exports = router;
