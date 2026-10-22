'use client';
import { useState } from 'react';
import { Footprints, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui';
import { glucoseStatus, predictSpike } from '@/lib/api';

const WALKS = [0, 10, 15, 30];

// "What-if before you eat": predicted post-meal peak for the current plate, and how a walk changes it
export default function SpikePredictor({ model, plate, lo = 70, hi = 180 }) {
  const [walk, setWalk] = useState(0);
  if (!model || !plate.length) return null;

  const now = predictSpike(model, plate, 0);
  const pred = predictSpike(model, plate, walk);
  const s = glucoseStatus(pred.peak, lo, hi);
  const personalFoods = plate.filter(({ food }) => model.food_factors?.[food.name] !== undefined).length;

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-800"><Sparkles size={16} /> Spike Predictor</div>
        <Badge tone={model.personalised ? 'brand' : 'slate'}>{model.personalised ? 'Personalised to you' : 'Default model'}</Badge>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Predicted peak</div>
          <div className="text-3xl font-extrabold text-slate-900">~{pred.peak}<span className="ml-1 text-sm font-medium text-slate-500">mg/dL</span></div>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {model.baseline} ({model.baseline_source}) + {pred.rise} rise
        {personalFoods > 0 && ` · ${personalFoods} food${personalFoods > 1 ? 's' : ''} adjusted to your Food Fingerprint`}
      </p>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Footprints size={14} /> What if I walk after eating?</div>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {WALKS.map((m) => (
            <button key={m} type="button" onClick={() => setWalk(m)}
              className={`rounded-lg py-1.5 text-xs font-semibold ${walk === m ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {m ? `${m} min` : 'No walk'}
            </button>
          ))}
        </div>
        {walk > 0 && (
          <p className="mt-2 text-xs font-semibold text-emerald-700">
            A {walk}-minute walk could lower your peak by ~{now.peak - pred.peak} mg/dL
            {model.walk_personalised ? ' (based on your own walk data)' : ''}.
          </p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Estimate for guidance only — confirm with a post-meal reading.</p>
    </div>
  );
}
