// Installs DiaVita.apk on the emulator and checks the voice from inside the real app, through the WebView's debug port.
// Prints a report; run by .github/workflows/android-test.yml.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PKG = 'app.diavita.mobile';
const OUT = 'android-test-results';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
const shot = (name) => { try { sh(`adb exec-out screencap -p > ${OUT}/${name}.png`); } catch { /* best effort */ } };
const report = {};
const note = (key, value) => { report[key] = value; console.log(`${key}: ${JSON.stringify(value)}`); };

class Page {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.console = []; }

  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('devtools socket failed')); });
    const page = new Page(ws);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && page.waiting.has(m.id)) { page.waiting.get(m.id)(m); page.waiting.delete(m.id); }
      if (m.method === 'Runtime.consoleAPICalled') page.console.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 300));
      if (m.method === 'Runtime.exceptionThrown') page.console.push(`exception: ${m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text}`.slice(0, 300));
      if (m.method === 'Log.entryAdded') page.console.push(`log ${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url || ''}`.slice(0, 300));
    };
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    return page;
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res) => this.waiting.set(id, res));
  }

  // Runs an expression in the app; returns its value, or { threw } if it failed
  async run(expression) {
    const m = await this.send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true, userGesture: false });
    if (m.result?.exceptionDetails) return { threw: m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text };
    return m.result?.result?.value;
  }
}

const within = (ms, call) => `Promise.race([${call}, new Promise((r) => setTimeout(() => r({ timedOutAfterMs: ${ms} }), ${ms}))]).catch((e) => ({ rejected: String(e?.message || e) }))`;
const native = (plugin, method, opts = {}) => `Capacitor.nativePromise('${plugin}', '${method}', ${JSON.stringify(opts)})`;

async function connect() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const pid = sh(`adb shell pidof ${PKG}`);
      sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);
      const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
      const target = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) return Page.open(target.webSocketDebuggerUrl);
    } catch { /* the app is still starting */ }
    await sleep(3000);
  }
  throw new Error('could not reach the app WebView');
}

