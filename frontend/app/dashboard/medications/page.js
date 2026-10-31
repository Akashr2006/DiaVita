'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Pill, Plus, Syringe, Trash2 } from 'lucide-react';
import { Alert, Empty, PageHeader, Progress, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useLiveRefresh } from '@/lib/live';

export default function MedicationsPage() {
  const [meds, setMeds] = useState(null);
  const [form, setForm] = useState({ name: '', dosage: '', med_type: 'tablet', schedule_time: '08:00' });
  const [error, setError] = useState('');

  useEffect(() => { api('/medications').then(setMeds); }, []);
  useLiveRefresh(() => api('/medications').then(setMeds));

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const m = await api('/medications', { method: 'POST', body: form });
      setMeds((x) => [...x, m].sort((a, b) => a.schedule_time.localeCompare(b.schedule_time)));
      setForm({ ...form, name: '', dosage: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(id) {
    const { taken_today } = await api(`/medications/${id}/toggle`, { method: 'POST' });
    setMeds((x) => x.map((m) => (m.id === id ? { ...m, taken_today } : m)));
  }

  async function remove(id) {
    await api(`/medications/${id}`, { method: 'DELETE' });
    setMeds((x) => x.filter((m) => m.id !== id));
  }

  const taken = (meds || []).filter((m) => m.taken_today).length;
  const now = new Date().toTimeString().slice(0, 5);

  return (
    <div>
      <PageHeader title="Medications" subtitle="Your daily tablet & insulin checklist. Tap a dose to mark it as taken." />
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <h2 className="font-bold">Add medicine</h2>
          {error && <Alert type="danger">{error}</Alert>}
          <div>
            <label className="label" htmlFor="mn">Name</label>
            <input id="mn" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Metformin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="md">Dosage</label>
              <input id="md" className="input" required value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="500 mg" />
            </div>
            <div>
              <label className="label" htmlFor="mt">Time</label>
              <input id="mt" type="time" className="input" required value={form.schedule_time} onChange={(e) => setForm({ ...form, schedule_time: e.target.value })} />
            </div>
          </div>
          <div>
            <span className="label">Type</span>
            <div className="grid grid-cols-3 gap-2">
              {['tablet', 'insulin', 'other'].map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, med_type: t })}
                  className={`rounded-xl border py-2 text-sm font-semibold capitalize ${form.med_type === t ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary w-full"><Plus size={16} /> Add to schedule</button>
        </form>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Today’s schedule</h2>
            <span className="text-sm font-semibold text-slate-600">{taken}/{meds?.length || 0} taken</span>
          </div>
          <Progress value={taken} max={meds?.length || 1} tone="violet" />
          <div className="mt-4 space-y-2">
            {!meds ? <Spinner /> : !meds.length ? <Empty icon={Pill} title="No medicines added" text="Add your tablets or insulin to get a daily checklist." /> : meds.map((m) => {
              const overdue = !m.taken_today && m.schedule_time < now;
              const Icon = m.med_type === 'insulin' ? Syringe : Pill;
              return (
                <div key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${m.taken_today ? 'border-mint-200 bg-mint-50/60' : overdue ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200'}`}>
                  <button onClick={() => toggle(m.id)} className="shrink-0" aria-label={m.taken_today ? 'Mark as not taken' : 'Mark as taken'}>
                    {m.taken_today ? <CheckCircle2 size={28} className="text-mint-600" /> : <Circle size={28} className="text-slate-300 hover:text-brand-500" />}
                  </button>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-ink"><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${m.taken_today ? 'text-slate-500 line-through' : ''}`}>{m.name} · {m.dosage}</div>
                    <div className="text-xs text-slate-500">
                      {m.schedule_time} · <span className="capitalize">{m.med_type}</span>
                      {overdue && <span className="font-semibold text-amber-700"> · Overdue</span>}
                    </div>
                  </div>
                  <button onClick={() => remove(m.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove medicine"><Trash2 size={16} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
