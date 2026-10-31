'use client';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Frown, Meh, Smile } from 'lucide-react';
import { CONTEXT_LABELS } from '@/lib/api';

// Sugar status colours (checked with the dataviz palette validator for colour-blind separation).
// Every use also shows a word and a face icon, so colour is never the only signal.
export const STATUS = {
  verylow: { color: '#9f1239', label: 'Very low', ta: 'ரொம்ப குறைவு', Face: Frown },
  low: { color: '#f27396', label: 'Low', ta: 'குறைவு', Face: Meh },
  ok: { color: '#1f8a5b', label: 'In range', ta: 'சரியான அளவு', Face: Smile },
  high: { color: '#d29115', label: 'High', ta: 'அதிகம்', Face: Meh },
  veryhigh: { color: '#a8431c', label: 'Very high', ta: 'ரொம்ப அதிகம்', Face: Frown },
};
export const STATUS_ORDER = ['verylow', 'low', 'ok', 'high', 'veryhigh'];

export function statusOf(v, lo = 70, hi = 180) {
  if (v < 54) return 'verylow';
  if (v < Math.min(lo, 70)) return 'low';
  if (v < lo) return 'low';
  if (v <= hi) return 'ok';
  if (v <= 250) return 'high';
  return 'veryhigh';
}

const INK = '#0d2b30';
const MUTED = '#567277';
const GRID = '#e3f1f3';

function Face({ status, size = 18 }) {
  const { Face: Icon, color } = STATUS[status];
  return <Icon size={size} color={color} strokeWidth={2.2} aria-hidden="true" />;
}

function DayTip({ active, payload, lo, hi }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const st = statusOf(d.avg, lo, hi);
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink shadow-lg">
      <div className="font-semibold">{d.full || d.label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <Face status={st} size={15} />
        <span>Average <b>{d.avg}</b> mg/dL · {STATUS[st].label}</span>
      </div>
      <div className="mt-0.5 text-muted">Lowest {Math.round(d.min)} · Highest {Math.round(d.max)} · {d.count} reading{d.count > 1 ? 's' : ''}</div>
    </div>
  );
}

// One column per day: the bar runs from the lowest to the highest reading, the dot is the day's average
// (coloured by status), and the shaded band is the patient's target range.
export function DailyRangeChart({ data, lo = 70, hi = 180, height = 260 }) {
  const rows = data.map((d) => ({ ...d, range: [Math.round(d.min), Math.round(d.max)], avg: Math.round(d.avg) }));
  const top = Math.max(260, ...rows.map((r) => Math.ceil(r.range[1] / 20) * 20 + 10));
  const renderDot = ({ cx, cy, payload }) => (
    <circle key={payload.label} cx={cx} cy={cy} r={5} fill={STATUS[statusOf(payload.avg, lo, hi)].color} stroke="#fff" strokeWidth={2} />
  );
  return (
    <div>
      <div style={{ width: '100%', height }} role="img" aria-label={`Daily sugar for ${rows.length} days. Shaded band is the target range ${lo} to ${hi}.`}>
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <ReferenceArea y1={lo} y2={hi} fill="#b6f2d1" fillOpacity={0.4} stroke="none" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={10} />
            <YAxis domain={[40, top]} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={42} />
            <Tooltip content={<DayTip lo={lo} hi={hi} />} cursor={{ fill: '#eef9fa' }} />
            <Bar dataKey="range" fill="#85d1db" barSize={12} radius={4} isAnimationActive={false} />
            <Line dataKey="avg" type="monotone" stroke="#2c8a99" strokeWidth={2} dot={renderDot} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2, fill: '#2c8a99' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-2 rounded-sm bg-aqua" /> Lowest to highest</span>
        <span className="flex items-center gap-1.5"><span className="relative h-0.5 w-5 bg-[#2c8a99]"><span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1f8a5b]" /></span> Daily average</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm bg-mint/70" /> Target {lo}–{hi}</span>
      </div>
    </div>
  );
}

