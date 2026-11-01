'use client';
// How DiaVita listens. On a website: the browser's Web Speech API (Chrome / Edge).
// Inside the Android app: Android's own speech recognizer (an Android WebView has no Web Speech API).
// The Android shell injects window.Capacitor. The plugin is loaded only there, and only when needed:
// it touches `window` when imported, which would break building the pages ahead of time.
export const isNativeApp = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
// Keep the plugin inside the imported module object: a Capacitor plugin answers every property with a native call,
// "then" included, so a promise that resolves to the plugin itself never finishes.
const speechModule = () => import('@capacitor-community/speech-recognition');

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
  let liveText = '';
  let reported = false;
  rec.onresult = (e) => {
    let done = '';
    let live = '';
    for (const r of e.results) { if (r.isFinal) done += r[0].transcript; else live += r[0].transcript; }
    finalText = done;
    liveText = live;
    onInterim?.(`${done} ${live}`.trim());
  };
  rec.onerror = (e) => {
    if (e.error === 'aborted') return;
    reported = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') onError?.('denied');
    else if (e.error === 'no-speech') onError?.('nomatch');
    else onError?.('failed'); // 'network' here means this browser has no speech service (Chrome has one)
  };
  rec.onend = () => {
    // phone browsers often stop without marking the last words final: those words still count
    const heard = `${finalText} ${liveText}`.trim();
    if (heard) onFinal?.(heard);
    else if (!reported) onError?.('nomatch');
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

const SPEECH_START_MS = 10000; // the recognizer has this long to hear something, or to say why it cannot
const LISTEN_LIMIT_MS = 30000; // the longest one sentence may take once the patient is speaking
const RESULT_WAIT_MS = 8000; // after the patient stops talking, the words should arrive within this
const WINDOW_LIMIT_MS = 60000;

// Does this phone have Google's speech window? It handles Tamil and Hindi when the default recognizer cannot.
const hasSpeechWindow = () => window.Capacitor.nativePromise('DiaSpeech', 'check', {}).then((r) => Boolean(r.speechWindow)).catch(() => false);

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
  const stopNative = () => { speechModule().then((m) => m.SpeechRecognition.stop()).catch(() => {}); };

  // Listen without any window. Rejects as 'failed' if the recognizer never answers (seen on Android 14).
  const listenQuietly = async (NativeSpeech) => {
    let handle;
    let giveUp;
    const silent = new Promise((_, reject) => {
      giveUp = (ms) => { clearTimeout(timer); timer = setTimeout(() => reject(new Error('recognizer did not answer')), ms); };
    });
    giveUp(SPEECH_START_MS);
    try {
      handle = NativeSpeech.addListener('listeningState', ({ status }) => { giveUp(status === 'started' ? LISTEN_LIMIT_MS : RESULT_WAIT_MS); });
      return await Promise.race([NativeSpeech.start({ language: lang, maxResults: 1, partialResults: false, popup: false }), silent]);
    } finally {
      clearTimeout(timer);
      handle?.remove?.();
    }
  };

  const listenInWindow = (NativeSpeech) => {
    timer = setTimeout(() => { stopNative(); fail('failed'); }, WINDOW_LIMIT_MS);
    return NativeSpeech.start({ language: lang, maxResults: 1, partialResults: false, popup: true });
  };

  return {
    async start() {
      try {
        const NativeSpeech = (await speechModule()).SpeechRecognition;
        const { available } = await NativeSpeech.available();
        let perm = await NativeSpeech.checkPermissions();
        if (perm.speechRecognition !== 'granted') perm = await NativeSpeech.requestPermissions();
        if (perm.speechRecognition !== 'granted') { fail('denied'); return; }
        if (aborted || ended) { finish(); return; }

        let res;
        try {
          // without partial results Android stops by itself when the patient pauses, and returns the final words
          if (!available) throw new Error('no default recognizer');
          res = await listenQuietly(NativeSpeech);
        } catch (err) {
          if (aborted || ended || errorKind(err) !== 'failed') throw err;
          stopNative();
          // the default recognizer cannot do this language or does not answer: use Google's window, if the phone has one
          if (!(await hasSpeechWindow())) throw err;
          if (aborted || ended) return;
          res = await listenInWindow(NativeSpeech);
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
