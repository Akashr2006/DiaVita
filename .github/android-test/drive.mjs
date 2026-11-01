// Installs DiaVita.apk on the emulator and checks the voice from inside the real app, through the WebView's debug port.
// Prints a report; run by .github/workflows/android-test.yml.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PKG = 'app.diavita.mobile';
const OUT = 'android-test-results';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
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
  await sleep(14000);
  shot('3-assistant-after-greeting');
  note('assistant after greeting', await page2.run(`return { mic: document.querySelector('button[aria-label="Speak"], button[aria-label="Stop listening"]')?.getAttribute('aria-label'), text: ${status} }`));
  await sleep(25000);
  shot('4-assistant-after-silence');
  note('assistant after silence', await page2.run(`return { mic: document.querySelector('button[aria-label="Speak"], button[aria-label="Stop listening"]')?.getAttribute('aria-label'), text: ${status} }`));

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
