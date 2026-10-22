require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./db');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (req, res) => {
  const { rows } = await db.query('SELECT NOW() AS time');
  res.json({ status: 'ok', app: 'DiaVita API', database: 'connected', time: rows[0].time });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/glucose', requireAuth, require('./routes/glucose'));
app.use('/api/meals', requireAuth, require('./routes/meals'));
app.use('/api/activities', requireAuth, require('./routes/activities'));
app.use('/api/medications', requireAuth, require('./routes/medications'));
app.use('/api/risk', requireAuth, require('./routes/risk'));
app.use('/api/insights', requireAuth, require('./routes/insights'));
app.use('/api/smart', requireAuth, require('./routes/smart'));
app.use('/api/demo', requireAuth, require('./routes/demo'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Express 5 forwards rejected async handlers here automatically
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => console.log(`DiaVita API running on http://localhost:${PORT}`));