// Share of readings in each zone, as one bar plus a labelled list (the way doctors read CGM reports)
export function TimeInRange({ values, lo = 70, hi = 180 }) {
  const counts = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0]));
  for (const v of values) counts[statusOf(v, lo, hi)] += 1;
  const total = values.length || 1;
  const pct = Object.fromEntries(STATUS_ORDER.map((k) => [k, Math.round((counts[k] / total) * 100)]));
  const good = pct.ok >= 70;
  const ranges = { verylow: 'below 54', low: `54–${lo - 1}`, ok: `${lo}–${hi}`, high: `${hi + 1}–250`, veryhigh: 'above 250' };
  return (
    <div>
      <div className="flex items-end gap-3">
        <div className="text-5xl font-bold leading-none tabular-nums text-ink">{pct.ok}%</div>
        <div className="pb-1 text-sm text-muted">of readings in your target range</div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-sm">
        <Face status={good ? 'ok' : 'high'} />
        <span className="text-ink">{good ? 'Great — above the 70% goal' : `Goal is 70% · ${70 - pct.ok}% to go`}</span>
      </div>
      <div className="mt-4 flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-white" role="img" aria-label={STATUS_ORDER.map((k) => `${STATUS[k].label} ${pct[k]}%`).join(', ')}>
        {STATUS_ORDER.filter((k) => counts[k]).map((k) => (
          <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: STATUS[k].color }} title={`${STATUS[k].label}: ${pct[k]}%`} />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {[...STATUS_ORDER].reverse().map((k) => (
          <li key={k} className="flex items-center gap-2.5 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS[k].color }} />
            <span className="font-medium text-ink">{STATUS[k].label}</span>
            <span className="text-xs text-muted">{STATUS[k].ta} · {ranges[k]}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{pct[k]}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Average for each time of check, on a 0–300 scale with the target zone marked on every track
export function ContextBars({ readings, lo = 70, hi = 180 }) {
  const order = ['fasting', 'pre_meal', 'post_meal', 'bedtime', 'random'];
  const rows = order.map((c) => {
    const vals = readings.filter((r) => r.context === c).map((r) => r.value);
    return { c, n: vals.length, avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null };
  }).filter((r) => r.n);
  const scale = (v) => `${Math.min(100, (v / 300) * 100)}%`;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map(({ c, n, avg }) => {
        const st = statusOf(avg, lo, hi);
        return (
          <li key={c}>
            <div className="mb-1.5 flex items-center gap-2 text-sm">
              <span className="font-medium text-ink">{CONTEXT_LABELS[c]}</span>
              <span className="text-xs text-muted">{n} reading{n > 1 ? 's' : ''}</span>
              <span className="ml-auto flex items-center gap-1.5 font-semibold tabular-nums text-ink">
                <Face status={st} size={16} /> {avg} <span className="text-xs font-normal text-muted">{STATUS[st].label}</span>
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-soft ring-1 ring-inset ring-line">
              <div className="absolute inset-y-0 rounded-full bg-mint/60" style={{ left: scale(lo), width: `calc(${scale(hi)} - ${scale(lo)})` }} />
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: scale(avg), background: STATUS[st].color, opacity: 0.9 }} />
            </div>
          </li>
        );
      })}
      <li className="text-xs text-muted">The light green part of each bar is your target ({lo}–{hi} mg/dL).</li>
    </ul>
  );
}

// The last seven days as faces: easy to read at a glance, even without reading numbers
export function WeekFaces({ days, lo = 70, hi = 180 }) {
  const byDay = Object.fromEntries(days.map((d) => [d.day, d]));
  const list = [...Array(7)].map((_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    const key = date.toLocaleDateString('en-CA');
    return { key, date, d: byDay[key] };
  });
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {list.map(({ key, date, d }, i) => {
        const st = d ? statusOf(d.avg, lo, hi) : null;
        return (
          <div key={key} className={`flex flex-col items-center gap-1 rounded-xl py-2.5 ring-1 ${i === 6 ? 'bg-ice/50 ring-aqua' : 'bg-white ring-line'}`}
            title={d ? `${date.toDateString()}: average ${Math.round(d.avg)} mg/dL (${STATUS[st].label})` : `${date.toDateString()}: no readings`}>
            <span className="text-[11px] font-semibold text-muted">{i === 6 ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            {d ? <Face status={st} size={24} /> : <span className="grid h-6 w-6 place-items-center text-muted">–</span>}
            <span className="text-xs font-semibold tabular-nums text-ink">{d ? Math.round(d.avg) : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
