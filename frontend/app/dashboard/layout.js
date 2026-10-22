'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, CircleHelp, Droplet, FileText, Fingerprint, LayoutDashboard, LogOut, Menu, Mic, Pill, Search,
  ShieldCheck, User, Utensils, X,
} from 'lucide-react';
import Logo from '@/components/Logo';
import VoiceSheet, { OPEN_VOICE_EVENT } from '@/components/VoiceSheet';
import { Spinner } from '@/components/ui';
import { api, clearToken, getToken } from '@/lib/api';
import { UserContext } from '@/components/UserContext';

const GROUPS = [
  {
    title: 'Track',
    items: [
      { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
      { href: '/dashboard/glucose', label: 'Glucose', icon: Droplet },
      { href: '/dashboard/meals', label: 'Smart Plate', icon: Utensils },
      { href: '/dashboard/activity', label: 'Activity', icon: Activity },
      { href: '/dashboard/medications', label: 'Medicines', icon: Pill },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/dashboard/fingerprint', label: 'Food Fingerprint', icon: Fingerprint },
      { href: '/dashboard/risk', label: 'Risk Check', icon: ShieldCheck },
      { href: '/dashboard/report', label: 'Doctor Report', icon: FileText },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/dashboard/profile', label: 'Profile & goals', icon: User },
      { href: '/dashboard/help', label: 'Help', icon: CircleHelp },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.items);

function NavGroups({ isActive }) {
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1 px-2.5 text-xs font-bold uppercase tracking-wide text-muted">{g.title}</div>
          <div className="flex flex-col">
            {g.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition ${
                  isActive(href) ? 'bg-sky font-semibold text-ink' : 'text-muted hover:bg-white hover:text-ink'
                }`}
              >
                <Icon size={18} strokeWidth={isActive(href) ? 2.3 : 2} /> {label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function HelpCard() {
  return (
    <Link href="/dashboard/help" className="block rounded-xl border border-line bg-white p-3 transition hover:border-aqua">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink"><span className="h-1.5 w-1.5 rounded-full bg-mint-600" /> Need help?</div>
      <div className="mt-2 grid h-16 place-items-center rounded-lg bg-gradient-to-br from-sky via-ice to-mint">
        <CircleHelp size={26} className="text-brand-700" />
      </div>
      <div className="mt-2 text-xs text-muted">Guides, sugar ranges and voice tips.</div>
    </Link>
  );
}

// Header search: jump to any page by name
function PageSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const hits = q.trim() ? ALL.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())) : ALL;

  useEffect(() => {
    const close = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (href) => { setQ(''); setOpen(false); router.push(href); };

  return (
    <div ref={boxRef} className="relative w-[240px]">
      <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) go(hits[0].href); if (e.key === 'Escape') setOpen(false); }}
        placeholder="Search pages" aria-label="Search pages"
        className="h-9 w-full rounded-lg bg-soft pl-8 pr-2 text-sm text-ink outline-none ring-1 ring-line placeholder:text-muted focus:bg-white focus:ring-aqua"
      />
      {open && (
        <div className="absolute left-0 top-11 z-40 w-full overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lg">
          {hits.length ? hits.map(({ href, label, icon: Icon }) => (
            <button key={href} onMouseDown={(e) => e.preventDefault()} onClick={() => go(href)} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-ink hover:bg-soft">
              <Icon size={16} className="text-brand-600" /> {label}
            </button>
          )) : <div className="px-2.5 py-2 text-sm text-muted">No page found</div>}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, initials, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-full bg-aqua text-sm font-bold text-ink ring-2 ring-white" aria-label="Account menu" aria-expanded={open}>
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-line bg-white p-1 shadow-lg">
          <div className="px-3 py-2.5">
            <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/dashboard/profile" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-ink hover:bg-soft"><User size={16} /> Profile & goals</Link>
          <Link href="/dashboard/help" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-ink hover:bg-soft"><CircleHelp size={16} /> Help</Link>
          <button onClick={onLogout} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-rose-700 hover:bg-rose-50"><LogOut size={16} /> Log out</button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [voice, setVoice] = useState(false);
  const closeVoice = useCallback(() => setVoice(false), []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api('/auth/me').then(setUser).catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    const open = () => setVoice(true);
    window.addEventListener(OPEN_VOICE_EVENT, open);
    return () => window.removeEventListener(OPEN_VOICE_EVENT, open);
  }, []);

  const logout = () => {
    clearToken();
    router.replace('/login');
  };

  if (!user) return <div className="min-h-screen"><Spinner /></div>;

  const isActive = (href) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href));
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen">
        {/* Sidebar: 224px, logo row 64px, 36px items */}
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col border-r border-line bg-side lg:flex">
          <div className="flex h-16 shrink-0 items-center px-[22px]"><Link href="/dashboard" aria-label="DiaVita home"><Logo /></Link></div>
          <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-2"><NavGroups isActive={isActive} /></div>
          <div className="p-3"><HelpCard /></div>
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-ink/30" onClick={() => setDrawer(false)} />
            <div className="sheet-up absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-side shadow-2xl">
              <div className="flex h-16 shrink-0 items-center justify-between px-4">
                <Logo />
                <button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white" aria-label="Close menu"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4"><NavGroups isActive={isActive} /></div>
              <div className="border-t border-line p-3">
                <div className="mb-2 flex items-center gap-2.5 px-1">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-aqua text-sm font-bold text-ink">{initials}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user.name}</div>
                    <div className="truncate text-xs text-muted">{user.email}</div>
                  </div>
                </div>
                <button onClick={logout} className="btn btn-soft w-full"><LogOut size={16} /> Log out</button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:pl-[224px]">
          {/* Top bar: 64px, 24px side padding (16px on phones) */}
          <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-page/90 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-soft lg:hidden" aria-label="Open menu">
                <Menu size={20} />
              </button>
              <Link href="/dashboard" className="lg:hidden" aria-label="DiaVita home"><Logo size={28} /></Link>
              <div className="hidden lg:block"><PageSearch /></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setVoice(true)} className="chip hidden bg-mint font-semibold text-ink hover:bg-[#a2ebc3] sm:inline-flex">
                <Mic size={16} /> Speak a reading
              </button>
              <Link href="/dashboard/help" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink" aria-label="Help">
                <CircleHelp size={19} />
              </Link>
              <UserMenu user={user} initials={initials} onLogout={logout} />
            </div>
          </header>

          {/* Content: 56/32/64 padding on laptops, 24/16/48 on phones, 1080px wide */}
          <main className="print-flat px-4 pb-28 pt-6 sm:px-8 lg:pb-16 lg:pt-14">
            <div className="mx-auto w-full max-w-[1080px]">{children}</div>
          </main>
        </div>

        {/* Mobile bottom bar with a centre mic button */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {[ALL[0], ALL[1]].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive(href) ? 'text-brand-700' : 'text-muted'}`}>
              <Icon size={20} /> {label}
            </Link>
          ))}
          <div className="flex justify-center">
            <button onClick={() => setVoice(true)} className="-mt-5 mb-2 grid h-14 w-14 place-items-center rounded-full bg-aqua text-ink shadow-[0_8px_20px_-6px_rgba(31,111,124,0.6)] ring-4 ring-white" aria-label="Speak a reading">
              <Mic size={24} />
            </button>
          </div>
          {[ALL[2]].map(({ href, icon: Icon }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive(href) ? 'text-brand-700' : 'text-muted'}`}>
              <Icon size={20} /> Meals
            </Link>
          ))}
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-muted">
            <Menu size={20} /> More
          </button>
        </nav>

        <VoiceSheet open={voice} onClose={closeVoice} />
      </div>
    </UserContext.Provider>
  );
}
