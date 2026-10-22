'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { Alert } from '@/components/ui';
import { api, setToken } from '@/lib/api';

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
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 to-brand-600 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl" />
        <Link href="/"><Logo light tagline /></Link>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">Small daily habits.<br />Big change in sugar control.</h2>
          <p className="mt-4 max-w-md text-brand-50/90">
            Log readings in seconds, discover low-GI Indian food swaps and watch your DiaVita Score climb.
          </p>
        </div>
        <div className="text-sm text-brand-100/80">Semester 5 Project · Bannari Amman Institute of Technology</div>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Link href="/"><Logo tagline /></Link></div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="label" htmlFor="dtype">Type</label>
                  <select id="dtype" className="input" value={form.diabetes_type} onChange={set('diabetes_type')}>
                    <option value="type1">Type 1</option>
                    <option value="type2">Type 2</option>
                    <option value="prediabetes">Pre-diabetes</option>
                    <option value="gestational">Gestational</option>
                  </select>
                </div>
              </div>
            )}
            <button className="btn btn-primary w-full py-3" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account? ' : 'New to DiaVita? '}
            <Link href={isRegister ? '/login' : '/register'} className="font-semibold text-brand-700 hover:underline">
              {isRegister ? 'Log in' : 'Create one'}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
