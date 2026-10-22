'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, Droplet, FileText, Fingerprint, LayoutDashboard, LogOut, Menu, Pill, ShieldCheck, User, Utensils, X,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Spinner } from '@/components/ui';
import { api, clearToken, getToken } from '@/lib/api';
import { UserContext } from '@/components/UserContext';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/glucose', label: 'Glucose', icon: Droplet },
  { href: '/dashboard/meals', label: 'Meals', icon: Utensils },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
  { href: '/dashboard/medications', label: 'Meds', icon: Pill },
  { href: '/dashboard/fingerprint', label: 'Food Fingerprint', icon: Fingerprint },
  { href: '/dashboard/risk', label: 'Risk Check', icon: ShieldCheck },
  { href: '/dashboard/report', label: 'Report', icon: FileText },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api('/auth/me').then(setUser).catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => setOpen(false), [pathname]);

  const logout = () => {
    clearToken();
    router.replace('/login');
  };

  if (!user) return <div className="min-h-screen"><Spinner /></div>;

  const isActive = (href) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href));

  const NavLinks = () => (
    <nav className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            isActive(href) ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Icon size={18} /> {label}
        </Link>
      ))}
    </nav>
  );

  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen md:flex">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
          <div className="px-2 py-2"><Link href="/dashboard"><Logo tagline /></Link></div>
          <div className="mt-6 flex-1"><NavLinks /></div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-slate-500">{user.email}</div>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-rose-600" title="Log out" aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard"><Logo size={32} /></Link>
          <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="Open menu">
            <Menu size={22} />
          </button>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <Logo size={32} />
                <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Close menu"><X size={20} /></button>
              </div>
              <div className="flex-1"><NavLinks /></div>
              <button onClick={logout} className="btn btn-ghost w-full"><LogOut size={16} /> Log out</button>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive(href) ? 'text-brand-700' : 'text-slate-500'}`}>
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </UserContext.Provider>
  );
}
