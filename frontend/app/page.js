import Link from 'next/link';
import {
  Activity, ArrowRight, Brain, Droplet, FileText, Fingerprint, Mic, Pill, ShieldCheck, Sparkles, Utensils, Gauge,
} from 'lucide-react';
import Logo, { LogoMark } from '@/components/Logo';

const FEATURES = [
  { icon: Droplet, title: 'Smart Glucose Log', text: 'Fasting, pre/post-meal and bedtime readings with instant hypo / hyper safety alerts.' },
  { icon: Utensils, title: 'GI-based Smart Plate', text: 'Indian food library with Glycemic Index & Load. Get low-GI swap suggestions for every meal.' },
  { icon: Activity, title: 'Activity Tracker', text: 'Log walks, yoga and workouts. Calories are estimated with MET values and your weight.' },
  { icon: Pill, title: 'Medication Checklist', text: 'Daily tablet & insulin schedule with one-tap “taken” tracking and adherence score.' },
  { icon: Gauge, title: 'DiaVita Score & eA1c', text: 'A single 0–100 lifestyle score plus estimated HbA1c and Time-in-Range from your readings.' },
  { icon: ShieldCheck, title: 'IDRS Risk Check', text: 'Indian Diabetes Risk Score (MDRF) screening for family members in under a minute.' },
  { icon: Brain, title: 'Personal Insights', text: 'Rule-based engine spots patterns like high post-meal sugar and tells you what to change.' },
  { icon: FileText, title: 'Doctor Report', text: 'Printable 7 / 30-day summary of glucose, carbs and activity to share at consultations.' },
];

const INNOVATIONS = [
  { icon: Fingerprint, title: 'Food Fingerprint', text: 'Pairs every meal with your post-meal reading and learns which foods spike YOU — not the average person. Idli may spike you 40% more than its GI says.', tag: 'Personalised nutrition' },
  { icon: Sparkles, title: 'Spike Predictor', text: 'Predicts your post-meal glucose before you eat, using a model fitted to your own data — and shows how much a 15-minute walk would lower it.', tag: 'Personal ML model' },
  { icon: Mic, title: 'Voice in Tamil, Hindi & English', text: 'Say “சர்க்கரை 140 சாப்பிட்ட பின்” and it is logged. Results and low-sugar warnings are read aloud for elderly users.', tag: 'Inclusive by design' },
];

const STACK = ['Next.js 15', 'React 19', 'Tailwind CSS', 'Node.js + Express', 'Neon Postgres', 'JWT Auth'];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo light />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn text-white/90 hover:bg-white/10">Log in</Link>
            <Link href="/register" className="btn bg-white text-brand-800 hover:bg-brand-50">Get started</Link>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-8 sm:px-6 md:grid-cols-2 md:pt-14">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <Sparkles size={14} /> Diabetes Lifestyle Management App
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Keep your sugar in the <span className="text-brand-200">sweet spot</span>, every day.
            </h1>
            <p className="mt-4 max-w-lg text-base text-brand-50/90 sm:text-lg">
              DiaVita brings glucose, food, activity and medicines into one simple daily score — with smart,
              India-first food insights that tell you exactly what to change.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn bg-white px-5 py-3 text-brand-800 hover:bg-brand-50">
                Create free account <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn px-5 py-3 text-white ring-1 ring-white/30 hover:bg-white/10">
                I already have an account
              </Link>
            </div>
          </div>

          {/* Preview card */}
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-3xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur">
              <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today’s DiaVita Score</div>
                    <div className="mt-1 text-4xl font-extrabold text-brand-700">82<span className="text-lg text-slate-400">/100</span></div>
                  </div>
                  <LogoMark size={52} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[['118', 'mg/dL', 'Latest'], ['6.4%', 'eA1c', '30 days'], ['78%', 'TIR', '7 days']].map(([v, u, l]) => (
                    <div key={l} className="rounded-xl bg-brand-50 p-2.5">
                      <div className="text-lg font-extrabold text-brand-800">{v}</div>
                      <div className="text-[10px] font-semibold uppercase text-brand-700/70">{u}</div>
                      <div className="text-[10px] text-slate-500">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <b>Spike Predictor:</b> White rice + sambar → ~214 mg/dL for you. A 15-min walk → ~188.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Innovation */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">What makes DiaVita different</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Other apps store your data. DiaVita learns from it.</h2>
          <p className="mt-3 text-slate-500">The same food raises sugar differently in different people. DiaVita discovers your personal pattern.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {INNOVATIONS.map(({ icon: Icon, title, text, tag }) => (
            <div key={title} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-brand-700 p-6 text-white shadow-lg">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Icon size={24} /></div>
              <div className="mt-4 text-xs font-bold uppercase tracking-wider text-white/70">{tag}</div>
              <h3 className="mt-1 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">Everything a diabetic needs, in one place</h2>
          <p className="mt-3 text-slate-500">Designed for patients, caregivers and doctors — works beautifully on phone and laptop.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card flex flex-col items-center gap-4 p-6 text-center sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Built with</div>
          <div className="flex flex-wrap justify-center gap-2">
            {STACK.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-700">{s}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo size={28} />
          <div className="text-center sm:text-right">
            Semester 5 Project · Akash R & Anupraghavan R · Guide: Prof. Gunavardini V
            <div className="text-xs">DiaVita gives lifestyle guidance and does not replace medical advice.</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
