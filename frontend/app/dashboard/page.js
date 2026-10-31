'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, CheckCircle2, Circle, CircleHelp, Droplet, FileText, Fingerprint, Flame, Footprints, Gauge,
  Keyboard, Mic, Pill, Plus, Sparkles, Target, Utensils,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { DailyRangeChart, STATUS, WeekFaces, statusOf } from '@/components/charts';
import DemoDataButton from '@/components/DemoDataButton';
import Photo from '@/components/Photo';
import { openVoice } from '@/components/VoiceSheet';
import { Alert, Badge, Empty, Progress, ScoreRing, Section, Spinner, StatCard, TILE_CYCLE } from '@/components/ui';
import { api, CONTEXT_LABELS, fmtDateTime, fmtDay, glucoseStatus } from '@/lib/api';
import { useLiveRefresh } from '@/lib/live';

const TIP_LABEL = {
  success: ['Doing well', 'text-mint-700'],
  warning: ['Watch out', 'text-amber-700'],
  danger: ['Act now', 'text-rose-700'],
  info: ['Tip', 'text-brand-700'],
};

// Big picture buttons for the most common jobs, labelled in English and Tamil
const ACTIONS = [
  { label: 'Talk', ta: 'பேசுங்க', icon: Mic, voice: true, tile: 'bg-aqua' },
  { label: 'Sugar', ta: 'சுகர்', icon: Droplet, href: '/dashboard/glucose', tile: 'bg-sky' },
  { label: 'Food', ta: 'சாப்பாடு', icon: Utensils, href: '/dashboard/meals', tile: 'bg-mint' },
  { label: 'Walk', ta: 'நடை', icon: Footprints, href: '/dashboard/activity', tile: 'bg-ice' },
  { label: 'Tablets', ta: 'மாத்திரை', icon: Pill, href: '/dashboard/medications', tile: 'bg-sky' },
  { label: 'Report', ta: 'ரிப்போர்ட்', icon: FileText, href: '/dashboard/report', tile: 'bg-mint' },
];

// One plain sentence for what to do now, by status of the last reading
const DO_NOW = {
  verylow: 'Take 15 g of sugar now (3 spoons in water) and check again in 15 minutes.',
  low: 'Take 15 g of sugar now and check again in 15 minutes.',
  ok: 'Well done. Keep the same food and walking habits.',
  high: 'Drink water and take a 10 minute walk.',
  veryhigh: 'Drink plenty of water. Call your doctor if it stays this high.',
};

const SMART = [
  { icon: Fingerprint, photo: 'healthy-plate', label: 'Learns from you', title: 'Food Fingerprint', text: 'Shows which foods raise your sugar more or less than expected.', href: '/dashboard/fingerprint' },
  { icon: Sparkles, photo: 'glucometer-high', label: 'Before you eat', title: 'Spike Predictor', text: 'Predicts your sugar after a meal and how much a walk lowers it.', href: '/dashboard/meals' },
  { icon: Mic, photo: 'elder-glucometer', label: 'Tamil · Hindi · English', title: 'Voice entry', text: 'Say your reading. It is saved and the result is read back to you.', voice: true },
  { icon: FileText, photo: 'work-kit', label: 'For your doctor', title: 'Doctor report', text: 'A clear 7, 14 or 30 day summary to print or save as PDF.', href: '/dashboard/report' },
];

function SmartCard({ item, i }) {
  const { icon: Icon, photo, label, title, text, href, voice } = item;
  const body = (
    <>
      <div className="relative h-[150px] overflow-hidden rounded-xl">
        <Photo name={photo} className="transition duration-300 group-hover:scale-[1.03]" />
        <div className={`absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl text-ink shadow-sm ${TILE_CYCLE[i % 4]}`}><Icon size={18} /></div>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <div className="eyebrow text-brand-700">{label}</div>
        <h3 className="mt-1 text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-muted">{text}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink">
          {voice ? 'Speak now' : 'Open'} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </>
  );
  const cls = 'card group flex flex-col p-3 text-left transition hover:border-aqua';
  return voice
    ? <button type="button" onClick={openVoice} className={cls}>{body}</button>
    : <Link href={href} className={cls}>{body}</Link>;
}

