'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Alert, Badge, PageHeader } from '@/components/ui';
import { api, fmtDay } from '@/lib/api';

const ACTIVITY = [
  ['vigorous', 'Vigorous exercise or strenuous work', 0],
  ['moderate', 'Moderate exercise or activity', 10],
  ['mild', 'Mild exercise or activity', 20],
  ['sedentary', 'No exercise, sedentary work', 30],
];
const FAMILY = [
  ['none', 'No family history', 0],
  ['one_parent', 'One parent has diabetes', 10],
  ['both_parents', 'Both parents have diabetes', 20],
];
const LEVEL = { low: { tone: 'green', color: '#10b981' }, moderate: { tone: 'amber', color: '#f59e0b' }, high: { tone: 'red', color: '#f43f5e' } };

function Choice({ options, value, onChange }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(([k, label, pts]) => (
        <button type="button" key={k} onClick={() => onChange(k)}
          className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm font-medium transition ${value === k ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
          {label} <span className="ml-2 shrink-0 text-xs text-slate-400">+{pts}</span>
        </button>
      ))}
    </div>
  );
}

export default function RiskPage() {
  const { user } = useUser();
  const [form, setForm] = useState({ age: user.age || '', gender: user.gender || 'male', waist_cm: user.waist_cm || '', activity: '', family_history: '' });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { api('/risk').then(setHistory); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const r = await api('/risk', { method: 'POST', body: { ...form, age: Number(form.age), waist_cm: Number(form.waist_cm) } });
      setResult(r);
      setHistory((h) => [r, ...h]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Diabetes risk check" subtitle="Indian Diabetes Risk Score (IDRS) by Madras Diabetes Research Foundation — screen yourself or family members." />
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={submit} className="card space-y-5 p-5 lg:col-span-2">
          {error && <Alert type="danger">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="ra">1. Age (years)</label>
              <input id="ra" type="number" min="1" max="120" required className="input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="rg">Gender</label>
              <select id="rg" className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="rw">2. Waist (cm)</label>
              <input id="rw" type="number" min="40" max="200" required className="input" value={form.waist_cm} onChange={(e) => setForm({ ...form, waist_cm: e.target.value })} />
            </div>
          </div>
          <div>
            <span className="label">3. Physical activity</span>
            <Choice options={ACTIVITY} value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} />
          </div>
          <div>
            <span className="label">4. Family history of diabetes</span>
            <Choice options={FAMILY} value={form.family_history} onChange={(v) => setForm({ ...form, family_history: v })} />
          </div>
          <button className="btn btn-primary w-full sm:w-auto" disabled={!form.activity || !form.family_history}>
            <ShieldCheck size={16} /> Calculate my risk
          </button>
        </form>

        <div className="space-y-4">
          <div className="card p-5 text-center">
            <h2 className="font-bold">Your result</h2>
            {result ? (
              <>
                <div className="relative mx-auto mt-4 h-28 w-56">
                  <svg viewBox="0 0 200 110" className="h-full w-full">
                    <path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="#d9eff1" strokeWidth="18" strokeLinecap="round" />
                    <path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke={LEVEL[result.risk_level].color} strokeWidth="18" strokeLinecap="round"
                      strokeDasharray="267" strokeDashoffset={267 - (267 * result.total_score) / 100} />
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 text-4xl font-bold">{result.total_score}</div>
                </div>
                <div className="mt-2"><Badge tone={LEVEL[result.risk_level].tone}>{result.risk_level.toUpperCase()} RISK</Badge></div>
                <p className="mt-3 text-left text-sm text-slate-600">{result.advice}</p>
                <div className="mt-4 grid grid-cols-4 gap-1 text-[11px] text-slate-500">
                  {[['Age', result.age_score], ['Waist', result.waist_score], ['Activity', result.activity_score], ['Family', result.family_score]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-slate-50 py-2"><div className="text-sm font-bold text-slate-800">{v}</div>{l}</div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Answer the 4 questions. Score &lt; 30 is low, 30–50 moderate, ≥ 60 high risk.</p>
            )}
          </div>
          {history.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-bold">Previous checks</h3>
              <ul className="space-y-2 text-sm">
                {history.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-center justify-between">
                    <span className="text-slate-500">{fmtDay(h.created_at)}</span>
                    <span className="font-semibold">{h.total_score} <Badge tone={LEVEL[h.risk_level].tone}>{h.risk_level}</Badge></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
