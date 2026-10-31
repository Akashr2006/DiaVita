// Real-time sync: every open DiaVita screen of a patient (phone, laptop, a family member's device)
// finds out when that patient's data changes, and reloads it.
// Two ways, depending on where the API runs:
//  - a normal server keeps one Server-Sent Events connection per screen and pushes each change at once;
//  - on Vercel (short-lived functions, no lasting connections) screens ask GET /api/live/version every
//    few seconds. Every write also bumps the patient's counter in Neon, so both ways see the same changes.
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'diavita-dev-secret-change-me';
const STREAMING = !process.env.VERCEL;
const clients = new Map(); // userId -> Set of open responses
const HEARTBEAT_MS = 25000;

// GET /api/live?token=... (EventSource cannot send an Authorization header, so the token comes in the URL)
function stream(req, res) {
  let user;
  try {
    user = jwt.verify(String(req.query.token || ''), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  if (!STREAMING) return res.status(204).end();
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(`retry: 3000\nevent: hello\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

  if (!clients.has(user.id)) clients.set(user.id, new Set());
  clients.get(user.id).add(res);
  const beat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(beat);
    const set = clients.get(user.id);
    set?.delete(res);
    if (set && !set.size) clients.delete(user.id);
  });
}

// GET /api/live/version -> { version, area, at, stream }: the patient's change counter, and whether
// this server can also push changes over a lasting connection
async function version(req, res) {
  const { rows } = await db.query('SELECT version, area, changed_at FROM live_changes WHERE user_id = $1', [req.user.id]);
  const row = rows[0];
  res.set('Cache-Control', 'no-store').json({ version: Number(row?.version || 0), area: row?.area || null, at: row?.changed_at || null, stream: STREAMING });
}

function publish(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  const msg = `event: change\ndata: ${JSON.stringify({ ...payload, at: new Date().toISOString() })}\n\n`;
  for (const res of set) res.write(msg);
}

const bump = (userId, area) => db.query(
  `INSERT INTO live_changes (user_id, version, area) VALUES ($1, 1, $2)
   ON CONFLICT (user_id) DO UPDATE SET version = live_changes.version + 1, area = $2, changed_at = NOW()`,
  [userId, area],
);

// Areas whose POST does not change the patient's data (turning a reply into speech)
const NOT_DATA = ['tts'];

// Announces every successful write (add, change, delete) to that patient's open screens
function announceWrites(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !NOT_DATA.includes(req.originalUrl.split('/')[2])) {
    const area = req.originalUrl.split('/')[2];
    if (STREAMING) {
      res.on('finish', () => {
        if (req.user && res.statusCode < 400) {
          publish(req.user.id, { area, method: req.method });
          bump(req.user.id, area).catch((err) => console.error('Live counter:', err.message));
        }
      });
    } else {
      // a Vercel function may be frozen as soon as the reply is sent, so the counter goes up before it
      const end = res.end.bind(res);
      res.end = (...args) => {
        if (!req.user || res.statusCode >= 400) return end(...args);
        bump(req.user.id, area)
          .catch((err) => console.error('Live counter:', err.message))
          .then(() => end(...args));
        return res;
      };
    }
  }
  next();
}

module.exports = { stream, version, publish, announceWrites };
