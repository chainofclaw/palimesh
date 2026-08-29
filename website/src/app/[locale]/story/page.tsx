'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Reveal, ReadingProgress } from '@/components/story/Reveal'

type Moment = { year: string; title: string; body: string }

export default function StoryPage() {
  const t = useTranslations('story')
  const moments = t.raw('ch2.items') as Moment[]
  const legible = t.raw('ch3.legible.items') as string[]

  return (
    <div>
      <ReadingProgress />

      {/* ========== 引子 ========== */}
      <section className="border-b border-line grain">
        <div className="container mx-auto px-4 py-20 md:py-28 max-w-3xl">
          <Reveal>
            <p className="kicker mb-4">{t('kicker')}</p>
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-[1.1] mb-8">
              <span className="ink-underline">{t('title')}</span>
            </h1>
            <p className="text-lg md:text-xl text-text-secondary leading-relaxed">{t('intro')}</p>
          </Reveal>

          {/* 地层视觉:新层覆写旧层 */}
          <Reveal delay={120}>
            <div className="mt-14 select-none" aria-hidden>
              <div className="sheet p-5 relative z-10">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-semibold text-lg">{t('strataTop')}</span>
                  <span className="font-mono text-xs text-accent-blue">2026 —</span>
                </div>
              </div>
              <div className="sheet p-5 -mt-2 ml-4 mr-1 opacity-60 rotate-[0.5deg]">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-semibold text-lg text-text-secondary">{t('strataBottom')}</span>
                  <span className="font-mono text-xs text-text-muted">2026</span>
                </div>
              </div>
              <div className="h-1.5 -mt-1 ml-8 mr-2 rounded-b-lg bg-bg-secondary border border-t-0 border-line opacity-40" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========== 第一章:ClawChain ========== */}
      <section className="py-section">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <ChapterHead label={t('ch1.label')} title={t('ch1.title')} />
            <p className="text-text-secondary leading-relaxed text-lg mb-8 whitespace-pre-line">{t('ch1.body')}</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {(['chain', 'pose', 'soul'] as const).map((f, i) => (
              <Reveal key={f} delay={i * 60}>
                <div className="sheet p-5 h-full">
                  <div className="font-mono text-xs text-accent-cyan mb-2">{t(`ch1.facts.${f}.tag`)}</div>
                  <p className="text-sm text-text-secondary leading-relaxed">{t(`ch1.facts.${f}.text`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 第二章:淬炼 ========== */}
      <section className="py-section bg-bg-secondary border-y border-line grain">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <ChapterHead label={t('ch2.label')} title={t('ch2.title')} />
            <p className="text-text-secondary leading-relaxed text-lg mb-12">{t('ch2.body')}</p>
          </Reveal>
          <ol className="relative border-l-2 border-line ml-2 space-y-10">
            {moments.map((m, i) => (
              <li key={i} className="pl-8 relative">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-accent-blue border-2 border-bg-secondary" />
                <Reveal delay={i * 40}>
                  <div className="font-mono text-xs text-text-muted mb-1">{m.year}</div>
                  <h3 className="font-display font-semibold text-xl mb-1.5">{m.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{m.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ========== 第三章:Palimesh ========== */}
      <section className="py-section">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <ChapterHead label={t('ch3.label')} title={t('ch3.title')} />
            <p className="text-text-secondary leading-relaxed text-lg mb-10 whitespace-pre-line">{t('ch3.body')}</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="sheet-stack">
              <div className="sheet p-7">
                <h3 className="font-display font-semibold text-xl mb-4">{t('ch3.legible.title')}</h3>
                <ul className="space-y-3">
                  {legible.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========== 高潮 CTA ========== */}
      <section className="py-section bg-bg-secondary border-t border-line grain">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-text-secondary leading-relaxed mb-8">{t('cta.body')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://explorer.palimesh.io"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-lg bg-text-primary text-bg-primary font-medium hover:bg-accent-purple transition-colors"
              >
                {t('cta.explorer')}
              </a>
              <Link
                href="/testnet"
                className="px-6 py-3 rounded-lg border border-line bg-bg-elevated text-text-primary font-medium hover:border-accent-blue hover:text-accent-blue transition-colors"
              >
                {t('cta.testnet')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

function ChapterHead({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="kicker mb-3">{label}</p>
      <h2 className="text-3xl md:text-4xl font-display font-bold">{title}</h2>
    </div>
  )
}
