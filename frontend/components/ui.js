'use client';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export function Badge({ tone = 'slate', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, unit, hint, tone = 'brand' }) {
  const iconTone = {
    brand: 'bg-brand-50 text-brand-700', coral: 'bg-rose-50 text-rose-500',
    amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600',
  }[tone];
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconTone}`}>
          <Icon size={20} />
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{value ?? '—'}</span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Progress({ value, max, tone = 'brand' }) {
  const pct = Math.min(100, Math.round(((value || 0) / (max || 1)) * 100));
  const bar = { brand: 'bg-brand-500', amber: 'bg-amber-500', coral: 'bg-rose-400', sky: 'bg-sky-500', violet: 'bg-violet-500' }[tone];
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const ALERT_STYLE = {
  danger: { cls: 'border-rose-200 bg-rose-50 text-rose-800', Icon: XCircle },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-800', Icon: AlertTriangle },
  success: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
  info: { cls: 'border-sky-200 bg-sky-50 text-sky-800', Icon: Info },
};

export function Alert({ type = 'info', title, children, onClose }) {
  const { cls, Icon } = ALERT_STYLE[type] || ALERT_STYLE.info;
  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 text-sm ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="self-start text-xs font-semibold opacity-60 hover:opacity-100">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function Empty({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {Icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon size={22} />
        </div>
      )}
      <div className="font-semibold text-slate-700">{title}</div>
      {text && <div className="mt-1 max-w-xs text-sm text-slate-500">{text}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  );
}

// Circular score ring used for the DiaVita Score
export function ScoreRing({ score = 0, size = 150 }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#14b8a6' : score >= 30 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`DiaVita score ${score} out of 100`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * Math.min(score, 100)) / 100}
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="36" fontWeight="800">
        {score}
      </text>
      <text x="70" y="98" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="11" fontWeight="600">
        / 100
      </text>
    </svg>
  );
}
