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
// kind: 'denied' (microphone not allowed), 'nomatch' (heard nothing clear), 'network' or 'failed'.
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
  rec.onerror = (e) => {
    if (e.error === 'aborted') return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') onError?.('denied');
    else if (e.error === 'no-speech') onError?.('nomatch');
    else if (e.error === 'network') onError?.('network');
    else onError?.('failed');
  };
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

// The Android plugin reports problems as English messages (see getErrorText in its SpeechRecognition.java)
function errorKind(err) {
  const msg = String(err?.message || err);
  if (/permission/i.test(msg)) return 'denied';
  if (/no match|no speech/i.test(msg)) return 'nomatch';
  if (/network/i.test(msg)) return 'network';
  if (/^-?\d+$/.test(msg)) return 'cancelled'; // the patient closed Google's speech window
  return 'failed';
}

const LISTEN_LIMIT_MS = 20000; // Android sometimes never answers: the mic must not stay "listening" forever
const POPUP_LIMIT_MS = 60000;

function nativeRecognizer(lang, { onFinal, onError, onEnd }) {
  let aborted = false;
  let ended = false;
  let timer;
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    onEnd?.();
  };
  const fail = (kind) => {
    if (!aborted && !ended && kind !== 'cancelled') onError?.(kind);
    finish();
  };
  const stopNative = () => { nativeSpeech().then((s) => s.stop()).catch(() => {}); };
  const limit = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => { stopNative(); fail('failed'); }, ms);
  };

  return {
    async start() {
      try {
        const NativeSpeech = await nativeSpeech();
        const { available } = await NativeSpeech.available();
        if (!available) { fail('failed'); return; }
        let perm = await NativeSpeech.checkPermissions();
        if (perm.speechRecognition !== 'granted') perm = await NativeSpeech.requestPermissions();
        if (perm.speechRecognition !== 'granted') { fail('denied'); return; }
        if (aborted || ended) { finish(); return; }

        const listen = (popup) => NativeSpeech.start({ language: lang, maxResults: 1, partialResults: false, popup });
        // without partial results Android stops by itself when the patient pauses, and returns the final words
        limit(LISTEN_LIMIT_MS);
        let res;
        try {
          res = await listen(false);
        } catch (err) {
          if (aborted || ended || errorKind(err) !== 'failed') throw err;
          // some phone brands default to a recognizer without Tamil or Hindi: Google's own speech window has them
          limit(POPUP_LIMIT_MS);
          res = await listen(true);
        }
        if (aborted || ended) return;
        const text = res?.matches?.[0] || '';
        if (text.trim()) onFinal?.(text);
        else onError?.('nomatch');
      } catch (err) {
        fail(errorKind(err));
      } finally {
        finish();
      }
    },
    stop: stopNative,
    abort: () => { aborted = true; stopNative(); finish(); },
  };
}
