'use client';
// How DiaVita speaks. First choice: the natural Sarvam AI voice from our server (clear Tamil, Hindi and Indian
// English on every device). Otherwise: the phone's own voice inside the Android app, or the best browser voice.
import { API_URL, getToken } from '@/lib/api';
import { isNativeApp } from '@/lib/speech';

// loaded only inside the Android app (see lib/speech.js)
const tts = () => import('@capacitor-community/text-to-speech').then((m) => m.TextToSpeech);

let statusPromise = null;
let current = null; // the natural-voice clip that is playing
let speechRun = 0; // goes up with every new speech and every stop, so an older reply still loading stays silent
const clips = new Map(); // "lang|text" -> object URL, so a repeated reply plays at once
const STATUS_WAIT_MS = 6000;
const CLIP_WAIT_MS = 12000; // on slow Wi-Fi: after this, use the phone's own voice rather than stay silent

function fetchWithin(ms, url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export function naturalVoiceAvailable() {
  if (!statusPromise) {
    statusPromise = fetchWithin(STATUS_WAIT_MS, `${API_URL}/tts/status`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => Boolean(d.enabled))
      .catch(() => false)
      // a bad moment on the network must not lose the natural voice until the app restarts: ask again next time
      .then((ok) => { if (!ok) statusPromise = null; return ok; });
  }
  return statusPromise;
}

export function stopSpeaking() {
  speechRun += 1;
  if (current) { current.pause(); current = null; }
  if (typeof window === 'undefined') return;
  if (isNativeApp()) tts().then((t) => t.stop()).catch(() => {});
  else window.speechSynthesis?.cancel();
}

// Android app: does the phone have a voice for this language? (Most have Google's Tamil, Hindi and English voices.)
const nativeSupports = (code) => tts().then((t) => t.isLanguageSupported({ lang: code })).then((r) => r.supported).catch(() => false);

// Resolves once the clip has started; throws if it cannot play, and the caller then uses a built-in voice
async function playNatural(lang, text, stillWanted, onEnd) {
  const key = `${lang}|${text}`;
  let url = clips.get(key);
  if (!url) {
    const res = await fetchWithin(CLIP_WAIT_MS, `${API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error('voice service');
    url = URL.createObjectURL(await res.blob());
    clips.set(key, url);
  }
  if (!stillWanted()) return;
  const audio = new Audio(url);
  current = audio;
  let started = false;
  const done = () => { if (current === audio) current = null; onEnd?.(); };
  audio.onended = done;
  audio.onerror = () => { if (started) done(); };
  try {
    await audio.play();
    started = true;
  } catch (err) {
    if (current === audio) current = null;
    throw err;
  }
}

// ---- built-in voices ----

// Online / neural voices (Edge "Natural", Google, Android network voices) sound far more human than old desktop ones
const QUALITY = /(natural|neural|online|google|wavenet|premium|enhanced)/i;

function bestVoice(code) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const all = window.speechSynthesis.getVoices();
  const norm = (v) => (v.lang || '').toLowerCase().replace('_', '-');
  const pool = all.filter((v) => norm(v) === `${code}-in`);
  const fallback = pool.length ? pool : all.filter((v) => norm(v).startsWith(code));
  return [...fallback].sort((a, b) => (QUALITY.test(b.name) - QUALITY.test(a.name)) || (a.localService - b.localService))[0] || null;
}

// What the patient will hear for a language: 'natural' | 'device' (a real voice for that language) | 'basic' | 'none'
export async function voiceQuality(lang) {
  if (await naturalVoiceAvailable()) return 'natural';
  if (isNativeApp()) {
    if (await nativeSupports(`${lang}-IN`)) return 'device';
    return lang === 'ta' && (await nativeSupports('en-IN')) ? 'basic' : 'none';
  }
  if (bestVoice(lang)) return 'device';
  return lang === 'ta' && bestVoice('en') ? 'basic' : 'none';
}

function speakBrowser(lang, text, roman, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return; }
  let voice = bestVoice(lang);
  let say = text;
  // no Tamil voice on this device: read the romanised Tamil with an Indian English voice
  if (!voice && lang === 'ta' && roman) { voice = bestVoice('en'); say = roman; }
  if (!voice) { onEnd?.(); return; } // reading Hindi script with an English voice would only be noise
  // short sentences sound more natural and avoid Chrome cutting off long speech
  const parts = say.split(/(?<=[.!?।])\s+/).filter(Boolean);
  window.speechSynthesis.cancel();
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = QUALITY.test(voice.name) ? 0.97 : 0.9;
    if (i === parts.length - 1) { u.onend = () => onEnd?.(); u.onerror = () => onEnd?.(); }
    window.speechSynthesis.speak(u);
  });
}

async function speakNative(lang, text, roman, stillWanted, onEnd) {
  let code = `${lang}-IN`;
  let say = text;
  if (!(await nativeSupports(code))) {
    if (lang !== 'ta' || !roman) { onEnd?.(); return; }
    code = 'en-IN';
    say = roman;
  }
  if (!stillWanted()) return;
  try { await (await tts()).speak({ text: say, lang: code, rate: 0.95, pitch: 1.0, volume: 1.0, queueStrategy: 0 }); } catch { /* stopped or no engine */ }
  onEnd?.();
}

export async function speak(lang, text, roman, onEnd) {
  if (typeof window === 'undefined') return;
  stopSpeaking();
  const run = speechRun;
  const stillWanted = () => run === speechRun;
  // onEnd means "finished by itself": a voice that was stopped must not start the microphone again
  const finished = () => { if (stillWanted()) onEnd?.(); };
  if (await naturalVoiceAvailable()) {
    if (!stillWanted()) return;
    try { await playNatural(lang, text, stillWanted, finished); return; } catch { /* use a built-in voice instead */ }
  }
  if (!stillWanted()) return;
  if (isNativeApp()) speakNative(lang, text, roman, stillWanted, finished);
  else speakBrowser(lang, text, roman, finished);
}
