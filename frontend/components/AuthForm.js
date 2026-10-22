'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import Photo from '@/components/Photo';
import { Alert } from '@/components/ui';
import { api, setToken } from '@/lib/api';

// Dummy patients created by `npm run db:seed` in the backend (password demo1234), for demos and reviews
const DEMO_PATIENTS = [
  ['Ravi Kumar', 'demo@diavita.app', 'Type 2'], ['Lakshmi Narayanan', 'lakshmi@diavita.app', 'Type 2'],
  ['Arjun Mehta', 'arjun@diavita.app', 'Type 1'], ['Fathima Begum', 'fathima@diavita.app', 'Pre-diabetes'],
  ['Suresh Babu', 'suresh@diavita.app', 'Type 2'], ['Priya Sharma', 'priya@diavita.app', 'Gestational'],
];

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', gender: 'male', diabetes_type: 'type2' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = isRegister ? { ...form, age: form.age ? Number(form.age) : null } : { email: form.email, password: form.password };
      const data = await api(isRegister ? '/auth/register' : '/auth/login', { method: 'POST', body });
      setToken(data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-page lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sky via-ice to-mint p-10 lg:flex">
        <Link href="/" aria-label="DiaVita home"><Logo tagline /></Link>
        <div className="relative">
          <div className="mb-8 h-64 max-w-md overflow-hidden rounded-[20px] ring-4 ring-white/70 xl:h-72">
            <Photo name="couple-walk" eager />
          </div>
          <h2 className="text-[36px] font-bold leading-tight tracking-tight text-ink">Small daily habits.<br />Big change in sugar control.</h2>
          <p className="mt-4 max-w-md text-base text-ink/70">
            Log readings in seconds, find low-GI Indian food swaps and watch your DiaVita Score climb.
          </p>
        </div>
        <div className="text-sm text-ink/60">Semester 5 Project · Bannari Amman Institute of Technology</div>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Link href="/"><Logo tagline /></Link></div>
          <h1 className="text-[22px] font-bold leading-8 tracking-tight text-ink sm:text-[28px] sm:leading-9">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isRegister ? 'Start managing diabetes the smart way.' : 'Log in to see today’s DiaVita Score.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && <Alert type="danger">{error}</Alert>}
            {isRegister && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" className="input" value={form.name} onChange={set('name')} required placeholder="Akash R" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={form.password} onChange={set('password')} required minLength={6} placeholder="At least 6 characters" />
            </div>
            {isRegister && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="age">Age</label>
                  <input id="age" type="number" min="1" max="120" className="input" value={form.age} onChange={set('age')} placeholder="45" />
                </div>
                <div>
                  <label className="label" htmlFor="gender">Gender</label>
                  <select id="gender" className="input" value={form.gender} onChange={set('gender')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor="dtype">Diabetes type</label>
                  <select id="dtype" className="input" value={form.diabetes_type} onChange={set('diabetes_type')}>
                    <option value="type1">Type 1</option>
                    <option value="type2">Type 2</option>
                    <option value="prediabetes">Pre-diabetes</option>
                    <option value="gestational">Gestational</option>
                  </select>
                </div>
              </div>
            )}
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isRegister ? 'Already have an account? ' : 'New to DiaVita? '}
            <Link href={isRegister ? '/login' : '/register'} className="font-semibold text-brand-700 hover:underline">
              {isRegister ? 'Log in' : 'Create one'}
            </Link>
          </p>

          {!isRegister && (
            <div className="mt-8 rounded-[20px] border border-line bg-white p-4">
              <div className="eyebrow text-muted">Demo patients</div>
              <p className="mt-1 text-xs text-muted">Tap a patient to fill in their login.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_PATIENTS.map(([name, email, type]) => (
                  <button key={email} type="button" onClick={() => setForm({ ...form, email, password: 'demo1234' })}
                    className={`rounded-[10px] px-3 py-2 text-left ring-1 transition ${form.email === email ? 'bg-sky ring-aqua' : 'bg-soft ring-line hover:ring-aqua'}`}>
                    <div className="truncate text-sm font-semibold text-ink">{name}</div>
                    <div className="text-[11px] text-muted">{type}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
