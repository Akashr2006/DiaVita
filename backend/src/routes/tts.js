// Natural voice for the talking assistant: turns a reply into speech with Sarvam AI's Bulbul model,
// which is made for Indian languages (Tamil, Hindi, English). Needs SARVAM_API_KEY in .env; without it the
// app falls back to the voices built into the browser.
const express = require('express');

const router = express.Router();

const SARVAM_URL = process.env.SARVAM_API_URL || 'https://api.sarvam.ai/text-to-speech';
const MODEL = 'bulbul:v3';
const LANGS = { ta: 'ta-IN', hi: 'hi-IN', en: 'en-IN' };
const MAX_CHARS = 1500;
const CACHE_LIMIT = 300;
const cache = new Map(); // "lang|text" -> mp3 Buffer; the same replies repeat often, so they play instantly

const enabled = () => Boolean(process.env.SARVAM_API_KEY);

router.get('/status', (req, res) => {
  res.json({ enabled: enabled(), provider: enabled() ? 'Sarvam AI Bulbul' : null });
});

// Body: { text, lang: 'ta' | 'hi' | 'en' } -> audio/mpeg
router.post('/', async (req, res) => {
  if (!enabled()) return res.status(503).json({ error: 'Natural voice is not set up' });
  const { text, lang } = req.body || {};
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!LANGS[lang]) return res.status(400).json({ error: 'Unknown language' });
  if (!clean || clean.length > MAX_CHARS) return res.status(400).json({ error: `Text must be 1–${MAX_CHARS} characters` });

  const key = `${lang}|${clean}`;
  let audio = cache.get(key);
  if (!audio) {
    let reply;
    try {
      reply = await fetch(SARVAM_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': process.env.SARVAM_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          language_code: LANGS[lang],
          model: MODEL,
          speaker: process.env.SARVAM_SPEAKER || 'kavitha',
          pace: 0.95,
          speech_sample_rate: 24000,
          output_audio_codec: 'mp3',
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return res.status(502).json({ error: 'Voice service did not answer' });
    }
    const data = await reply.json().catch(() => ({}));
    if (!reply.ok || !data.audios?.length) {
      console.error('Sarvam TTS error:', reply.status, data.error?.message || data.error || '');
      return res.status(502).json({ error: 'Voice service error' });
    }
    audio = Buffer.from(data.audios.join(''), 'base64');
    cache.set(key, audio);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  }
  res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' }).send(audio);
});

module.exports = router;
