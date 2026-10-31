'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { ASSISTANT_LANGS, converse, newConversation, quickReplies } from '@/lib/assistant';
import { refreshAll } from '@/lib/live';

const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const UI = {
  ta: { listening: 'கேட்டுக்கிட்டு இருக்கேன்… பேசுங்க', tap: 'மைக்கை அழுத்தி பேசுங்க', thinking: 'யோசிக்கிறேன்…', type: 'இங்கே டைப் பண்ணலாம்', noMic: 'இந்த பிரவுசர்ல மைக் இல்ல. கீழே டைப் பண்ணுங்க, இல்ல பட்டனை அழுத்துங்க.', denied: 'மைக் அனுமதி இல்ல. பிரவுசர்ல மைக்கை அனுமதிங்க.' },
  en: { listening: 'Listening… please speak', tap: 'Tap the mic and speak', thinking: 'Thinking…', type: 'Type here instead', noMic: 'This browser has no microphone support. Type below or tap a button.', denied: 'Microphone is blocked. Please allow it in the browser.' },
  hi: { listening: 'सुन रही हूँ… बोलिए', tap: 'माइक दबाकर बोलिए', thinking: 'सोच रही हूँ…', type: 'यहाँ टाइप करें', noMic: 'इस ब्राउज़र में माइक नहीं है। नीचे टाइप करें या बटन दबाएँ।', denied: 'माइक की अनुमति नहीं है। ब्राउज़र में माइक चालू करें।' },
};

