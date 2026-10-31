'use client';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Flame, Footprints, Plus, Timer, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Empty, PageHeader, Spinner, StatCard } from '@/components/ui';
import { api, fmtDateTime } from '@/lib/api';
import { useLiveRefresh } from '@/lib/live';

const TYPES = {
  walking: 'Walking', brisk_walking: 'Brisk walking', jogging: 'Jogging', cycling: 'Cycling',
  yoga: 'Yoga', swimming: 'Swimming', gym: 'Gym workout', dance: 'Dance', sports: 'Sports',
};

export default function ActivityPage() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ activity_type: 'walking', duration_min: 30, steps: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { api('/activities?days=7').then(setItems); }, []);
  useLiveRefresh(() => api('/activities?days=7').then(setItems));

  async function submit(e) {
    e.preventDefault();
    try {
      const a = await api('/activities', { method: 'POST', body: form });
      setItems((x) => [a, ...(x || [])]);
      setMsg({ type: 'success', text: `${TYPES[a.activity_type]} for ${a.duration_min} min saved · ~${a.calories_burned} kcal burned.` });
      setForm({ ...form, steps: '' });
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }

  async function remove(id) {
    await api(`/activities/${id}`, { method: 'DELETE' });
    setItems((x) => x.filter((a) => a.id !== id));
  }

  const week = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: d.toDateString(), label: d.toLocaleDateString('en-IN', { weekday: 'short' }), minutes: 0 });
    }
    (items || []).forEach((a) => {
      const day = days.find((d) => d.key === new Date(a.recorded_at).toDateString());
      if (day) day.minutes += a.duration_min;
    });
    return days;
  }, [items]);

  const today = week[6];
  const totalWeek = week.reduce((s, d) => s + d.minutes, 0);
  const todaySteps = (items || []).filter((a) => new Date(a.recorded_at).toDateString() === today.key).reduce((s, a) => s + a.steps, 0);
  const todayCal = (items || []).filter((a) => new Date(a.recorded_at).toDateString() === today.key).reduce((s, a) => s + a.calories_burned, 0);

  return (
    <div>
      <PageHeader title="Activity" subtitle="WHO recommends 150 minutes of moderate activity every week for people with diabetes." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Timer} label="Today" value={today.minutes} unit="min" hint="Goal: 30 min" />
        <StatCard icon={Activity} label="This week" value={totalWeek} unit="/ 150 min" hint={totalWeek >= 150 ? 'Weekly goal met 🎉' : `${150 - totalWeek} min to go`} tone="sky" />
        <StatCard icon={Footprints} label="Steps today" value={todaySteps.toLocaleString('en-IN')} tone="violet" />
        <StatCard icon={Flame} label="Burned today" value={todayCal} unit="kcal" tone="coral" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <h2 className="font-bold">Log activity</h2>
          <div>
            <label className="label" htmlFor="at">Activity</label>
            <select id="at" className="input" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ad">Duration: {form.duration_min} min</label>
            <input id="ad" type="range" min="5" max="120" step="5" className="w-full accent-brand-600" value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="as">Steps (optional)</label>
            <input id="as" type="number" min="0" className="input" value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} placeholder="Auto-estimated for walks" />
          </div>
          <button className="btn btn-primary w-full"><Plus size={16} /> Save activity</button>
          {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}
        </form>

        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold">Last 7 days</h2>
          <p className="mb-3 text-xs text-slate-500">Active minutes per day · dashed line = 30 min daily goal</p>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={week} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9eff1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#567277' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#567277' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#eef9fa' }} contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} min`, 'Active']} />
                <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="5 5" />
                <Bar dataKey="minutes" fill="#85d1db" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 font-bold">Recent activities</div>
        {!items ? <Spinner /> : !items.length ? <Empty icon={Activity} title="No activity this week" text="A 10-minute walk after meals is a great start." /> : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Activity size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{TYPES[a.activity_type]} · {a.duration_min} min</div>
                  <div className="text-xs text-slate-500">{a.steps ? `${a.steps.toLocaleString('en-IN')} steps · ` : ''}{a.calories_burned} kcal · {fmtDateTime(a.recorded_at)}</div>
                </div>
                <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete activity"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
