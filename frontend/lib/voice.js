'use client';
// How DiaVita speaks. First choice: the natural Sarvam AI voice from our server (clear Tamil, Hindi and Indian
// English on every device). Otherwise: the best voice built into the phone or browser.
import { API_URL, getToken } from '@/lib/api';

let statusPromise = null;
let current = null; // the natural-voice clip that is playing
const clips = new Map(); // "lang|text" -> object URL, so a repeated reply plays at once

export function naturalVoiceAvailable() {
  if (!statusPromise) {
    statusPromise = fetch(`${API_URL}/tts/status`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => Boolean(d.enabled))
      .catch(() => false);
  }
  return statusPromise;
}

export function stopSpeaking() {
  if (current) { current.pause(); current = null; }
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

async function playNatural(lang, text, onEnd) {
  const key = `${lang}|${text}`;
  let url = clips.get(key);
  if (!url) {
    const res = await fetch(`${API_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error('voice service');
    url = URL.createObjectURL(await res.blob());
    clips.set(key, url);
  }
  stopSpeaking();
  const audio = new Audio(url);
  current = audio;
  const done = () => { if (current === audio) current = null; onEnd?.(); };
  audio.onended = done;
  audio.onerror = done;
  await audio.play();
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

export async function speak(lang, text, roman, onEnd) {
  if (typeof window === 'undefined') return;
  if (await naturalVoiceAvailable()) {
    try { await playNatural(lang, text, onEnd); return; } catch { /* use a built-in voice instead */ }
  }
  speakBrowser(lang, text, roman, onEnd);
}
