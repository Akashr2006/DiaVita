import { useId } from 'react';

export function LogoMark({ size = 40, className = '' }) {
  // Unique gradient id per instance: a hidden duplicate would otherwise break the fill
  const gradId = `dv-grad-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradId})`} />
      <ellipse cx="45" cy="15" rx="6.5" ry="3.2" transform="rotate(-38 45 15)" fill="#FDA4AF" />
      <path d="M32 9 C26 17 16 28 16 38 A16 16 0 0 0 48 38 C48 28 38 17 32 9 Z" fill="#FFFFFF" />
      <polyline
        points="19,39 25.5,39 28.5,32 33,46 36.5,35 39,39 45,39"
        fill="none" stroke="#0F766E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ size = 36, light = false, tagline = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-tight">
        <div className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
          Dia<span className={light ? 'text-brand-200' : 'text-brand-600'}>Vita</span>
        </div>
        {tagline && (
          <div className={`text-[11px] font-medium ${light ? 'text-brand-100' : 'text-slate-500'}`}>
            Live well with diabetes
          </div>
        )}
      </div>
    </div>
  );
}
