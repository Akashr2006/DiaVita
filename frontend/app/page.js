import Link from 'next/link';
import {
  Activity, ArrowRight, Brain, ChartLine, Droplet, FileText, Fingerprint, Gauge, Languages, Mic, Pill, ShieldCheck,
  Smartphone, Sparkles, Utensils,
} from 'lucide-react';
import Logo from '@/components/Logo';
import MobileStart from '@/components/MobileStart';
import QRCode from 'qrcode';
import TryMobile from '@/components/TryMobile';
import { APK_URL } from '@/lib/mobile';
import Photo from '@/components/Photo';
import Accordion from '@/components/Accordion';
import { FAQ, SUGAR_RANGES } from '@/lib/help';

const TILES = ['bg-sky', 'bg-mint', 'bg-aqua/70', 'bg-ice'];

const INNOVATIONS = [
  { icon: Fingerprint, photo: 'healthy-plate', label: 'Learns from you', title: 'Food Fingerprint', text: 'Matches each meal with your sugar reading after it and learns which foods raise your sugar more or less than expected.' },
  { icon: Sparkles, photo: 'glucometer-high', label: 'Before you eat', title: 'Spike Predictor', text: 'Shows how high your sugar may go after a meal, before you eat it, and how much a 10, 15 or 30 minute walk lowers it.' },
  { icon: Mic, photo: 'elder-glucometer', label: 'Tamil · Hindi · English', title: 'Voice entry', text: 'Say “sugar 140 after lunch” in your own language. The reading is saved and the result is read back aloud.' },
];

const FEATURES = [
  { icon: Droplet, title: 'Sugar log', text: 'Fasting, before and after meal readings with instant low and high alerts.' },
  { icon: Utensils, title: 'Smart Plate', text: 'Indian food list with carbs, calories and glycemic load for every meal.' },
  { icon: Activity, title: 'Activity', text: 'Walks, yoga and exercise with calories burned and a daily goal.' },
  { icon: Pill, title: 'Medicines', text: 'Daily tablet and insulin checklist with one-tap “taken”.' },
  { icon: Gauge, title: 'DiaVita Score', text: 'One simple 0–100 score for the day, plus estimated HbA1c.' },
  { icon: ShieldCheck, title: 'Risk check', text: 'Indian Diabetes Risk Score for family members in a minute.' },
  { icon: Brain, title: 'Smart tips', text: 'Clear advice from your own data, such as walking after a heavy meal.' },
  { icon: FileText, title: 'Doctor report', text: 'A 7, 14 or 30 day summary to print or save as PDF.' },
];

const HABITS = [
  { photo: 'finger-prick', title: 'Check at the same times', text: 'Fasting, and two hours after your main meals.', big: true },
  { photo: 'lemon-water', title: 'Drink enough water', text: 'Water helps your body when sugar runs high.' },
  { photo: 'heart-workout', title: 'Move every day', text: '30 minutes of walking or yoga.' },
  { photo: 'no-sugar', title: 'Cut added sugar', text: 'Tea, sweets and soft drinks add up fast.' },
  { photo: 'work-kit', title: 'Carry your kit', text: 'Check at work or while travelling.' },
];

const STEPS = [
  { icon: Droplet, title: 'Log', text: 'Add your sugar, meals, walks and medicines by typing or speaking.' },
  { icon: ChartLine, title: 'Learn', text: 'DiaVita pairs meals with readings and finds your personal food pattern.' },
  { icon: Sparkles, title: 'Improve', text: 'Get predictions and simple tips that fit your body, not the average.' },
];

function Heading({ eyebrow, title, text }) {
  return (
    <div className="max-w-[680px]">
      <div className="eyebrow text-brand-700">{eyebrow}</div>
      <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h2>
      {text && <p className="mt-3 text-base text-muted">{text}</p>}
    </div>
  );
}