(async () => {
  note('android', sh('adb shell getprop ro.build.version.release'));
  sh('adb install -r DiaVita.apk');
  sh('adb logcat -c');
  sh(`adb shell pm grant ${PKG} android.permission.RECORD_AUDIO`);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(10000);
  note('speech services', sh('adb shell cmd package query-services -a android.speech.RecognitionService --brief || true').split('\n').filter((l) => l.includes('/')));
  note('tts services', sh('adb shell cmd package query-services -a android.intent.action.TTS_SERVICE --brief || true').split('\n').filter((l) => l.includes('/')));

  const page = await connect();
  note('page', await page.run('return location.href'));
  note('bridge', await page.run(`return { capacitor: typeof Capacitor, native: Capacitor?.isNativePlatform?.(), plugins: (Capacitor?.PluginHeaders || []).map((p) => p.name) }`));

  // log in as the demo patient and open the dashboard the normal way
  const login = await page.run(`
    const r = await fetch('https://diavita-api.vercel.app/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@diavita.app', password: 'demo1234' }) });
    const d = await r.json();
    localStorage.setItem('diavita_token', d.token);
    localStorage.setItem('dv-assistant-lang', 'en');
    window.__token = d.token;
    return { status: r.status };`);
  note('login from the app (CORS included)', login);
  await page.run(`location.href = '/'; return 1`);
  await sleep(12000);
  const page2 = await connect();
  note('after login', await page2.run('return { href: location.href, text: document.body.innerText.slice(0, 80) }'));
  shot('1-dashboard');

  // ---- plugins, called directly ----
  note('webview', await page2.run('return navigator.userAgent'));
  note('voice input on this phone', await page2.run(`return await ${within(10000, native('DiaSpeech', 'check'))}`));
  note('speech available', await page2.run(`return await ${within(10000, native('SpeechRecognition', 'available'))}`));
  note('speech permission', await page2.run(`return await ${within(10000, native('SpeechRecognition', 'checkPermissions'))}`));
  for (const language of ['en-IN', 'ta-IN']) {
    note(`speech listen ${language} (no one speaks)`, await page2.run(`return await ${within(25000, native('SpeechRecognition', 'start', { language, maxResults: 1, partialResults: false, popup: false }))}`));
    await sleep(1500);
  }
  for (const lang of ['ta-IN', 'hi-IN', 'en-IN']) {
    note(`phone voice supports ${lang}`, await page2.run(`return await ${within(15000, native('TextToSpeech', 'isLanguageSupported', { lang }))}`));
  }
  note('phone voice speaks', await page2.run(`return await ${within(25000, native('TextToSpeech', 'speak', { text: 'Hello from DiaVita', lang: 'en-IN', rate: 1, pitch: 1, volume: 1, category: 'ambient', queueStrategy: 0 }))}`));

  // ---- natural voice, the same way lib/voice.js plays it ----
  note('natural voice clip', await page2.run(`
    const token = localStorage.getItem('diavita_token');
    const t0 = Date.now();
    const r = await fetch('https://diavita-api.vercel.app/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ text: 'Hello, I am DiaVita.', lang: 'en' }) });
    const blob = await r.blob();
    const fetched = Date.now() - t0;
    const audio = new Audio(URL.createObjectURL(blob));
    const events = [];
    ['loadedmetadata', 'playing', 'ended', 'error', 'stalled', 'waiting'].forEach((n) => audio.addEventListener(n, () => events.push(n + '@' + (Date.now() - t0))));
    const played = await audio.play().then(() => 'started').catch((e) => e.name + ': ' + e.message);
    await new Promise((res) => { audio.addEventListener('ended', res); audio.addEventListener('error', res); setTimeout(res, 15000); });
    return { status: r.status, type: blob.type, bytes: blob.size, fetchedMs: fetched, played, duration: audio.duration, position: audio.currentTime, error: audio.error?.message, events };`));

  // ---- the real assistant, as a patient uses it ----
  await page2.run(`window.dispatchEvent(new CustomEvent('diavita:open-voice')); return 1`);
  await sleep(4000);
  shot('2-assistant-open');
  const status = `[...document.querySelectorAll('[role=dialog] p')].map((p) => p.innerText).filter(Boolean).slice(-6)`;
  note('assistant after opening', await page2.run(`return ${status}`));
  const micInfo = `(() => { const b = document.querySelector('button[aria-label="Speak"], button[aria-label="Stop listening"]'); const r = b?.getBoundingClientRect(); return { label: b?.getAttribute('aria-label'), fullyOnScreen: r ? r.top >= 0 && r.bottom <= innerHeight : false, bottom: Math.round(r?.bottom || 0), screen: innerHeight }; })()`;
  await sleep(8000);
  shot('3-assistant-after-greeting');
  note('mic after greeting', await page2.run(`return ${micInfo}`));
  await sleep(14000);
  shot('4-assistant-after-silence');
  note('mic after 14 s of silence (must not be stuck)', await page2.run(`return { mic: ${micInfo}, text: ${status} }`));
  let stopped = null;
  const t1 = Date.now();
  for (let i = 0; i < 26 && !stopped; i += 1) {
    await sleep(2000);
    const m = await page2.run(`return { label: ${micInfo}.label, text: ${status} }`);
    if (m?.label === 'Speak') stopped = m;
  }
  note('mic stops by itself after silence', { stoppedAfterMs: stopped ? Date.now() - t1 : null, message: stopped?.text?.slice(-2, -1)[0] });
  shot('4b-after-mic-stops');
  await sleep(1000);
  const direct = page2.run(`return await ${within(12000, native('SpeechRecognition', 'start', { language: 'ta-IN', maxResults: 1, partialResults: false, popup: true }))}`);
  await sleep(5000);
  shot('4c-speech-window');
  note('screen while the speech window is open', sh('adb shell dumpsys activity activities | grep -m1 -E "topResumedActivity|ResumedActivity" || true'));
  sh('adb shell input keyevent KEYCODE_BACK');
  note('speech window closed by the patient', await direct);
  await sleep(1500);

  // ---- a patient's sentence goes in, a real record comes out ----
  await page2.run(`document.querySelector('button[aria-label="Stop listening"]')?.click(); document.querySelector('button[aria-label="Type instead"]')?.click(); return 1`);
  await sleep(600);
  const send = (text) => page2.run(`
    const box = document.querySelector('input[aria-label="Type a message"]');
    if (!box) return 'no typing box';
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, ${JSON.stringify(text)});
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    box.form.requestSubmit();
    await new Promise((r) => setTimeout(r, 5000));
    return [...document.querySelectorAll('[role=dialog] [aria-live] > div')].map((d) => d.innerText.trim()).filter(Boolean).slice(-1)[0]?.slice(0, 140);`);
  for (const line of ['my sugar is 137', 'fasting', 'yes']) note(`assistant: "${line}"`, await send(line));
  const api = (path, opts = '') => `fetch('https://diavita-api.vercel.app/api${path}', { headers: { Authorization: 'Bearer ' + localStorage.getItem('diavita_token'), 'Content-Type': 'application/json' }${opts} }).then((r) => r.status === 204 ? 204 : r.json())`;
  const found = await page2.run(`const g = await ${api('/glucose?days=1')}; const list = Array.isArray(g) ? g : g.readings || []; return list.filter((x) => Number(x.value) === 137).map((x) => x.id)`);
  note('saved reading found in the database', found);
  shot('5-assistant-saved');
  for (const id of found || []) await page2.run(`return await ${api(`/glucose/${id}`, ", method: 'DELETE'")}`);

  // ---- live sync: a reading added elsewhere (the laptop) shows up in the app by itself ----
  await page2.run(`document.querySelector('[role=dialog] button[aria-label="Close"]')?.click(); return 1`);
  await sleep(1500);
  const added = await page2.run(`return await ${api('/glucose', ", method: 'POST', body: JSON.stringify({ value: 211, context: 'random', note: 'sync test' })")}`);
  const t0 = Date.now();
  let seen = false;
  for (let i = 0; i < 16 && !seen; i += 1) { await sleep(1000); seen = await page2.run(`return document.body.innerText.includes('211')`); }
  note('reading from another device appears without reload', { seen, afterMs: Date.now() - t0 });
  shot('6-live-sync');
  if (added?.reading?.id) await page2.run(`return await ${api(`/glucose/${added.reading.id}`, ", method: 'DELETE'")}`);

  note('app console', [...new Set(page2.console)].slice(-30));
  const log = sh(`adb logcat -d -v brief`);
  fs.writeFileSync(`${OUT}/logcat.txt`, log);
  console.log('\n--- logcat (voice related) ---');
  console.log(log.split('\n').filter((l) => /Capacitor\/|SpeechRecogni|TextToSpeech|TTS|RecognitionService|FATAL|AndroidRuntime|E\/chromium|Permission/i.test(l)).slice(-70).join('\n'));
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error('TEST STOPPED:', e.message);
  try { fs.writeFileSync(`${OUT}/logcat.txt`, sh('adb logcat -d -v brief')); } catch { /* best effort */ }
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  process.exit(1);
});