// Speak a reply. Tamil is read in Tamil when the phone has a Tamil voice; otherwise the romanised
// version is read by an Indian English voice so the patient still hears it.
export function speakText(lang, text, roman, onEnd) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onEnd?.(); return; }
  const voices = window.speechSynthesis.getVoices();
  const find = (code) => voices.find((v) => v.lang?.toLowerCase().replace('_', '-') === `${code}-in`) || voices.find((v) => v.lang?.toLowerCase().startsWith(code));
  let voice = find(lang);
  let say = text;
  let code = `${lang}-IN`;
  if (!voice && lang === 'ta' && roman) { voice = find('en'); say = roman; code = 'en-IN'; }
  const u = new SpeechSynthesisUtterance(say);
  u.lang = voice?.lang || code;
  if (voice) u.voice = voice;
  u.rate = 0.92;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function Assistant({ user }) {
  const [lang, setLangState] = useState('ta');
  const [messages, setMessages] = useState([]);
  const [convo, setConvo] = useState(newConversation());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [busy, setBusy] = useState(false);
  const [readAloud, setReadAloud] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [typed, setTyped] = useState('');
  const [micState, setMicState] = useState('ok'); // ok | none | denied
  const convoRef = useRef(convo);
  const cacheRef = useRef({});
  const recRef = useRef(null);
  const endRef = useRef(null);
  const settingsRef = useRef({ lang, readAloud });
  convoRef.current = convo;
  settingsRef.current = { lang, readAloud };
  const t = UI[lang];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, interim, busy]);

  const stopListening = useCallback(() => { recRef.current?.abort(); recRef.current = null; setListening(false); setInterim(''); }, []);

  const startListening = useCallback(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setMicState('none'); return; }
    window.speechSynthesis?.cancel();
    recRef.current?.abort();
    const rec = new SR();
    rec.lang = ASSISTANT_LANGS.find((l) => l.code === settingsRef.current.lang).speech;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let live = '';
      for (const r of e.results) { if (r.isFinal) finalText = r[0].transcript; else live += r[0].transcript; }
      setInterim(finalText || live);
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMicState('denied'); };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      recRef.current = null;
      if (finalText.trim()) handleRef.current({ text: finalText }, finalText);
    };
    recRef.current = rec;
    setListening(true);
    setMicState('ok');
    try { rec.start(); } catch { setListening(false); }
  }, []);

  // One turn: show what the patient said, ask the conversation engine, show + speak the answer
  const handle = useCallback(async (input, shown) => {
    const { lang: l, readAloud: read } = settingsRef.current;
    if (shown) setMessages((m) => [...m, { from: 'me', text: shown }]);
    setBusy(true);
    let r;
    try {
      r = await converse(convoRef.current, input, { lang: l, user, cache: cacheRef.current });
    } catch {
      r = { state: newConversation(), reply: { text: '…' } };
    }
    setBusy(false);
    setConvo(r.state);
    setMessages((m) => [...m, { from: 'bot', text: r.reply.text, roman: r.reply.roman }]);
    if (r.saved) refreshAll({ area: r.saved });
    // keep the conversation hands-free: listen again after a question, stop after goodbye
    const listenAfter = !r.done && (r.state.step !== 'idle' || r.saved || shown || input.intent === 'hello');
    const next = () => { if (listenAfter) startListening(); };
    if (read) speakText(l, r.reply.text, r.reply.roman, next);
    else next();
  }, [user, startListening]);
  const handleRef = useRef(handle);
  handleRef.current = handle;

  // Greet when the assistant opens or the language changes
  useEffect(() => {
    const saved = store.get('dv-assistant-lang', 'ta');
    setReadAloud(store.get('dv-voice-read', '1') === '1');
    setLangState(saved);
    settingsRef.current.lang = saved;
    if (typeof window !== 'undefined' && !(window.SpeechRecognition || window.webkitSpeechRecognition)) setMicState('none');
    window.speechSynthesis?.getVoices();
    const t0 = setTimeout(() => handleRef.current({ intent: 'hello' }), 250);
    return () => { clearTimeout(t0); recRef.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);

  const changeLang = (code) => {
    if (code === lang) return;
    stopListening();
    window.speechSynthesis?.cancel();
    store.set('dv-assistant-lang', code);
    setLangState(code);
    settingsRef.current.lang = code;
    setConvo(newConversation());
    convoRef.current = newConversation();
    setMessages([]);
    handleRef.current({ intent: 'hello' });
  };

  const toggleRead = () => {
    setReadAloud((r) => { store.set('dv-voice-read', r ? '0' : '1'); if (r) window.speechSynthesis?.cancel(); return !r; });
  };

  const sendTyped = (e) => {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    stopListening();
    handle({ text }, text);
  };

  const chips = quickReplies(lang, convo);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label="Language" className="grid flex-1 grid-cols-3 gap-1 rounded-[10px] bg-soft p-1 ring-1 ring-line">
          {ASSISTANT_LANGS.map((l) => (
            <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} onClick={() => changeLang(l.code)}
              className={`h-9 rounded-lg text-sm font-semibold transition ${lang === l.code ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={toggleRead} className="grid h-11 w-11 place-items-center rounded-[10px] bg-soft text-ink ring-1 ring-line" aria-label={readAloud ? 'Turn off reading aloud' : 'Turn on reading aloud'} title={readAloud ? 'Replies are read aloud' : 'Reading aloud is off'}>
          {readAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Conversation */}
      <div className="no-scrollbar mt-3 min-h-[180px] flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-page p-3 ring-1 ring-line" aria-live="polite">
        {messages.map((m, i) => (m.from === 'bot' ? (
          <div key={i} className="flex items-end gap-2">
            <LogoMark size={26} className="mb-0.5" />
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-6 text-ink shadow-sm ring-1 ring-line">
              {m.text}
              <button type="button" onClick={() => speakText(lang, m.text, m.roman)} className="ml-1.5 inline-grid h-6 w-6 translate-y-1 place-items-center rounded-md text-brand-600 hover:bg-soft" aria-label="Read this again">
                <Volume2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div key={i} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-aqua px-3.5 py-2.5 text-[15px] leading-6 text-ink">{m.text}</div>
          </div>
        )))}
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-sky/60 px-3.5 py-2.5 text-[15px] italic text-ink/80">{interim}…</div>
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2 pl-8 text-sm text-muted">
            <span className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-aqua" /><span className="h-2 w-2 animate-bounce rounded-full bg-aqua [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-aqua [animation-delay:240ms]" /></span>
            {t.thinking}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Big answer buttons */}
      {chips.length > 0 && (
        <div className={`mt-3 grid gap-2 ${chips.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {chips.map((c) => (
            <button key={c.label} type="button" disabled={busy}
              onClick={() => { stopListening(); handle(c.input, c.label); }}
              className={`min-h-11 rounded-xl px-2.5 py-1.5 text-sm font-semibold leading-5 ring-1 transition disabled:opacity-50 ${
                c.tone === 'yes' ? 'bg-mint text-ink ring-mint-300 hover:bg-[#a2ebc3]' : c.tone === 'no' ? 'bg-white text-rose-700 ring-rose-200 hover:bg-rose-50' : 'bg-white text-ink ring-line hover:ring-aqua'}`}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Mic */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" onClick={() => setShowKeyboard((k) => !k)} className="grid h-11 w-11 place-items-center rounded-full bg-soft text-muted ring-1 ring-line hover:text-ink" aria-label="Type instead">
          <Keyboard size={18} />
        </button>
        <button type="button" disabled={micState === 'none'} onClick={() => (listening ? stopListening() : startListening())}
          aria-label={listening ? 'Stop listening' : 'Speak'} className="relative grid h-[76px] w-[76px] place-items-center rounded-full disabled:opacity-40">
          {listening && (<><span className="voice-ring absolute inset-0 rounded-full bg-aqua" /><span className="voice-ring voice-ring-delay absolute inset-0 rounded-full bg-mint" /></>)}
          <span className={`relative grid h-[76px] w-[76px] place-items-center rounded-full text-ink shadow-[0_8px_24px_-8px_rgba(31,111,124,0.6)] ${listening ? 'bg-mint' : 'bg-aqua hover:bg-[#74c7d2]'}`}>
            {listening ? <Square size={26} fill="currentColor" /> : <Mic size={32} />}
          </span>
        </button>
        <span className="w-11" />
      </div>
      <p className="mt-2 text-center text-sm font-medium text-muted">
        {micState === 'none' ? t.noMic : micState === 'denied' ? t.denied : listening ? t.listening : t.tap}
      </p>

      {(showKeyboard || micState !== 'ok') && (
        <form onSubmit={sendTyped} className="mt-3 flex gap-2">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t.type} className="input" aria-label="Type a message" />
          <button className="btn btn-primary shrink-0 px-3" aria-label="Send"><Send size={18} /></button>
        </form>
      )}
    </div>
  );
}
