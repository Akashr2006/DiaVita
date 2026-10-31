'use client';
import { useEffect, useState } from 'react';
import { Brain, Fingerprint, Footprints, TrendingDown, TrendingUp, Utensils } from 'lucide-react';
import DemoDataButton from '@/components/DemoDataButton';
import { Badge, Empty, PageHeader, Spinner } from '@/components/ui';
import { api, fmtDateTime } from '@/lib/api';
import { useLiveRefresh } from '@/lib/live';

const VERDICT = {
  friendly: { tone: 'green', label: 'Friendly', bar: 'bg-mint-300' },
  moderate: { tone: 'amber', label: 'Moderate', bar: 'bg-amber-500' },
  spike: { tone: 'red', label: 'Spikes you', bar: 'bg-rose-500' },
};

function VsGi({ food }) {
  const pct = Math.round(Math.abs(food.factor - 1) * 100);
  if (food.vs_gi === 'higher') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><TrendingUp size={14} /> {pct}% more than its GI predicts</span>;
  }
  if (food.vs_gi === 'lower') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-mint-700"><TrendingDown size={14} /> {pct}% gentler than its GI predicts</span>;
  }
  return <span className="text-xs text-slate-500">Behaves as its GI predicts</span>;
}

export default function FingerprintPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/smart/food-response').then(setData).catch((e) => setError(e.message)); }, []);
  useLiveRefresh(() => api('/smart/food-response').then(setData).catch(() => {}));

  if (error) return <Empty title="Could not load Food Fingerprint" text={error} />;
  if (!data) return <Spinner />;

  const { model, walk_effect: walk, foods, pairs } = data;
  const maxRise = Math.max(100, ...foods.map((f) => f.rise_per_serving));
  const higher = foods.filter((f) => f.vs_gi === 'higher' && f.meals >= 2);
  const lower = foods.filter((f) => f.vs_gi === 'lower' && f.meals >= 2);

  return (
    <div>
      <PageHeader
        title="Food Fingerprint"
        subtitle="How YOUR body responds to food — learned by pairing each meal with the glucose reading 1–3 hours later."
      />

      {!pairs.length ? (
        <div className="card p-6">
          <Empty
            icon={Fingerprint}
            title="Not enough paired data yet"
            text="Log a meal on Smart Plate, then add an 'After meal' glucose reading 1–3 hours later. After 3 such pairs DiaVita starts learning your personal response."
          />
          <div className="flex justify-center"><DemoDataButton className="btn btn-primary" /></div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-sky via-ice to-mint p-5 text-ink">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-800"><Brain size={16} /> Your sugar sensitivity</div>
              <div className="mt-3 text-4xl font-bold">{model.k}</div>
              <div className="text-sm text-ink/75">mg/dL rise per unit of glycemic load</div>
              <div className="mt-3 text-xs text-ink/65">
                {model.personalised
                  ? `Learned from ${model.pairs} meal → glucose pairs · model fit R² ${model.r2}`
                  : `Using the population default until ${3 - model.pairs} more paired meals are logged`}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Footprints size={16} className="text-brand-600" /> Your walk effect</div>
              {walk ? (
                <>
                  <div className="mt-3 text-4xl font-bold text-brand-700">−{Math.max(0, walk.percent)}%</div>
                  <div className="text-sm text-slate-600">smaller spike when you walk ~{walk.avg_walk_min} min after a meal</div>
                  <div className="mt-3 text-xs text-slate-500">≈ {Math.max(0, walk.saved_mgdl)} mg/dL saved on a typical meal · {walk.samples} meals compared</div>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Log a 10+ minute walk within an hour after some meals and DiaVita will measure how much walking helps <b>you</b>.</p>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Fingerprint size={16} className="text-brand-600" /> Personal discoveries</div>
              <ul className="mt-3 space-y-2 text-sm">
                {higher.slice(0, 2).map((f) => (
                  <li key={f.name}><b>{f.name}</b> spikes you <span className="font-semibold text-rose-600">{Math.round((f.factor - 1) * 100)}% more</span> than its GI suggests.</li>
                ))}
                {lower.slice(0, 2).map((f) => (
                  <li key={f.name}><b>{f.name}</b> is <span className="font-semibold text-mint-700">{Math.round((1 - f.factor) * 100)}% gentler</span> on you than its GI suggests.</li>
                ))}
                {!higher.length && !lower.length && <li className="text-slate-500">Your foods behave close to their GI so far. Keep logging to find personal patterns.</li>}
              </ul>
            </div>
          </section>

          <section className="card mt-4 p-5">
            <h2 className="font-bold">Your personal food ranking</h2>
            <p className="mb-4 text-xs text-slate-500">Estimated glucose rise from one serving, for you. Same food, different people — different spikes.</p>
            <div className="space-y-3">
              {foods.map((f) => {
                const v = VERDICT[f.verdict];
                return (
                  <div key={f.name} className="grid gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{f.name}</div>
                      <div className="text-xs text-slate-500">GI {f.gi} · seen in {f.meals} meal{f.meals > 1 ? 's' : ''}</div>
                    </div>
                    <div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${v.bar}`} style={{ width: `${(f.rise_per_serving / maxRise) * 100}%` }} />
                      </div>
                      <div className="mt-1"><VsGi food={f} /></div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span className="text-sm font-bold">+{f.rise_per_serving} mg/dL</span>
                      <Badge tone={v.tone}>{v.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="card p-5">
              <h2 className="font-bold">How it works</h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-600">
                <li><b className="text-slate-900">1. Pair:</b> each meal is matched with your reading just before it and the highest reading 45–180 min after it.</li>
                <li><b className="text-slate-900">2. Learn:</b> a least-squares model fits your sensitivity <i>k</i> (rise per unit of glycemic load).</li>
                <li><b className="text-slate-900">3. Personalise:</b> each food gets a factor = actual rise ÷ rise its GI predicts. Walk days are compared separately.</li>
                <li><b className="text-slate-900">4. Use it:</b> Smart Plate predicts your spike <i>before</i> you eat.</li>
              </ol>
            </div>
            <div className="card overflow-hidden lg:col-span-2">
              <div className="border-b border-slate-100 px-5 py-4 font-bold">Recent meal → glucose pairs</div>
              <ul className="divide-y divide-slate-100">
                {pairs.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Utensils size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold capitalize">{p.meal_type}: {p.items.join(', ')}</div>
                      <div className="text-xs text-slate-500">{fmtDateTime(p.recorded_at)} · GL {p.gl}{p.walked ? ' · walked after' : ''}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold">{p.baseline} → {p.peak}</div>
                      <div className={`text-xs font-semibold ${p.rise >= 60 ? 'text-rose-600' : p.rise >= 30 ? 'text-amber-600' : 'text-mint-700'}`}>+{p.rise} mg/dL</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
