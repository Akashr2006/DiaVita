'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { api } from '@/lib/api';

// Speak a reading in English, Tamil or Hindi: e.g. "sugar 140 after lunch", "சர்க்கரை 140 சாப்பிட்ட பின்",
// "शुगर 140 खाने के बाद". The app parses it, saves it and reads the result back aloud.
const LANGS = { 'en-IN': 'English', 'ta-IN': 'தமிழ்', 'hi-IN': 'हिंदी' };

const KEYWORDS = [
  ['post_meal', ['after', 'post', 'பின்', 'பிறகு', 'बाद']],
  ['pre_meal', ['before', 'pre ', 'முன்', 'पहले']],
  ['bedtime', ['bed', 'night', 'sleep', 'இரவு', 'தூங்க', 'रात', 'सोने']],
  ['fasting', ['fasting', 'empty stomach', 'morning', 'வெறும் வயிறு', 'காலை', 'खाली पेट', 'सुबह']],
];

const SPOKEN = {
  'en-IN': { saved: (v) => `Saved ${v}.`, ok: 'Your sugar is in range. Well done.', low: 'Your sugar is low. Take 15 grams of sugar now and check again in 15 minutes.', high: 'Your sugar is high. Drink water and take a short walk.', unclear: 'Sorry, I could not find a number. Please say for example, sugar 140 after lunch.' },
  'ta-IN': { saved: (v) => `${v} பதிவு செய்யப்பட்டது.`, ok: 'சர்க்கரை அளவு சரியாக உள்ளது.', low: 'சர்க்கரை குறைவாக உள்ளது. உடனே 15 கிராம் இனிப்பு சாப்பிடுங்கள்.', high: 'சர்க்கரை அதிகமாக உள்ளது. தண்ணீர் குடித்து சிறிது நடக்கவும்.', unclear: 'மன்னிக்கவும், எண் கேட்கவில்லை. மீண்டும் சொல்லுங்கள்.' },
  'hi-IN': { saved: (v) => `${v} दर्ज किया गया।`, ok: 'शुगर सही सीमा में है।', low: 'शुगर कम है। तुरंत 15 ग्राम मीठा लें।', high: 'शुगर ज़्यादा है। पानी पिएं और थोड़ा टहलें।', unclear: 'माफ़ कीजिए, नंबर समझ नहीं आया। फिर से बोलें।' },
};

// Convert Tamil and Devanagari digits to ASCII, then pick the first plausible glucose value
export function parseSpeech(text) {
  const normal = text
    .replace(/[௦-௯]/g, (d) => String(d.charCodeAt(0) - 0x0BE6))
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .toLowerCase();
  const value = (normal.match(/\d{2,3}(\.\d)?/g) || []).map(Number).find((n) => n >= 20 && n <= 600);
  const context = KEYWORDS.find(([, words]) => words.some((w) => normal.includes(w)))?.[0] || 'random';
  return { value, context };
}

function speak(text, lang) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function VoiceEntry({ onSaved }) {
  const [lang, setLang] = useState('en-IN');
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recRef.current?.abort();
  }, []);

  async function handle(text) {
    setHeard(text);
    const words = SPOKEN[lang];
    const { value, context } = parseSpeech(text);
    if (!value) {
      speak(words.unclear, lang);
      onSaved?.({ level: 'warning', message: `Heard “${text}” but found no glucose value. Try “sugar 140 after lunch”.` });
      return;
    }
    try {
      const res = await api('/glucose', { method: 'POST', body: { value, context, note: `Voice: ${text}` } });
      const tone = value < 70 ? words.low : value > 180 ? words.high : words.ok;
      speak(`${words.saved(value)} ${tone}`, lang);
      onSaved?.(res.alert || { level: 'success', message: `Voice entry saved: ${value} mg/dL (${context.replace('_', ' ')}).` });
    } catch (err) {
      onSaved?.({ level: 'danger', message: err.message });
    }
  }

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => handle(e.results[0][0].transcript);
    rec.onerror = (e) => onSaved?.({ level: 'warning', message: e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Could not hear clearly. Please try again.' });
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setHeard('');
    setListening(true);
    rec.start();
  }

  if (!supported) {
    return <p className="text-xs text-slate-400">Voice entry works in Chrome / Edge on Android and desktop.</p>;
  }

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={toggle}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition ${listening ? 'animate-pulse bg-rose-500' : 'bg-violet-600 hover:bg-violet-700'}`}
          aria-label={listening ? 'Stop listening' : 'Speak a reading'}>
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{listening ? 'Listening…' : 'Speak your reading'}</div>
          <div className="truncate text-xs text-slate-500">{heard ? `“${heard}”` : 'e.g. “sugar 140 after lunch”'}</div>
        </div>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold" aria-label="Voice language">
          {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Volume2 size={12} /> Result is read aloud — helpful for elderly users</div>
    </div>
  );
}
