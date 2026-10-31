'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X } from 'lucide-react';
import { APK_PAGE, APK_URL } from '@/lib/mobile';

const STEPS = [
  'Tap “Download DiaVita.apk”. If Chrome says the file might be harmful, tap “Download anyway”.',
  'Open the downloaded file. If the phone asks, allow Chrome to “Install unknown apps”.',
  'Open DiaVita and tap a demo patient to log in.',
];

// "Try in mobile": a laptop shows a QR code to scan with the phone; on an Android phone the same panel
// shows just the download button (a tap on a real link downloads more reliably than a redirect)
export default function TryMobile({ qrSvg }) {
  const [open, setOpen] = useState(false);
  const [onPhone, setOnPhone] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onClick = () => {
    setOnPhone(/android/i.test(navigator.userAgent));
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={onClick} className="btn btn-mint btn-sm" aria-label="Try in mobile">
        <Smartphone size={16} />
        <span className="hidden sm:inline">Try in mobile</span>
      </button>

      {/* rendered on <body>: the header's blur effect would otherwise trap a fixed panel inside the header */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="try-mobile-title">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="sheet-up relative w-full rounded-t-[20px] bg-white p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-[440px] sm:rounded-[20px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="try-mobile-title" className="text-lg font-semibold text-ink">Try DiaVita on your phone</h2>
                <p className="text-sm text-muted">{onPhone ? 'Android app · free, about 6 MB' : 'Android app · scan the code with your phone camera'}</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink" aria-label="Close" autoFocus>
                <X size={20} />
              </button>
            </div>

            {!onPhone && (
              <>
                <div className="mx-auto mt-5 w-56 rounded-2xl bg-white p-1 ring-1 ring-line [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label="QR code that downloads the DiaVita Android app"
                  dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <p className="mt-2 text-center text-xs text-muted">If the scanner shows a link, open it in Chrome.</p>
              </>
            )}

            <a href={APK_URL} download="DiaVita.apk" className="btn btn-primary mt-5 w-full"><Download size={18} /> Download DiaVita.apk</a>
            <a href={APK_PAGE} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-sm font-medium text-ink underline underline-offset-2">
              Download not starting? Open the download page
            </a>

            <ol className="mt-5 flex flex-col gap-2.5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-ink">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky text-xs font-bold">{i + 1}</span>
                  <span className="text-muted">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted">Needs Android 7 or newer and an internet connection. Your data stays in your DiaVita account, the same as on the website.</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
