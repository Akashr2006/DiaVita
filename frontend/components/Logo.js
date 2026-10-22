// DiaVita brand: the cross-and-leaf mark from /public/brand, with the name set in text so it stays sharp and readable.
export function LogoMark({ size = 40, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo-mark.png" width={size} height={size} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />
  );
}

export function LogoFull({ className = '' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/logo-full.png" width={917} height={707} alt="DiaVita logo" className={`h-auto ${className}`} />;
}

export default function Logo({ size = 32, tagline = false }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      <div className="leading-tight">
        <div className="text-lg font-bold tracking-tight text-ink">
          Dia<span className="text-brand-600">Vita</span>
        </div>
        {tagline && <div className="text-[11px] font-medium text-muted">Live well with diabetes</div>}
      </div>
    </div>
  );
}
