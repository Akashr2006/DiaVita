'use client';
import { useContext, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import Assistant from '@/components/Assistant';
import { UserContext } from '@/components/UserContext';
import { REFRESH_EVENT } from '@/lib/live';

export { REFRESH_EVENT };
// Any page can open the talking assistant that lives in the dashboard layout
export const OPEN_VOICE_EVENT = 'diavita:open-voice';
export const openVoice = () => window.dispatchEvent(new Event(OPEN_VOICE_EVENT));

// Bottom sheet on phones, centred dialog on laptops
export default function VoiceSheet({ open, onClose }) {
  const { user } = useContext(UserContext) || {};

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="voice-title">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-up relative flex h-[92dvh] w-full flex-col rounded-t-[20px] bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl sm:h-[720px] sm:max-h-[92vh] sm:max-w-[440px] sm:rounded-[20px] sm:p-5">
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" />
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div>
            <h2 id="voice-title" className="text-lg font-semibold text-ink">Talk to DiaVita</h2>
            <p className="text-xs text-muted">பேசுங்க · Speak · बोलिए — saved straight to your records</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <Assistant user={user} />
        <p className="mt-3 shrink-0 text-center text-xs text-muted">
          <Link href="/dashboard/help#voice" onClick={onClose} className="font-semibold text-brand-700 hover:underline">What can I say?</Link>
        </p>
      </div>
    </div>
  );
}
