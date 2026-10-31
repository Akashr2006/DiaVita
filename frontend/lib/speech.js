'use client';
// How DiaVita listens. On a website: the browser's Web Speech API (Chrome / Edge).
// Inside the Android app: Android's own speech recognizer (an Android WebView has no Web Speech API).
// The Android shell injects window.Capacitor. The plugin is loaded only there, and only when needed:
// it touches `window` when imported, which would break building the pages ahead of time.
export const isNativeApp = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
const nativeSpeech = () => import('@capacitor-community/speech-recognition').then((m) => m.SpeechRecognition);

export function speechInputSupported() {
  if (typeof window === 'undefined') return false;
  return isNativeApp() || Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// One listening session. Callbacks: onInterim(text) while speaking (websites only), onFinal(text), onError(kind), onEnd().
// kind is 'denied' when the microphone is not allowed, otherwise 'failed'.
export function createRecognizer(lang, { onInterim, onFinal, onError, onEnd }) {
  return isNativeApp() ? nativeRecognizer(lang, { onFinal, onError, onEnd }) : webRecognizer(lang, { onInterim, onFinal, onError, onEnd });
}

function webRecognizer(lang, { onInterim, onFinal, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let live = '';
    for (const r of e.results) { if (r.isFinal) finalText = r[0].transcript; else live += r[0].transcript; }
    onInterim?.(finalText || live);
  };
  rec.onerror = (e) => onError?.(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'failed');
  rec.onend = () => {
    if (finalText.trim()) onFinal?.(finalText);
    onEnd?.();
  };
  return {
    start: () => { try { rec.start(); } catch { onEnd?.(); } },
    stop: () => rec.stop(),
    abort: () => { rec.onresult = null; rec.onend = () => onEnd?.(); rec.abort(); },
  };
}

function nativeRecognizer(lang, { onFinal, onError, onEnd }) {
  let aborted = false;
  return {
    async start() {
      try {
        const NativeSpeech = await nativeSpeech();
        const { available } = await NativeSpeech.available();
        if (!available) { onError?.('failed'); return; }
        let perm = await NativeSpeech.checkPermissions();
        if (perm.speechRecognition !== 'granted') perm = await NativeSpeech.requestPermissions();
        if (perm.speechRecognition !== 'granted') { onError?.('denied'); return; }
        // without partial results Android stops by itself when the patient pauses, and returns the final words
        const res = await NativeSpeech.start({ language: lang, maxResults: 1, partialResults: false, popup: false });
        const text = res?.matches?.[0] || '';
        if (!aborted && text.trim()) onFinal?.(text);
      } catch (err) {
        if (!aborted) onError?.(/permission/i.test(String(err?.message || err)) ? 'denied' : 'failed');
      } finally {
        onEnd?.();
      }
    },
    stop: () => { nativeSpeech().then((s) => s.stop()).catch(() => {}); },
    abort: () => { aborted = true; nativeSpeech().then((s) => s.stop()).catch(() => {}); },
  };
}
