'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Droplet, Fingerprint, Flame, Footprints, Gauge, Pill, Plus, Target, Utensils } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import GlucoseChart from '@/components/GlucoseChart';
import DemoDataButton from '@/components/DemoDataButton';
import VoiceEntry from '@/components/VoiceEntry';
import { Alert, Badge, Empty, Progress, ScoreRing, Spinner, StatCard } from '@/components/ui';
import { api, CONTEXT_LABELS, fmtDateTime, fmtDay, glucoseStatus } from '@/lib/api';

export default function DashboardHome() {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [quick, setQuick] = useState({ value: '', context: 'fasting' });
  const [alert, setAlert] = useState(null);

  const load = useCallback(() => api('/insights/summary').then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function quickAdd(e) {
    e.preventDefault();
    try {
      const res = await api('/glucose', { method: 'POST', body: { value: Number(quick.value), context: quick.context } });
      setAlert(res.alert || { level: 'success', message: 'Reading saved. Nice work staying on track!' });
      setQuick({ ...quick, value: '' });
      load();
    } catch (err) {
      setAlert({ level: 'danger', message: err.message });
    }
  }

  if (error) return <Alert type="danger" title="Could not load dashboard">{error}</Alert>;
  if (!data) return <Spinner />;

  const { glucose, today, score, score_breakdown: sb, tips } = data;
  const latest = glucose.latest;
  const status = latest && glucoseStatus(latest.value, user.target_min, user.target_max);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const chartData = glucose.trend.map((d) => ({ label: fmtDay(d.day), value: d.avg }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{greet}, {user.name.split(' ')[0]} 👋</h1>
      </div>

      {glucose.week.count === 0 && (
        <div className="card flex flex-col items-start justify-between gap-3 border-brand-200 bg-brand-50/60 p-4 sm:flex-row sm:items-center">
          <div className="text-sm text-slate-700"><b>New here?</b> Load 14 days of sample data to explore every feature, including Food Fingerprint.</div>
          <DemoDataButton className="btn btn-primary shrink-0" />
        </div>
      )}

      {/* Score hero */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 to-brand-600 p-5 text-white sm:p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-300/20 blur-2xl" />
          <div className="relative flex flex-col items-center gap-6 sm:flex-row">
            <ScoreRing score={score} />
            <div className="w-full flex-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-100">Today’s DiaVita Score</div>
              <div className="mt-1 text-xl font-bold">
                {score >= 75 ? 'Excellent day — keep going!' : score >= 50 ? 'Good progress, a few things left' : 'Let’s improve today'}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[['Glucose control', sb.glucose, 40], ['Activity', sb.activity, 25], ['Diet quality', sb.diet, 20], ['Medication', sb.medication, 15]].map(([l, v, m]) => (
                  <div key={l}>
                    <div className="mb-1 flex justify-between text-xs text-brand-50/90"><span>{l}</span><span>{v}/{m}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-white" style={{ width: `${(v / m) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick add */}
        <form onSubmit={quickAdd} className="card flex flex-col p-5">
          <div className="flex items-center gap-2 font-bold"><Droplet size={18} className="text-brand-600" /> Quick glucose entry</div>
          <div className="mt-4 flex gap-2">
            <input
              type="number" inputMode="decimal" min="20" max="600" required placeholder="mg/dL"
              className="input text-lg font-bold" value={quick.value}
              onChange={(e) => setQuick({ ...quick, value: e.target.value })} aria-label="Glucose value"
            />
            <select className="input" value={quick.context} onChange={(e) => setQuick({ ...quick, context: e.target.value })} aria-label="Reading type">
              {Object.entries(CONTEXT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn btn-primary mt-3"><Plus size={16} /> Save reading</button>
          <div className="mt-3"><VoiceEntry onSaved={(a) => { setAlert(a); load(); }} /></div>
          {alert && (
            <div className="mt-3">
              <Alert type={alert.level} onClose={() => setAlert(null)}>{alert.message}</Alert>
            </div>
          )}
        </form>
      </section>

      {/* Key stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Droplet size={20} /></div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest</div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold sm:text-3xl">{latest ? Math.round(latest.value) : '—'}</span>
            <span className="text-sm text-slate-500">mg/dL</span>
          </div>
          <div className="mt-1.5">{status ? <Badge tone={status.tone}>{status.label}</Badge> : <span className="text-xs text-slate-500">No readings yet</span>}</div>
        </div>
        <StatCard icon={Gauge} label="Est. HbA1c" value={glucose.estimated_a1c} unit="%" hint={glucose.avg30 ? `30-day avg ${glucose.avg30} mg/dL` : 'Needs readings'} tone="violet" />
        <StatCard icon={Target} label="Time in range" value={glucose.week.time_in_range} unit="%" hint={`${user.target_min}–${user.target_max} mg/dL · 7 days`} tone="sky" />
        <StatCard icon={Activity} label="Readings" value={glucose.week.count} unit="this week" hint={`${glucose.week.hypo} low · ${glucose.week.hyper} high`} tone="coral" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Glucose trend</h2>
              <p className="text-xs text-slate-500">Daily average · last 14 days · green band = your target</p>
            </div>
            <Link href="/dashboard/glucose" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          {chartData.length ? (
            <GlucoseChart data={chartData} lo={user.target_min} hi={user.target_max} />
          ) : (
            <Empty icon={Droplet} title="No readings yet" text="Add your first glucose reading to see your trend line." />
          )}
        </div>

        {/* Today */}
        <div className="card space-y-5 p-5">
          <h2 className="font-bold">Today’s goals</h2>
          {[
            { icon: Utensils, label: 'Carbs', v: Math.round(today.meals.carbs), m: user.daily_carb_goal, unit: 'g', tone: 'amber' },
            { icon: Activity, label: 'Active minutes', v: today.activity.minutes, m: 30, unit: 'min', tone: 'brand' },
            { icon: Footprints, label: 'Steps', v: today.activity.steps, m: user.daily_step_goal, unit: '', tone: 'sky' },
            { icon: Pill, label: 'Medicines taken', v: today.meds.taken, m: today.meds.total || 0, unit: '', tone: 'violet' },
          ].map(({ icon: Icon, label, v, m, unit, tone }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700"><Icon size={16} className="text-slate-400" /> {label}</span>
                <span className="font-semibold">{v}{unit} <span className="font-normal text-slate-400">/ {m}{unit}</span></span>
              </div>
              <Progress value={v} max={m} tone={tone} />
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <Flame size={16} className="text-rose-500" />
            {today.meals.calories} kcal eaten · {today.activity.calories} kcal burned
          </div>
        </div>
      </section>

      {/* Innovation teaser */}
      <Link href="/dashboard/fingerprint" className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-600 to-brand-600 p-5 text-white shadow-sm transition hover:shadow-lg">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><Fingerprint size={26} /></div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Your Food Fingerprint</div>
          <div className="text-sm text-white/85">See which foods spike <b>you</b> — learned from your own meals and readings.</div>
        </div>
        <ArrowRight className="shrink-0 transition group-hover:translate-x-1" />
      </Link>

      {/* Insights */}
      <section className="card p-5">
        <h2 className="mb-1 font-bold">Smart insights for you</h2>
        <p className="mb-4 text-xs text-slate-500">Generated from your last 7–14 days of data</p>
        <div className="grid gap-3 md:grid-cols-2">
          {tips.map((t, i) => <Alert key={i} type={t.type} title={t.title}>{t.text}</Alert>)}
        </div>
        {latest && (
          <p className="mt-4 text-xs text-slate-400">
            Last reading: {latest.value} mg/dL ({CONTEXT_LABELS[latest.context]}) · {fmtDateTime(latest.recorded_at)}
          </p>
        )}
      </section>
    </div>
  );
}
