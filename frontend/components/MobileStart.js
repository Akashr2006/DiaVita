'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoMark } from '@/components/Logo';
import { getToken } from '@/lib/api';

// First screen of the Android app: a short splash, then straight to the dashboard (or login).
// The phone app has no marketing page, and moving on with the router keeps it a single-page app.
export default function MobileStart() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getToken() ? '/dashboard/' : '/login/');
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-page">
      <div className="flex flex-col items-center gap-3">
        <LogoMark size={88} />
        <div className="text-2xl font-bold tracking-tight text-ink">Dia<span className="text-brand-600">Vita</span></div>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-sky border-t-brand-500" aria-label="Loading" />
      </div>
    </main>
  );
}
