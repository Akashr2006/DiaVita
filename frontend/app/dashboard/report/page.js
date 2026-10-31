'use client';
import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import Logo from '@/components/Logo';
import { Badge, PageHeader, Spinner } from '@/components/ui';
import { api, CONTEXT_LABELS, fmtDay, glucoseStatus } from '@/lib/api';
import { useLiveRefresh } from '@/lib/live';

export default function ReportPage() {
  const { user } = useUser();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api(`/insights/report?days=${days}`).then(setData);
  }, [days]);
  useLiveRefresh(() => api(`/insights/report?days=${days}`).then(setData));

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Doctor report"
          subtitle="Share this summary at your next consultation or save it as PDF."
          action={
            <div className="flex gap-2">
              <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Report period">
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              <button onClick={() => window.print()} className="btn btn-primary"><Printer size={16} /> Print / PDF</button>
            </div>
          }
        />
      </div>

      {!data ? <Spinner /> : (
        <div className="card p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <Logo tagline />
            <div className="text-sm text-slate-600 sm:text-right">
              <div className="font-bold text-slate-900">{user.name}</div>
              <div>{user.age ? `${user.age} yrs · ` : ''}<span className="capitalize">{user.gender || ''}</span> · {(user.diabetes_type || '').replace('type', 'Type ')}</div>
              <div>Period: last {days} days · Generated {new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Avg glucose (7d)', data.summary.glucose.week.avg ?? '—', 'mg/dL'],
              ['Est. HbA1c', data.summary.glucose.estimated_a1c ?? '—', '%'],
              ['Time in range', data.summary.glucose.week.time_in_range ?? '—', '%'],
              ['Low readings', data.summary.glucose.week.hypo, '7 days'],
            ].map(([l, v, u]) => (
              <div key={l} className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">{l}</div>
                <div className="mt-1 text-2xl font-bold">{v} <span className="text-xs font-medium text-slate-500">{u}</span></div>
              </div>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-bold">Average by reading type (14 days)</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(data.summary.glucose.by_context).map(([k, v]) => (
              <span key={k} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm"><b>{CONTEXT_LABELS[k]}:</b> {v.avg} mg/dL ({v.count})</span>
            ))}
            {!Object.keys(data.summary.glucose.by_context).length && <span className="text-sm text-slate-500">No readings</span>}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Avg glucose</th><th className="py-2 pr-3">Readings</th>
                  <th className="py-2 pr-3">Carbs (g)</th><th className="py-2">Active (min)</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const s = r.avg_glucose ? glucoseStatus(r.avg_glucose, user.target_min, user.target_max) : null;
                  return (
                    <tr key={r.day} className="border-b border-slate-100">
                      <td className="py-2.5 pr-3 font-medium">{fmtDay(r.day)}</td>
                      <td className="py-2.5 pr-3">{r.avg_glucose ? <span className="flex items-center gap-2">{r.avg_glucose} <Badge tone={s.tone}>{s.label}</Badge></span> : '—'}</td>
                      <td className="py-2.5 pr-3">{r.readings}</td>
                      <td className="py-2.5 pr-3">{r.carbs}</td>
                      <td className="py-2.5">{r.active_min}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-xs text-slate-400">eA1c uses the ADAG formula (avg glucose + 46.7) / 28.7. DiaVita is a lifestyle tool and does not replace lab tests or medical advice.</p>
        </div>
      )}
    </div>
  );
}
