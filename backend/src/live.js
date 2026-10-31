// Real-time sync with Server-Sent Events: every open DiaVita screen of a patient (phone, laptop,
// a family member's device) gets a message the moment that patient's data changes, and reloads it.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'diavita-dev-secret-change-me';
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

function publish(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  const msg = `event: change\ndata: ${JSON.stringify({ ...payload, at: new Date().toISOString() })}\n\n`;
  for (const res of set) res.write(msg);
}

// Areas whose POST does not change the patient's data (turning a reply into speech)
const NOT_DATA = ['tts'];

// Announces every successful write (add, change, delete) to that patient's open screens
function announceWrites(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !NOT_DATA.includes(req.originalUrl.split('/')[2])) {
    res.on('finish', () => {
      if (req.user && res.statusCode < 400) publish(req.user.id, { area: req.originalUrl.split('/')[2], method: req.method });
    });
  }
  next();
}

module.exports = { stream, publish, announceWrites };