export default async function Home() {
  // the Android app opens straight into the app, not the marketing page
  if (process.env.NEXT_PUBLIC_MOBILE === '1') return <MobileStart />;
  // QR code for the "Try in mobile" button, drawn once when the page is built
  const qrSvg = await QRCode.toString(APK_URL, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0d2b30', light: '#ffffff' } });
  return (
    <div className="min-h-screen overflow-x-hidden bg-page">
      {/* Header: 64px */}
      <header className="sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between gap-3 px-4 sm:px-8 xl:px-0">
          <Link href="/" aria-label="DiaVita home"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[['#innovation', 'Innovation'], ['#features', 'Features'], ['#how', 'How it works'], ['#help', 'Help']].map(([h, l]) => (
              <a key={h} href={h} className="chip text-muted hover:bg-soft hover:text-ink">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <TryMobile qrSvg={qrSvg} />
            <Link href="/login" className="btn btn-plain btn-sm">Log in</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1080px] flex-col gap-16 px-4 pb-16 pt-10 sm:gap-20 sm:px-8 sm:pt-14 xl:px-0">
        {/* Hero: 680px text column + 344px card */}
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_344px] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-2.5 py-1 text-xs font-semibold text-ink">
              <Sparkles size={14} /> Diabetes lifestyle app, made for India
            </span>
            <h1 className="mt-5 text-[34px] font-bold leading-[1.15] tracking-tight text-ink sm:text-[48px]">
              Know how <span className="rounded-lg bg-sky px-1.5">your</span> body reacts to food, and keep sugar in range.
            </h1>
            <p className="mt-5 max-w-[560px] text-base text-muted sm:text-lg">
              DiaVita brings sugar readings, meals, walks and medicines into one simple daily score, and learns
              which foods raise your sugar the most.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn btn-primary px-5">Create free account <ArrowRight size={16} /></Link>
              <Link href="/login" className="btn btn-soft px-5">I already have an account</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="flex items-center gap-2"><Smartphone size={16} className="text-brand-600" /> Phone and laptop</span>
              <span className="flex items-center gap-2"><Languages size={16} className="text-brand-600" /> English, தமிழ், हिंदी</span>
              <span className="flex items-center gap-2"><Droplet size={16} className="text-brand-600" /> Works with any glucometer</span>
            </div>
          </div>

          <div className="card mx-auto w-full max-w-[344px] p-5">
            <div className="relative aspect-square overflow-hidden rounded-xl">
              <Photo name="checking-phone" eager />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint"><Droplet size={16} /></span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-ink">118 mg/dL</div>
                  <div className="text-[11px] text-muted">After lunch · in range</div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <div className="eyebrow text-muted">Today’s score</div>
                <div className="text-[28px] font-bold text-ink">82<span className="text-base font-medium text-muted">/100</span></div>
              </div>
              <span className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-ink">In range 78%</span>
            </div>
            <div className="mt-3 rounded-[10px] bg-soft p-3 text-xs text-ink ring-1 ring-line">
              <b>Spike Predictor:</b> rice + sambar → about 214 mg/dL. With a 15 minute walk → about 188.
            </div>
          </div>
        </section>

        {/* Innovation */}
        <section id="innovation" className="flex scroll-mt-20 flex-col gap-8">
          <Heading eyebrow="What makes DiaVita different" title="Other apps store your data. DiaVita learns from it."
            text="The same food raises sugar differently in different people. DiaVita finds your personal pattern using only a normal glucometer." />
          <div className="grid gap-4 md:grid-cols-3">
            {INNOVATIONS.map(({ icon: Icon, photo, label, title, text }, i) => (
              <div key={title} className="card flex flex-col p-3">
                <div className="relative h-[180px] overflow-hidden rounded-xl">
                  <Photo name={photo} />
                  <div className={`absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl text-ink shadow-sm ${TILES[i]}`}><Icon size={20} /></div>
                </div>
                <div className="px-2 pb-2 pt-4">
                  <div className="eyebrow text-brand-700">{label}</div>
                  <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="flex scroll-mt-20 flex-col gap-8">
          <Heading eyebrow="Features" title="Everything for daily diabetes care, in one place"
            text="Built for patients, family members and doctors. Every page works the same on phone and laptop." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="card p-5">
                <div className={`icon-tile h-10 w-10 ${TILES[i % 4]}`}><Icon size={20} /></div>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Daily habits: photo grid */}
        <section id="habits" className="flex scroll-mt-20 flex-col gap-8">
          <Heading eyebrow="Daily habits" title="Small habits that DiaVita helps you keep" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:grid-rows-[220px_220px]">
            {HABITS.map(({ photo, title, text, big }) => (
              <div key={title} className={`relative overflow-hidden rounded-[20px] border border-line ${big ? 'col-span-2 h-[240px] lg:row-span-2 lg:h-auto' : 'h-[190px] lg:h-auto'}`}>
                <Photo name={photo} />
                <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-white/90 px-3 py-2 backdrop-blur sm:inset-x-3 sm:bottom-3">
                  <div className="text-sm font-semibold leading-5 text-ink">{title}</div>
                  <div className={`text-xs text-muted ${big ? '' : 'hidden sm:block'}`}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="flex scroll-mt-20 flex-col gap-8">
          <Heading eyebrow="How it works" title="Three simple steps" />
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="card flex gap-4 p-5">
                <div className={`icon-tile h-10 w-10 ${TILES[i]}`}><Icon size={20} /></div>
                <div>
                  <div className="text-xs font-bold text-muted">Step {i + 1}</div>
                  <h3 className="text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Help */}
        <section id="help" className="flex scroll-mt-20 flex-col gap-8">
          <Heading eyebrow="Help" title="Questions people ask" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_344px] lg:items-start lg:gap-14">
            <Accordion items={FAQ} />
            <div className="card p-5">
              <h3 className="text-base font-semibold text-ink">Sugar ranges</h3>
              <p className="mt-1 text-xs text-muted">General targets. Your doctor may set different ones.</p>
              <div className="mt-4 flex flex-col gap-2">
                {SUGAR_RANGES.map((r) => (
                  <div key={r.label} className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 ${r.tone}`}>
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="text-xs font-semibold">{r.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="grid items-center gap-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-sky via-ice to-mint p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_344px] lg:gap-14 lg:p-10">
          <div className="text-center lg:text-left">
            <h2 className="text-[26px] font-bold tracking-tight text-ink sm:text-[32px]">Start your first healthy week</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-base text-ink/70 lg:mx-0">Create a free account and try the demo data to see every feature in one minute.</p>
            <Link href="/register" className="btn mt-6 bg-ink px-6 text-white hover:bg-brand-900">Create free account <ArrowRight size={16} /></Link>
          </div>
          <div className="h-56 overflow-hidden rounded-xl ring-4 ring-white/70 lg:h-[260px]">
            <Photo name="couple-walk" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1080px] flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-8 xl:px-0">
          <Logo size={28} />
          <div className="text-center sm:text-right">
            Semester 5 Project · Akash R & Anupraghavan R · Guide: Prof. Gunavardini V
            <div className="text-xs">DiaVita gives lifestyle guidance and does not replace medical advice.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
