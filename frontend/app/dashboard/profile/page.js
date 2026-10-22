'use client';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Alert, Badge, PageHeader } from '@/components/ui';
import DemoDataButton from '@/components/DemoDataButton';
import { api } from '@/lib/api';

const FIELDS = [
  ['name', 'Full name', 'text'], ['age', 'Age', 'number'], ['height_cm', 'Height (cm)', 'number'],
  ['weight_kg', 'Weight (kg)', 'number'], ['waist_cm', 'Waist (cm)', 'number'],
];
const GOALS = [
  ['target_min', 'Target min (mg/dL)'], ['target_max', 'Target max (mg/dL)'],
  ['daily_carb_goal', 'Daily carb limit (g)'], ['daily_step_goal', 'Daily step goal'],
];

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const [form, setForm] = useState(() => Object.fromEntries(Object.entries(user).map(([k, v]) => [k, v ?? ''])));
  const [msg, setMsg] = useState(null);

  const h = Number(form.height_cm) / 100;
  const bmi = h && form.weight_kg ? (Number(form.weight_kg) / (h * h)).toFixed(1) : null;
  // Asian BMI cut-offs (WHO expert consultation for South Asians)
  const bmiTone = !bmi ? null : bmi < 18.5 ? ['amber', 'Underweight'] : bmi < 23 ? ['green', 'Normal'] : bmi < 25 ? ['amber', 'Overweight'] : ['red', 'Obese'];

  async function save(e) {
    e.preventDefault();
    try {
      const { email, id, created_at, ...body } = form;
      const updated = await api('/auth/profile', { method: 'PUT', body });
      setUser(updated);
      setMsg({ type: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }

  return (
    <div>
      <PageHeader title="Profile & goals" subtitle={user.email} />
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <h2 className="font-bold">Personal details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([k, l, t]) => (
              <div key={k} className={k === 'name' ? 'sm:col-span-2' : ''}>
                <label className="label" htmlFor={k}>{l}</label>
                <input id={k} type={t} step="any" className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="label" htmlFor="gender">Gender</label>
              <select id="gender" className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dt">Diabetes type</label>
              <select id="dt" className="input" value={form.diabetes_type} onChange={(e) => setForm({ ...form, diabetes_type: e.target.value })}>
                <option value="type1">Type 1</option><option value="type2">Type 2</option>
                <option value="prediabetes">Pre-diabetes</option><option value="gestational">Gestational</option>
              </select>
            </div>
          </div>
          {bmi && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
              <span>Body Mass Index (Asian cut-offs)</span>
              <span className="flex items-center gap-2 font-bold">{bmi} <Badge tone={bmiTone[0]}>{bmiTone[1]}</Badge></span>
            </div>
          )}
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-bold">Targets & goals</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map(([k, l]) => (
              <div key={k}>
                <label className="label" htmlFor={k}>{l}</label>
                <input id={k} type="number" className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Default target range 70–180 mg/dL follows the International Consensus on Time in Range. Ask your doctor for a personal target.</p>
          {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}
          <button className="btn btn-primary w-full"><Save size={16} /> Save changes</button>
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2 text-sm font-semibold">Demo mode</div>
            <p className="mb-3 text-xs text-slate-500">Fill the app with 14 days of realistic sample data for presentations.</p>
            <DemoDataButton />
          </div>
        </div>
      </form>
    </div>
  );
}
