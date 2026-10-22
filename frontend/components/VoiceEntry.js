'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/lib/api';

// Speak a reading in English, Tamil or Hindi: e.g. "sugar 140 after lunch", "சர்க்கரை 140 சாப்பிட்ட பின்",
// "शुगर 140 खाने के बाद". The app parses it, saves it and reads the result back aloud.
export const LANGS = [
  { code: 'en-IN', short: 'English' },
  { code: 'ta-IN', short: 'தமிழ்' },
  { code: 'hi-IN', short: 'हिंदी' },
];

export const EXAMPLES = {
  'en-IN': ['sugar 140 after lunch', 'fasting sugar 98', 'sugar 120 before dinner'],
  'ta-IN': ['சர்க்கரை 140 சாப்பிட்ட பின்', 'காலை வெறும் வயிறு 110', 'சாப்பிடும் முன் 120'],
  'hi-IN': ['शुगर 140 खाने के बाद', 'खाली पेट शुगर 98', 'खाने से पहले 120'],
};

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

const CONTEXT_WORDS = { post_meal: 'after a meal', pre_meal: 'before a meal', bedtime: 'at bedtime', fasting: 'fasting', random: 'random' };

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

export function speak(text, lang) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export function LangSwitch({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Voice language" className="grid w-full grid-cols-3 gap-1 rounded-[10px] bg-soft p-1 ring-1 ring-line">
      {LANGS.map((l) => (
        <button
          key={l.code} type="button" role="radio" aria-checked={value === l.code} onClick={() => onChange(l.code)}
          className={`h-8 rounded-lg text-[13px] font-semibold transition ${value === l.code ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

export default function VoiceEntry({ onSaved }) {
  const [lang, setLangState] = useState('en-IN');
  const [readAloud, setReadAloud] = useState(true);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [result, setResult] = useState(null);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    setLangState(store.get('dv-voice-lang', 'en-IN'));
    setReadAloud(store.get('dv-voice-read', '1') === '1');
    return () => recRef.current?.abort();
  }, []);

  const setLang = (code) => { setLangState(code); store.set('dv-voice-lang', code); };
  const toggleRead = () => { setReadAloud((r) => { store.set('dv-voice-read', r ? '0' : '1'); return !r; }); };
  const say = (text) => readAloud && speak(text, lang);

  async function handle(text) {
    setHeard(text);
    const words = SPOKEN[lang];
    const { value, context } = parseSpeech(text);
    if (!value) {
      say(words.unclear);
      setResult({ ok: false, text: 'No number found. Try again, for example “sugar 140 after lunch”.' });
      onSaved?.({ level: 'warning', message: `Heard “${text}” but found no glucose value.` });
      return;
    }
    try {
      const res = await api('/glucose', { method: 'POST', body: { value, context, note: `Voice: ${text}`, source: 'voice' } });
      const tone = value < 70 ? words.low : value > 180 ? words.high : words.ok;
      say(`${words.saved(value)} ${tone}`);
      setResult({ ok: true, text: `Saved ${value} mg/dL · ${CONTEXT_WORDS[context]}` });
      onSaved?.(res.alert || { level: 'success', message: `Voice entry saved: ${value} mg/dL (${CONTEXT_WORDS[context]}).` });
    } catch (err) {
      setResult({ ok: false, text: err.message });
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
    rec.onerror = (e) => setResult({ ok: false, text: e.error === 'not-allowed' ? 'Microphone permission was denied. Allow it in the browser and try again.' : 'Could not hear clearly. Please try again.' });
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setHeard('');
    setResult(null);
    setListening(true);
    rec.start();
  }

  const status = listening ? 'Listening… speak now' : result ? (result.ok ? 'Reading saved' : 'Please try again') : 'Tap the mic and speak';

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <LangSwitch value={lang} onChange={setLang} />

      {supported ? (
        <button
          type="button" onClick={toggle} aria-label={listening ? 'Stop listening' : 'Start speaking'}
          className="relative grid h-[72px] w-[72px] place-items-center rounded-full"
        >
          {listening && (
            <>
              <span className="voice-ring absolute inset-0 rounded-full bg-aqua" />
              <span className="voice-ring voice-ring-delay absolute inset-0 rounded-full bg-mint" />
            </>
          )}
          <span className={`relative grid h-[72px] w-[72px] place-items-center rounded-full text-ink shadow-[0_8px_24px_-8px_rgba(31,111,124,0.55)] transition ${listening ? 'bg-mint' : 'bg-aqua hover:bg-[#74c7d2]'}`}>
            {listening ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
          </span>
        </button>
      ) : (
        <p className="rounded-xl bg-soft px-3 py-2.5 text-xs text-muted ring-1 ring-line">
          Voice entry works in Chrome or Edge on Android and laptops. You can still type your reading.
        </p>
      )}

      <div className="min-h-[44px]" aria-live="polite">
        <div className={`text-base font-semibold ${result && !result.ok ? 'text-amber-700' : 'text-ink'}`}>{supported ? status : 'How to say it'}</div>
        <div className="mt-0.5 text-xs text-muted">
          {heard ? `“${heard}”` : result ? '' : 'Say the number and when you checked it'}
        </div>
        {result && <div className={`mt-1 text-xs font-semibold ${result.ok ? 'text-mint-700' : 'text-amber-700'}`}>{result.text}</div>}
      </div>

      <div className="w-full">
        <div className="eyebrow mb-2 text-left text-muted">Try saying</div>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES[lang].map((ex) => (
            <button
              key={ex} type="button" onClick={() => speak(ex, lang)} title="Hear how to say it"
              className="flex items-center justify-between gap-2 rounded-[10px] bg-soft px-3 py-2 text-left text-[13px] text-ink ring-1 ring-line transition hover:bg-[#e2f4f6]"
            >
              <span className="truncate">“{ex}”</span>
              <Volume2 size={15} className="shrink-0 text-brand-600" />
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={toggleRead} className="chip h-8 text-xs text-muted hover:bg-soft hover:text-ink">
        {readAloud ? <Volume2 size={14} /> : <VolumeX size={14} />}
        {readAloud ? 'Result is read aloud' : 'Read aloud is off'}
      </button>
    </div>
  );
}
