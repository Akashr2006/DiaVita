'use client';
import Link from 'next/link';
import { ArrowRight, Mic, PhoneCall, Volume2 } from 'lucide-react';
import Accordion from '@/components/Accordion';
import Photo from '@/components/Photo';
import { speakText } from '@/components/Assistant';
import { ASSISTANT_EXAMPLES, ASSISTANT_LANGS } from '@/lib/assistant';
import { openVoice } from '@/components/VoiceSheet';
import { PageHeader, Section } from '@/components/ui';
import { FAQ, GETTING_STARTED, LOW_SUGAR_STEPS, PAGE_GUIDE, SEE_DOCTOR, SUGAR_RANGES } from '@/lib/help';

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help" subtitle="Short, simple guides to get the most out of DiaVita." />

      <div className="flex flex-col gap-12 xl:grid xl:grid-cols-[minmax(0,1fr)_344px] xl:items-start xl:gap-14">
        <div className="flex min-w-0 flex-col gap-12 xl:gap-20">
          <Section title="Getting started">
            <div className="relative h-48 overflow-hidden rounded-[20px] border border-line sm:h-56">
              <Photo name="checking-phone" />
              <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-4 py-2.5 backdrop-blur">
                <div className="eyebrow text-brand-700">Day one</div>
                <div className="text-base font-semibold text-ink">Four steps and you are ready</div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {GETTING_STARTED.map((s, i) => (
                <Link key={s.title} href={s.href} className="card group flex gap-4 p-5 transition hover:border-aqua">
                  <div className={`icon-tile h-9 w-9 text-sm font-bold ${['bg-sky', 'bg-mint', 'bg-aqua/70', 'bg-ice'][i]}`}>{i + 1}</div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.text}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Go <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Talk to DiaVita">
            <div id="voice" className="card scroll-mt-24 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-32"><Photo name="elder-glucometer" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink">Just talk, like to a person</h3>
                  <p className="text-sm text-muted">Tap the mic and say what you did. DiaVita asks what it needs ("How much?", "Before or after food?"), reads the answer aloud and saves it after you say yes.</p>
                </div>
                <button onClick={openVoice} className="btn btn-primary shrink-0"><Mic size={16} /> Try it now</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {ASSISTANT_LANGS.map((l) => (
                  <div key={l.code} className="min-w-0 rounded-xl bg-soft p-3 ring-1 ring-line">
                    <div className="eyebrow mb-2 text-brand-700">{l.label}</div>
                    <div className="flex flex-col gap-1.5">
                      {ASSISTANT_EXAMPLES[l.code].map((ex) => (
                        <button key={ex} onClick={() => speakText(l.code, ex)} title="Hear how to say it"
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-left text-[13px] text-ink ring-1 ring-line hover:ring-aqua">
                          <span className="min-w-0 truncate">{ex}</span>
                          <Volume2 size={14} className="shrink-0 text-brand-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">Tap any example to hear it. Voice works in Chrome or Edge; allow the microphone when asked. You can also type, or tap the big buttons.</p>
            </div>
          </Section>

          <Section title="What each page does">
            <div className="card divide-y divide-line">
              {PAGE_GUIDE.map((p) => (
                <div key={p.page} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6">
                  <div className="w-36 shrink-0 text-sm font-semibold text-ink">{p.page}</div>
                  <p className="text-sm text-muted">{p.text}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Common questions">
            <Accordion items={FAQ} />
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="card p-5">
            <h3 className="text-base font-semibold text-ink">Sugar ranges</h3>
            <p className="mt-1 text-xs text-muted">General targets. Your doctor may set different ones.</p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGAR_RANGES.map((r) => (
                <div key={r.label} className={`rounded-xl px-3.5 py-3 ${r.tone}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="text-xs font-semibold">{r.range}</span>
                  </div>
                  <div className="mt-0.5 text-xs opacity-80">{r.text}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h3 className="text-base font-semibold text-ink">If your sugar is low</h3>
            <p className="mt-1 text-xs text-muted">The 15-15 rule</p>
            <ol className="mt-4 flex flex-col gap-3">
              {LOW_SUGAR_STEPS.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-ink">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky text-xs font-bold">{i + 1}</span>
                  <span className="text-muted">{s}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card bg-ice/30 p-5">
            <div className="flex items-center gap-2 text-base font-semibold text-ink"><PhoneCall size={18} className="text-brand-700" /> Call your doctor when</div>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
              {SEE_DOCTOR.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <p className="mt-4 text-xs text-muted">DiaVita gives lifestyle guidance and does not replace medical advice.</p>
          </section>
        </div>
      </div>
    </>
  );
}
