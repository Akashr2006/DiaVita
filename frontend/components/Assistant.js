'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { ASSISTANT_LANGS, converse, newConversation, quickReplies } from '@/lib/assistant';
import { refreshAll } from '@/lib/live';
import { speak, stopSpeaking, voiceQuality } from '@/lib/voice';
import { createRecognizer, isNativeApp, speechInputSupported } from '@/lib/speech';

const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const UI = {
  ta: { listening: 'கேட்டுக்கிட்டு இருக்கேன்… பேசுங்க', tap: 'மைக்கை அழுத்தி பேசுங்க', thinking: 'யோசிக்கிறேன்…', type: 'இங்கே டைப் பண்ணலாம்', noMic: 'இந்த பிரவுசர்ல மைக் இல்ல. கீழே டைப் பண்ணுங்க, இல்ல பட்டனை அழுத்துங்க.', denied: 'மைக் அனுமதி இல்ல. பிரவுசர்ல மைக்கை அனுமதிங்க.', deniedApp: 'மைக் அனுமதி இல்ல. போன் Settings → Apps → DiaVita-ல மைக்கை அனுமதிங்க.', nomatch: 'சரியா கேட்கல. மைக்கை அழுத்தி திரும்ப பேசுங்க.', network: 'இன்டர்நெட் சரியில்ல. திரும்ப முயற்சி பண்ணுங்க, இல்ல கீழே டைப் பண்ணுங்க.', failed: 'இந்த போன்ல இந்த மொழிக்கு குரல் பதிவு வேலை செய்யல. கீழே டைப் பண்ணுங்க, இல்ல பட்டனை அழுத்துங்க.', failedWeb: 'இந்த பிரவுசர்ல குரல் பதிவு வேலை செய்யல. Chrome-ல திறங்க, இல்ல கீழே டைப் பண்ணுங்க.' },
  en: { listening: 'Listening… please speak', tap: 'Tap the mic and speak', thinking: 'Thinking…', type: 'Type here instead', noMic: 'This browser has no microphone support. Type below or tap a button.', denied: 'Microphone is blocked. Please allow it in the browser.', deniedApp: 'Microphone is blocked. Allow it in phone Settings → Apps → DiaVita.', nomatch: 'I could not hear that clearly. Tap the mic and speak again.', network: 'The internet connection is weak. Try again, or type below.', failed: 'Voice input for this language is not working on this phone. Type below or tap a button.', failedWeb: 'Voice input is not working in this browser. Open DiaVita in Chrome, or type below.' },
  hi: { listening: 'सुन रही हूँ… बोलिए', tap: 'माइक दबाकर बोलिए', thinking: 'सोच रही हूँ…', type: 'यहाँ टाइप करें', noMic: 'इस ब्राउज़र में माइक नहीं है। नीचे टाइप करें या बटन दबाएँ।', denied: 'माइक की अनुमति नहीं है। ब्राउज़र में माइक चालू करें।', deniedApp: 'माइक की अनुमति नहीं है। फ़ोन Settings → Apps → DiaVita में माइक चालू करें।', nomatch: 'ठीक से सुनाई नहीं दिया। माइक दबाकर फिर बोलिए।', network: 'इंटरनेट कमज़ोर है। फिर कोशिश करें या नीचे टाइप करें।', failed: 'इस फ़ोन पर इस भाषा में आवाज़ पहचान नहीं चल रही। नीचे टाइप करें या बटन दबाएँ।', failedWeb: 'इस ब्राउज़र में आवाज़ पहचान नहीं चल रही। Chrome में खोलें या नीचे टाइप करें।' },
};

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
  const [micState, setMicState] = useState('ok'); // ok | none | denied | nomatch | network | failed
  const [voice, setVoice] = useState(null); // natural | device | basic | none
  const convoRef = useRef(convo);
  const cacheRef = useRef({});
  const recRef = useRef(null);
  const listenTimer = useRef(null);
  const endRef = useRef(null);
  const settingsRef = useRef({ lang, readAloud });
  convoRef.current = convo;
  settingsRef.current = { lang, readAloud };
  const t = UI[lang];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, interim, busy]);

  // which voice the patient will hear (browsers load their voice list a moment after the page)
  useEffect(() => {
    let alive = true;
    const check = () => voiceQuality(lang).then((q) => alive && setVoice(q));
    check();
    window.speechSynthesis?.addEventListener?.('voiceschanged', check);
    return () => { alive = false; window.speechSynthesis?.removeEventListener?.('voiceschanged', check); };
  }, [lang]);

  const stopListening = useCallback(() => { clearTimeout(listenTimer.current); recRef.current?.abort(); recRef.current = null; setListening(false); setInterim(''); }, []);

  // the browser's speech recognition on websites, Android's own recognizer inside the app (lib/speech.js)
  const startListening = useCallback(() => {
    clearTimeout(listenTimer.current);
    if (!speechInputSupported()) { setMicState('none'); return; }
    stopSpeaking();
    const old = recRef.current;
    recRef.current = null;
    old?.abort();
    const rec = createRecognizer(ASSISTANT_LANGS.find((l) => l.code === settingsRef.current.lang).speech, {
      onInterim: (text) => setInterim(text),
      onFinal: (text) => handleRef.current({ text }, text),
      onError: (kind) => { if (recRef.current === rec) setMicState(kind); },
      onEnd: () => {
        if (recRef.current !== rec) return; // an older session ending must not switch off the current one
        recRef.current = null;
        setListening(false);
        setInterim('');
      },
    });
    recRef.current = rec;
    setListening(true);
    setMicState('ok');
    rec.start();
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
    // a short pause, so the microphone does not catch the end of the reply
    const next = () => { if (listenAfter) listenTimer.current = setTimeout(startListening, 400); };
    if (read) speak(l, r.reply.text, r.reply.roman, next);
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
    if (!speechInputSupported()) setMicState('none');
    window.speechSynthesis?.getVoices();
    const t0 = setTimeout(() => handleRef.current({ intent: 'hello' }), 250);
    return () => { clearTimeout(t0); clearTimeout(listenTimer.current); const r = recRef.current; recRef.current = null; r?.abort(); stopSpeaking(); };
  }, []);

  const changeLang = (code) => {
    if (code === lang) return;
    stopListening();
    stopSpeaking();
    store.set('dv-assistant-lang', code);
    setLangState(code);
    settingsRef.current.lang = code;
    setConvo(newConversation());
    convoRef.current = newConversation();
    setMessages([]);
    handleRef.current({ intent: 'hello' });
  };

  const toggleRead = () => {
    setReadAloud((r) => { store.set('dv-voice-read', r ? '0' : '1'); if (r) stopSpeaking(); return !r; });
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

      {voice && voice !== 'device' && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs ${voice === 'natural' ? 'text-mint-700' : 'text-muted'}`}>
          <Volume2 size={13} className="shrink-0" />
          {voice === 'natural' ? 'Natural voice on (Sarvam AI)'
            : voice === 'basic' ? 'Basic voice: this device has no Tamil voice. Add a Sarvam AI key for a clear, natural voice.'
              : 'This device has no voice for this language. Replies are shown as text.'}
        </p>
      )}

      {/* Conversation */}
      <div className="no-scrollbar mt-3 min-h-[96px] flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-page p-3 ring-1 ring-line" aria-live="polite">
        {messages.map((m, i) => (m.from === 'bot' ? (
          <div key={i} className="flex items-end gap-2">
            <LogoMark size={26} className="mb-0.5" />
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-6 text-ink shadow-sm ring-1 ring-line">
              {m.text}
              <button type="button" onClick={() => speak(lang, m.text, m.roman)} className="ml-1.5 inline-grid h-6 w-6 translate-y-1 place-items-center rounded-md text-brand-600 hover:bg-soft" aria-label="Read this again">
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
        <div className={`no-scrollbar mt-3 grid max-h-[24dvh] shrink-0 gap-2 overflow-y-auto ${chips.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
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
      <div className="mt-3 flex shrink-0 items-center justify-center gap-4">
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
      <p className="mt-2 shrink-0 text-center text-sm font-medium text-muted">
        {listening ? t.listening : micState === 'ok' ? t.tap : micState === 'denied' && isNativeApp() ? t.deniedApp : micState === 'failed' && !isNativeApp() ? t.failedWeb : micState === 'none' ? t.noMic : t[micState]}
      </p>

      {(showKeyboard || !['ok', 'nomatch'].includes(micState)) && (
        <form onSubmit={sendTyped} className="mt-3 flex shrink-0 gap-2">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t.type} className="input" aria-label="Type a message" />
          <button className="btn btn-primary shrink-0 px-3" aria-label="Send"><Send size={18} /></button>
        </form>
      )}
    </div>
  );
}
