'use client';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const TONES = {
  green: 'bg-mint-100 text-mint-700 ring-mint-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-soft text-brand-700 ring-sky',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-ice/60 text-brand-700 ring-aqua/60',
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
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-8 tracking-tight text-ink sm:text-[28px] sm:leading-9">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Section heading with an optional link on the right, 16px above its content
export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// The four palette colours, used in turn for icon tiles so the page stays evenly coloured
export const TILE = { brand: 'bg-sky', sky: 'bg-ice', violet: 'bg-mint', coral: 'bg-aqua/70', amber: 'bg-amber-100' };
export const TILE_CYCLE = ['bg-sky', 'bg-mint', 'bg-aqua/70', 'bg-ice'];

export function StatCard({ icon: Icon, label, value, unit, hint, tone = 'brand' }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`icon-tile h-10 w-10 ${TILE[tone] || TILE.brand}`}>
          <Icon size={20} />
        </div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted">{label}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-ink sm:text-[28px]">{value ?? '—'}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Progress({ value, max, tone = 'brand' }) {
  const pct = Math.min(100, Math.round(((value || 0) / (max || 1)) * 100));
  const bar = { brand: 'bg-brand-400', amber: 'bg-amber-400', coral: 'bg-rose-300', sky: 'bg-aqua', violet: 'bg-mint-300' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-soft ring-1 ring-inset ring-line">
      <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const ALERT_STYLE = {
  danger: { cls: 'border-rose-200 bg-rose-50 text-rose-800', Icon: XCircle },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-800', Icon: AlertTriangle },
  success: { cls: 'border-mint-200 bg-mint-50 text-mint-700', Icon: CheckCircle2 },
  info: { cls: 'border-sky bg-soft text-brand-800', Icon: Info },
};

export function Alert({ type = 'info', title, children, onClose }) {
  const { cls, Icon } = ALERT_STYLE[type] || ALERT_STYLE.info;
  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 text-sm ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
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
        <div className="icon-tile mb-3 h-12 w-12 rounded-2xl bg-soft text-brand-600">
          <Icon size={22} />
        </div>
      )}
      <div className="font-semibold text-ink">{title}</div>
      {text && <div className="mt-1 max-w-xs text-sm text-muted">{text}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky border-t-brand-500" />
    </div>
  );
}

// Circular score ring used for the DiaVita Score (drawn for light, palette backgrounds)
export function ScoreRing({ score = 0, size = 150 }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? '#2e9d6c' : score >= 50 ? '#2c8a99' : score >= 30 ? '#d9962b' : '#e0565b';
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`DiaVita score ${score} out of 100`}>
      <circle cx="70" cy="70" r={r} fill="rgba(255,255,255,0.65)" stroke="rgba(13,43,48,0.08)" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * Math.min(score, 100)) / 100}
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="70" y="68" textAnchor="middle" dominantBaseline="central" fill="#0d2b30" fontSize="36" fontWeight="700">
        {score}
      </text>
      <text x="70" y="96" textAnchor="middle" fill="#567277" fontSize="11" fontWeight="600">
        / 100
      </text>
    </svg>
  );
}