function QuickEntry({ onDone, className }) {
  const [mode, setMode] = useState('type');
  const [quick, setQuick] = useState({ value: '', context: 'fasting' });
  const [alert, setAlert] = useState(null);

  async function save(e) {
    e.preventDefault();
    try {
      const res = await api('/glucose', { method: 'POST', body: { value: Number(quick.value), context: quick.context } });
      setAlert(res.alert || { level: 'success', message: 'Reading saved. Nice work staying on track!' });
      setQuick({ ...quick, value: '' });
      onDone();
    } catch (err) {
      setAlert({ level: 'danger', message: err.message });
    }
  }

  return (
    <section className={`card flex flex-col gap-4 p-5 ${className}`}>
      <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-soft p-1 ring-1 ring-line" role="tablist">
        {[['type', 'Type', Keyboard], ['speak', 'Speak', Mic]].map(([k, l, Icon]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition ${mode === k ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'}`}>
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink">Add a sugar reading</h3>
        <p className="text-xs text-muted">{mode === 'type' ? 'Type the number from your glucometer.' : 'Speak in English, Tamil or Hindi.'}</p>
      </div>
      {mode === 'type' ? (
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_1.1fr] gap-2">
            <input type="number" inputMode="decimal" min="20" max="600" required placeholder="mg/dL" aria-label="Glucose value"
              className="input text-base font-semibold" value={quick.value} onChange={(e) => setQuick({ ...quick, value: e.target.value })} />
            <select className="input" value={quick.context} onChange={(e) => setQuick({ ...quick, context: e.target.value })} aria-label="Reading type">
              {Object.entries(CONTEXT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn btn-primary w-full"><Plus size={16} /> Save reading</button>
        </form>
      ) : (
        <button type="button" onClick={openVoice} className="flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br from-sky via-ice to-mint px-4 py-6 text-center transition hover:brightness-[1.03]">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-aqua text-ink shadow-[0_8px_24px_-8px_rgba(31,111,124,0.6)]"><Mic size={28} /></span>
          <span className="text-base font-semibold text-ink">Talk to DiaVita</span>
          <span className="text-xs text-muted">பேசுங்க · बोलिए · "sugar 140 after food"</span>
        </button>
      )}
      {alert && <Alert type={alert.level} onClose={() => setAlert(null)}>{alert.message}</Alert>}
    </section>
  );
}

function GettingStarted({ steps, className }) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <section className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">Getting started</h3>
            <span className="rounded-md bg-mint px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink">Daily</span>
          </div>
          <p className="mt-1 text-xs text-muted">Finish these simple steps every day.</p>
        </div>
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-[11px] font-bold text-ink"
          style={{ background: `conic-gradient(#5ebcc9 ${pct}%, #eef9fa 0)` }}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white">{done}/{steps.length}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col">
        {steps.map((s) => (
          <Link key={s.label} href={s.href} className="flex h-10 items-center justify-between gap-2 rounded-lg px-1 text-sm text-ink hover:bg-soft">
            <span className={s.done ? 'text-muted line-through decoration-line' : ''}>{s.label}</span>
            {s.done ? <CheckCircle2 size={18} className="text-mint-600" /> : <Circle size={18} className="text-slate-300" />}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DashboardHome() {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api('/insights/summary').then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  if (error) return <Alert type="danger" title="Could not load dashboard">{error}</Alert>;
  if (!data) return <Spinner />;

  const { glucose, today, score, score_breakdown: sb, tips } = data;
  const latest = glucose.latest;
  const status = latest && glucoseStatus(latest.value, user.target_min, user.target_max);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const trendRows = glucose.trend.map((d) => ({ ...d, label: fmtDay(d.day), full: new Date(`${d.day}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) }));
  const latestStatus = latest && statusOf(latest.value, user.target_min, user.target_max);
  const LatestFace = latestStatus && STATUS[latestStatus].Face;

  const steps = [
    { label: 'Set your targets', done: Boolean(user.weight_kg && user.height_cm), href: '/dashboard/profile' },
    { label: 'Log a sugar reading', done: glucose.week.count > 0, href: '/dashboard/glucose' },
    { label: 'Add today’s meals', done: today.meals.count > 0, href: '/dashboard/meals' },
    { label: 'Walk 30 minutes', done: today.activity.minutes >= 30, href: '/dashboard/activity' },
    { label: 'Take your medicines', done: today.meds.total > 0 && today.meds.taken >= today.meds.total, href: '/dashboard/medications' },
  ];

  return (
    // Laptop: 680px main column + 344px side column (56px apart). Phone: one column, widgets placed in reading order.
    <div className="flex flex-col gap-12 xl:grid xl:grid-cols-[minmax(0,1fr)_344px] xl:items-start xl:gap-14">
      <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-20">
        <Section
          className="order-1"
          title={`${greet}, ${user.name.split(' ')[0]}`}
          action={<span className="hidden text-sm text-muted sm:block">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
        >
          {glucose.week.count === 0 && (
            <div className="card flex flex-col items-start justify-between gap-3 bg-ice/40 p-5 sm:flex-row sm:items-center">
              <div className="text-sm text-ink"><b>New here?</b> Load 14 days of sample data to explore every feature.</div>
              <DemoDataButton className="btn btn-primary shrink-0" />
            </div>
          )}
          <div className="card flex flex-col gap-6 p-5 sm:flex-row">
            <div className="grid aspect-[16/9] w-full shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky via-ice to-mint sm:aspect-[4/3] sm:w-[46%]">
              <ScoreRing score={score} size={148} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="eyebrow text-muted">Today’s DiaVita Score</div>
              <div className="mt-1 text-lg font-semibold text-ink">
                {score >= 75 ? 'Excellent day, keep going!' : score >= 50 ? 'Good progress, a few things left' : 'Let’s improve today'}
              </div>
              {latest && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-soft p-3 ring-1 ring-line">
                  <LatestFace size={34} color={STATUS[latestStatus].color} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-ink">
                      Last sugar <b className="text-lg tabular-nums">{Math.round(latest.value)}</b> · <b>{STATUS[latestStatus].label}</b> <span className="text-muted">({STATUS[latestStatus].ta})</span>
                    </div>
                    <div className="text-xs text-muted">{DO_NOW[latestStatus]}</div>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3">
                {[['Sugar control', sb.glucose, 40, 'brand'], ['Activity', sb.activity, 25, 'sky'], ['Food', sb.diet, 20, 'violet'], ['Medicines', sb.medication, 15, 'brand']].map(([l, v, m, t]) => (
                  <div key={l}>
                    <div className="mb-1 flex justify-between text-xs text-muted"><span>{l}</span><span className="font-semibold text-ink">{v}/{m}</span></div>
                    <Progress value={v} max={m} tone={t} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section className="order-2" title="What do you want to do?">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {ACTIONS.map(({ label, ta, icon: Icon, href, voice, tile }) => {
              const inner = (
                <>
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl text-ink ${tile}`}><Icon size={26} /></span>
                  <span className="text-[15px] font-semibold leading-5 text-ink">{label}</span>
                  <span className="text-xs leading-4 text-muted">{ta}</span>
                </>
              );
              const cls = 'card flex flex-col items-center gap-1.5 px-1 py-4 text-center transition hover:border-aqua active:scale-[0.98]';
              return voice
                ? <button key={label} type="button" onClick={openVoice} className={cls}>{inner}</button>
                : <Link key={label} href={href} className={cls}>{inner}</Link>;
            })}
          </div>
        </Section>

        <Section className="order-5" title="Your numbers">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-2">
            <div className="card p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="icon-tile h-10 w-10 bg-sky"><Droplet size={20} /></div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted">Latest</div>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold sm:text-[28px]">{latest ? Math.round(latest.value) : '—'}</span>
                <span className="text-sm text-muted">mg/dL</span>
              </div>
              <div className="mt-1.5">{status ? <Badge tone={status.tone}>{status.label}</Badge> : <span className="text-xs text-muted">No readings yet</span>}</div>
            </div>
            <StatCard icon={Gauge} label="Est. HbA1c" value={glucose.estimated_a1c} unit="%" hint={glucose.avg30 ? `30-day avg ${glucose.avg30} mg/dL` : 'Needs readings'} tone="violet" />
            <StatCard icon={Target} label="In range" value={glucose.week.time_in_range} unit="%" hint={`${user.target_min}–${user.target_max} mg/dL · 7 days`} tone="sky" />
            <StatCard icon={Activity} label="Readings" value={glucose.week.count} unit="this week" hint={`${glucose.week.hypo} low · ${glucose.week.hyper} high`} tone="coral" />
          </div>
        </Section>

        <Section className="order-3" title="This week" action={<Link href="/dashboard/glucose" className="text-sm font-semibold text-brand-700 hover:underline">See all readings</Link>}>
          <div className="card p-5">
            {trendRows.length ? (
              <>
                <p className="mb-3 text-xs text-muted">How each day went, by the day's average sugar.</p>
                <WeekFaces days={trendRows} lo={user.target_min} hi={user.target_max} />
                <div className="my-5 h-px bg-line" />
                <h3 className="text-sm font-semibold text-ink">Last 14 days</h3>
                <p className="mb-3 text-xs text-muted">Each bar is one day, from the lowest to the highest reading.</p>
                <DailyRangeChart data={trendRows} lo={user.target_min} hi={user.target_max} height={220} />
              </>
            ) : (
              <Empty icon={Droplet} title="No readings yet" text="Add your first sugar reading to see how your week is going." />
            )}
          </div>
        </Section>

        <Section className="order-7" title="Smart features" action={<Link href="/dashboard/help" className="text-sm font-semibold text-brand-700 hover:underline">How they work</Link>}>
          <div className="grid gap-4 sm:grid-cols-2">
            {SMART.map((item, i) => <SmartCard key={item.title} item={item} i={i} />)}
          </div>
        </Section>

        <Section className="order-8" title="Insights for you">
          <div className="grid gap-4 sm:grid-cols-2">
            {tips.map((t, i) => {
              const [label, color] = TIP_LABEL[t.type] || TIP_LABEL.info;
              return (
                <div key={i} className="card flex flex-col p-5">
                  <div className={`eyebrow ${color}`}>{label}</div>
                  <h3 className="mt-1 text-base font-semibold text-ink">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted">{t.text}</p>
                </div>
              );
            })}
          </div>
          {latest && (
            <p className="text-xs text-muted">
              Last reading: {latest.value} mg/dL ({CONTEXT_LABELS[latest.context]}) · {fmtDateTime(latest.recorded_at)}
            </p>
          )}
        </Section>
      </div>

      <div className="contents xl:flex xl:flex-col xl:gap-6">
        <QuickEntry className="order-4" onDone={load} />
        <GettingStarted className="order-6" steps={steps} />
        <section className="card order-6 flex flex-col gap-4 p-5">
          <h3 className="text-base font-semibold text-ink">Today’s goals</h3>
          {[
            { icon: Utensils, label: 'Carbs', v: Math.round(today.meals.carbs), m: user.daily_carb_goal, unit: 'g', tone: 'sky' },
            { icon: Activity, label: 'Active minutes', v: today.activity.minutes, m: 30, unit: ' min', tone: 'brand' },
            { icon: Footprints, label: 'Steps', v: today.activity.steps, m: user.daily_step_goal, unit: '', tone: 'violet' },
            { icon: Pill, label: 'Medicines', v: today.meds.taken, m: today.meds.total || 0, unit: '', tone: 'brand' },
          ].map(({ icon: Icon, label, v, m, unit, tone }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink"><Icon size={16} className="text-brand-600" /> {label}</span>
                <span className="font-semibold">{v}{unit} <span className="font-normal text-muted">/ {m}{unit}</span></span>
              </div>
              <Progress value={v} max={m} tone={tone} />
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-[10px] bg-soft p-3 text-xs text-muted ring-1 ring-line">
            <Flame size={15} className="text-amber-500" />
            {today.meals.calories} kcal eaten · {today.activity.calories} kcal burned
          </div>
        </section>
        <section className="card order-9 p-5">
          <div className="mb-4 h-28 overflow-hidden rounded-xl"><Photo name="finger-prick" /></div>
          <div className="flex items-center gap-3">
            <div className="icon-tile h-10 w-10 bg-mint"><CircleHelp size={20} /></div>
            <div>
              <h3 className="text-base font-semibold text-ink">Need help?</h3>
              <p className="text-xs text-muted">Simple guides for every page.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/dashboard/help" className="btn btn-soft btn-sm">Open help</Link>
            <Link href="/dashboard/help#voice" className="btn btn-plain btn-sm">Voice tips</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
