const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const USER_FIELDS = `id, name, email, age, gender, diabetes_type, height_cm, weight_kg, waist_cm,
  target_min, target_max, daily_carb_goal, daily_step_goal, created_at`;

router.post('/register', async (req, res) => {
  const { name, email, password, age, gender, diabetes_type } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rowCount) return res.status(409).json({ error: 'An account with this email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, age, gender, diabetes_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${USER_FIELDS}`,
    [name.trim(), email.toLowerCase(), hash, age || null, gender || null, diabetes_type || 'type2']
  );
  res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  delete user.password_hash;
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT ${USER_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.put('/profile', requireAuth, async (req, res) => {
  const allowed = ['name', 'age', 'gender', 'diabetes_type', 'height_cm', 'weight_kg', 'waist_cm',
    'target_min', 'target_max', 'daily_carb_goal', 'daily_step_goal'];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      values.push(req.body[key] === '' ? null : req.body[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.user.id);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${USER_FIELDS}`,
    values
  );
  res.json(rows[0]);
});

module.exports = router;
