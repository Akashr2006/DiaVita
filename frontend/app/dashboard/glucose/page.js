'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Droplet, Keyboard, MessageSquareText, Mic, Plus, Trash2, Utensils } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import GlucoseChart from '@/components/GlucoseChart';
import { REFRESH_EVENT } from '@/components/VoiceSheet';
import { Alert, Badge, Empty, PageHeader, Spinner } from '@/components/ui';
import { api, CONTEXT_LABELS, glucoseStatus } from '@/lib/api';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const VALUE_TILE = { green: 'bg-mint-50 text-mint-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700' };
const DAYS_PER_PAGE = 5;
const LIVE_REFRESH_MS = 30000;

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's timezone
const fmtGap = (min) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`);

function dayLabel(key) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  const date = new Date(`${key}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return key === today ? `Today · ${date}` : key === yesterday ? `Yesterday · ${date}` : date;
}

// The meal an after-meal reading belongs to, e.g. "Lunch: White Rice, Sambar · GL 37 · 1 h 45 min after"
function MealDetail({ r }) {
  if (!r.meal_type) return null;
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-[13px] text-ink">
      <Utensils size={14} className="mt-0.5 shrink-0 text-brand-600" />
      <span className="min-w-0">
        <b className="font-semibold">{MEAL_LABELS[r.meal_type]}:</b> {r.meal_foods}
        <span className="text-muted"> · GL {Math.round(r.meal_gl)} · {fmtGap(r.minutes_after_meal)} after</span>
      </span>
    </div>
  );
}

function NoteDetail({ r }) {
  if (!r.note) return null;
  const voice = r.note.startsWith('Voice: ');
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-[13px] text-muted">
      {voice ? <Mic size={14} className="mt-0.5 shrink-0 text-brand-600" /> : <MessageSquareText size={14} className="mt-0.5 shrink-0 text-brand-600" />}
      <span className="min-w-0 break-words">{voice ? `“${r.note.slice(7)}”` : r.note}</span>
    </div>
  );
}

function SourceChip({ source }) {
  return source === 'voice' ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-mint px-1.5 py-0.5 text-[11px] font-semibold text-ink"><Mic size={12} /> Voice</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-soft px-1.5 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line"><Keyboard size={12} /> Typed</span>
  );
}

function LiveBadge({ syncedAt }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-soft px-2.5 py-1 text-xs text-muted ring-1 ring-line" title="Data is read from the Neon cloud database and refreshed every 30 seconds">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-600 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-600" />
      </span>
      <b className="font-semibold text-ink">Live</b> Neon cloud{syncedAt ? ` · synced ${fmtTime(syncedAt)}` : ''}
    </span>
  );
}

