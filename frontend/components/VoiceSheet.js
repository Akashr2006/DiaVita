'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import VoiceEntry from '@/components/VoiceEntry';
import { Alert } from '@/components/ui';

// Pages listen for this event to reload their data after a reading is saved from anywhere
export const REFRESH_EVENT = 'diavita:refresh';
// Any page can open the voice sheet that lives in the dashboard layout
export const OPEN_VOICE_EVENT = 'diavita:open-voice';
export const openVoice = () => window.dispatchEvent(new Event(OPEN_VOICE_EVENT));

// Bottom sheet on phones, centred dialog on laptops
export default function VoiceSheet({ open, onClose }) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setAlert(null);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="voice-title">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-up relative max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-[400px] sm:rounded-[20px] sm:pb-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="voice-title" className="text-lg font-semibold text-ink">Speak a reading</h2>
            <p className="text-xs text-muted">English, Tamil or Hindi · saved straight to your log</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink" aria-label="Close" autoFocus>
            <X size={18} />
          </button>
        </div>
        <VoiceEntry
          onSaved={(a) => {
            setAlert(a);
            window.dispatchEvent(new Event(REFRESH_EVENT));
          }}
        />
        {alert && alert.level !== 'success' && (
          <div className="mt-4"><Alert type={alert.level} onClose={() => setAlert(null)}>{alert.message}</Alert></div>
        )}
        <p className="mt-4 text-center text-xs text-muted">
          Need help? See <Link href="/dashboard/help#voice" onClick={onClose} className="font-semibold text-brand-700 hover:underline">voice tips</Link>
        </p>
      </div>
    </div>
  );
}
