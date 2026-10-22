'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Droplet, Plus, Trash2 } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import GlucoseChart from '@/components/GlucoseChart';
import { Alert, Badge, Empty, PageHeader, Spinner } from '@/components/ui';
import { api, CONTEXT_LABELS, fmtDateTime, glucoseStatus } from '@/lib/api';

export default function GlucosePage() {
  const { user } = useUser();
  const [readings, setReadings] = useState(null);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ value: '', context: 'fasting', note: '', recorded_at: '' });
  const [alert, setAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api(`/glucose?days=${days}`).then(setReadings).catch((e) => setAlert({ level: 'danger', message: e.message })), [days]);
  useEffect(() => { load(); }, [load]);

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
    await api(`/glucose/${id}`, { method: 'DELETE' });
    setReadings((r) => r.filter((x) => x.id !== id));
  }

  const shown = useMemo(() => (readings || []).filter((r) => filter === 'all' || r.context === filter), [readings, filter]);
  const chartData = useMemo(
    () => [...shown].reverse().map((r) => ({ label: new Date(r.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: r.value })),
    [shown]
  );
  const avg = shown.length ? Math.round(shown.reduce((s, r) => s + r.value, 0) / shown.length) : null;

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
              <select className="input w-auto py-2" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by type">
                <option value="all">All types</option>
                {Object.entries(CONTEXT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="input w-auto py-2" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">
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

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 font-bold">History</div>
        {!readings ? <Spinner /> : !shown.length ? (
          <Empty title="Nothing here yet" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((r) => {
              const s = glucoseStatus(r.value, user.target_min, user.target_max);
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl text-lg font-bold ${
                    s.tone === 'green' ? 'bg-mint-50 text-mint-700' : s.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                    {Math.round(r.value)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {CONTEXT_LABELS[r.context]} <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                    <div className="truncate text-xs text-slate-500">{fmtDateTime(r.recorded_at)}{r.note ? ` · ${r.note}` : ''}</div>
                  </div>
                  <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete reading">
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