function downloadCsv(rows, lo, hi) {
  const head = ['date', 'time', 'value_mgdl', 'reading_type', 'status', 'meal', 'meal_foods', 'meal_gl', 'minutes_after_meal', 'source', 'note'];
  const cell = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = rows.map((r) => [
    dayKey(r.recorded_at), fmtTime(r.recorded_at), Math.round(r.value), CONTEXT_LABELS[r.context], glucoseStatus(r.value, lo, hi).label,
    MEAL_LABELS[r.meal_type] || '', r.meal_foods || '', r.meal_gl ?? '', r.minutes_after_meal ?? '', r.source, r.note || '',
  ].map(cell).join(','));
  const blob = new Blob([`﻿${[head.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `diavita-glucose-${dayKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function GlucosePage() {
  const { user } = useUser();
  const [readings, setReadings] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState('all');
  const [pages, setPages] = useState(1);
  const [form, setForm] = useState({ value: '', context: 'fasting', note: '', recorded_at: '' });
  const [alert, setAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () => api(`/glucose?days=${days}`).then((r) => { setReadings(r); setSyncedAt(new Date()); }).catch((e) => setAlert({ level: 'danger', message: e.message })),
    [days]
  );

  // Live data: reload on open, every 30 seconds, when the tab regains focus and after a voice entry
  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), LIVE_REFRESH_MS);
    window.addEventListener('focus', load);
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, value: Number(form.value), recorded_at: form.recorded_at ? new Date(form.recorded_at).toISOString() : null };
      const res = await api('/glucose', { method: 'POST', body });
      setAlert(res.alert || { level: 'success', message: `${res.reading.value} mg/dL saved — in your target range.` });
      setForm({ ...form, value: '', note: '', recorded_at: '' });
      load();
    } catch (err) {
      setAlert({ level: 'danger', message: err.message });
    }
    setSaving(false);
  }

  async function remove(id) {
    if (!window.confirm('Delete this reading?')) return;
    await api(`/glucose/${id}`, { method: 'DELETE' });
    setReadings((r) => r.filter((x) => x.id !== id));
  }

  const shown = useMemo(() => (readings || []).filter((r) => filter === 'all' || r.context === filter), [readings, filter]);
  const chartData = useMemo(
    () => [...shown].reverse().map((r) => ({ label: new Date(r.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: r.value })),
    [shown]
  );
  const avg = shown.length ? Math.round(shown.reduce((s, r) => s + r.value, 0) / shown.length) : null;

  // History grouped by day, newest first, with a small summary per day
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of shown) {
      const k = dayKey(r.recorded_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return [...map.entries()].map(([key, rows]) => {
      const inRange = rows.filter((r) => r.value >= user.target_min && r.value <= user.target_max).length;
      return {
        key, rows,
        avg: Math.round(rows.reduce((s, r) => s + r.value, 0) / rows.length),
        inRangePct: Math.round((inRange / rows.length) * 100),
        lows: rows.filter((r) => r.value < 70).length,
        highs: rows.filter((r) => r.value > user.target_max).length,
      };
    });
  }, [shown, user.target_min, user.target_max]);
  const visibleGroups = groups.slice(0, pages * DAYS_PER_PAGE);

  return (
    <div>
      <PageHeader title="Glucose log" subtitle={`Target range ${user.target_min}–${user.target_max} mg/dL · change it in Profile`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Droplet size={18} className="text-brand-600" /> New reading</h2>
          <div>
            <label className="label" htmlFor="gv">Value (mg/dL)</label>
            <input id="gv" type="number" inputMode="decimal" min="20" max="600" required className="input text-lg font-bold"
              value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 126" />
          </div>
          <div>
            <span className="label">When was it taken?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {Object.entries(CONTEXT_LABELS).map(([k, v]) => (
                <button type="button" key={k} onClick={() => setForm({ ...form, context: k })}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${form.context === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="gt">Date & time (optional)</label>
            <input id="gt" type="datetime-local" className="input" value={form.recorded_at} onChange={(e) => setForm({ ...form, recorded_at: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="gn">Note</label>
            <input id="gn" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="After 2 idlis, felt tired…" />
          </div>
          <button className="btn btn-primary w-full" disabled={saving}><Plus size={16} /> Save reading</button>
          {alert && <Alert type={alert.level} onClose={() => setAlert(null)}>{alert.message}</Alert>}
        </form>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Readings chart</h2>
              <p className="text-xs text-slate-500">{shown.length} readings · average {avg ?? '—'} mg/dL</p>
            </div>
            <div className="flex gap-2">
              <select className="input w-auto py-2" value={filter} onChange={(e) => { setFilter(e.target.value); setPages(1); }} aria-label="Filter by type">
                <option value="all">All types</option>
                {Object.entries(CONTEXT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="input w-auto py-2" value={days} onChange={(e) => { setDays(Number(e.target.value)); setPages(1); }} aria-label="Date range">
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
          {!readings ? <Spinner /> : chartData.length ? (
            <GlucoseChart data={chartData} lo={user.target_min} hi={user.target_max} height={280} />
          ) : (
            <Empty icon={Droplet} title="No readings in this range" text="Log a reading on the left to start your chart." />
          )}
        </div>
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">History</h2>
            <p className="text-xs text-muted">
              {shown.length} readings · last {days} days · {filter === 'all' ? 'all types' : CONTEXT_LABELS[filter]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge syncedAt={syncedAt} />
            <button onClick={() => downloadCsv(shown, user.target_min, user.target_max)} disabled={!shown.length} className="btn btn-soft btn-sm">
              <Download size={15} /> CSV
            </button>
          </div>
        </div>

        {!readings ? <Spinner /> : !shown.length ? (
          <Empty icon={Droplet} title="Nothing here yet" text="Readings you add, typed or spoken, appear here straight away." />
        ) : (
          <>
            {/* Laptop: a table with one header row per day */}
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-bold uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="w-28 py-3 pl-5 pr-3">Time</th>
                    <th className="w-36 px-3 py-3">Reading</th>
                    <th className="w-32 px-3 py-3">Type</th>
                    <th className="w-28 px-3 py-3">Status</th>
                    <th className="px-3 py-3">Details</th>
                    <th className="w-24 px-3 py-3">Source</th>
                    <th className="w-12 py-3 pr-5" aria-label="Actions" />
                  </tr>
                </thead>
                {visibleGroups.map((g) => (
                  <tbody key={g.key} className="divide-y divide-line border-b border-line last:border-b-0">
                    <tr className="bg-soft">
                      <td colSpan={7} className="px-5 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{dayLabel(g.key)}</span>
                          <span className="text-xs text-muted">
                            {g.rows.length} readings · avg {g.avg} mg/dL · {g.inRangePct}% in range
                            {g.highs ? ` · ${g.highs} high` : ''}{g.lows ? ` · ${g.lows} low` : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {g.rows.map((r) => {
                      const s = glucoseStatus(r.value, user.target_min, user.target_max);
                      return (
                        <tr key={r.id} className="align-top hover:bg-page">
                          <td className="whitespace-nowrap py-3 pl-5 pr-3 tabular-nums text-muted">{fmtTime(r.recorded_at)}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className={`inline-flex min-w-14 justify-center rounded-lg px-2 py-1 text-base font-bold tabular-nums ${VALUE_TILE[s.tone]}`}>{Math.round(r.value)}</span>
                            <span className="ml-1 text-xs text-muted">mg/dL</span>
                          </td>
                          <td className="px-3 py-3 font-medium text-ink">{CONTEXT_LABELS[r.context]}</td>
                          <td className="px-3 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              <MealDetail r={r} />
                              <NoteDetail r={r} />
                              {!r.meal_type && !r.note && <span className="text-muted">—</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3"><SourceChip source={r.source} /></td>
                          <td className="py-2 pr-5 text-right">
                            <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete reading">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>

            {/* Phone: the same details as stacked rows */}
            <div className="md:hidden">
              {visibleGroups.map((g) => (
                <div key={g.key}>
                  <div className="border-y border-line bg-soft px-4 py-2.5 first:border-t-0">
                    <div className="text-sm font-semibold text-ink">{dayLabel(g.key)}</div>
                    <div className="text-xs text-muted">{g.rows.length} readings · avg {g.avg} · {g.inRangePct}% in range</div>
                  </div>
                  <ul className="divide-y divide-line">
                    {g.rows.map((r) => {
                      const s = glucoseStatus(r.value, user.target_min, user.target_max);
                      return (
                        <li key={r.id} className="flex gap-3 px-4 py-3">
                          <div className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl text-lg font-bold tabular-nums ${VALUE_TILE[s.tone]}`}>{Math.round(r.value)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                              {CONTEXT_LABELS[r.context]} <Badge tone={s.tone}>{s.label}</Badge> <SourceChip source={r.source} />
                            </div>
                            <div className="text-xs text-muted">{fmtTime(r.recorded_at)} · mg/dL</div>
                            <div className="mt-1.5 flex flex-col gap-1">
                              <MealDetail r={r} />
                              <NoteDetail r={r} />
                            </div>
                          </div>
                          <button onClick={() => remove(r.id)} className="self-start rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete reading">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {groups.length > visibleGroups.length && (
              <div className="border-t border-line p-4 text-center">
                <button onClick={() => setPages((p) => p + 1)} className="btn btn-soft btn-sm">
                  <ChevronDown size={16} /> Show older days ({groups.length - visibleGroups.length} more)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
