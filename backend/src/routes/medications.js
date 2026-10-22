const express = require('express');
const db = require('../db');
const { TODAY } = db;

const router = express.Router();

// Today's schedule with taken status
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT m.id, m.name, m.dosage, m.med_type, to_char(m.schedule_time, 'HH24:MI') AS schedule_time, m.active,
            (l.id IS NOT NULL) AS taken_today, l.taken_at
     FROM medications m
     LEFT JOIN medication_logs l ON l.medication_id = m.id AND l.taken_on = ${TODAY}
     WHERE m.user_id = $1 AND m.active = TRUE
     ORDER BY m.schedule_time`,
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, dosage, med_type = 'tablet', schedule_time } = req.body || {};
  if (!name || !dosage || !schedule_time) return res.status(400).json({ error: 'Name, dosage and time are required' });
  const { rows } = await db.query(
    `INSERT INTO medications (user_id, name, dosage, med_type, schedule_time)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, dosage, med_type, to_char(schedule_time, 'HH24:MI') AS schedule_time, active`,
    [req.user.id, name.trim(), dosage.trim(), med_type, schedule_time]
  );
  res.status(201).json({ ...rows[0], taken_today: false });
});

// Toggle taken / not taken for today
router.post('/:id/toggle', async (req, res) => {
  const { rows: med } = await db.query('SELECT id FROM medications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!med[0]) return res.status(404).json({ error: 'Medication not found' });
  const del = await db.query(`DELETE FROM medication_logs WHERE medication_id = $1 AND taken_on = ${TODAY}`, [req.params.id]);
  if (del.rowCount) return res.json({ taken_today: false });
  await db.query(`INSERT INTO medication_logs (medication_id, user_id, taken_on) VALUES ($1, $2, ${TODAY})`, [req.params.id, req.user.id]);
  res.json({ taken_today: true });
});

router.delete('/:id', async (req, res) => {
  await db.query('UPDATE medications SET active = FALSE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.status(204).end();
});

module.exports = router;
