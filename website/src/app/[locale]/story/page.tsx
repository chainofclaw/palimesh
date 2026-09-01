'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Reveal, ReadingProgress } from '@/components/story/Reveal'
import { AgentLayersDiagram } from '@/components/diagrams/AgentLayersDiagram'
import { ScrollInk, SealInk, QuillInk } from '@/components/ink/InkArt'

type Moment = { year: string; title: string; body: string }

export default function StoryPage() {
  const t = useTranslations('story')
  const tp = useTranslations('home.parchment')
  const td = useTranslations('diagrams')
  const moments = t.raw('ch2.items') as Moment[]
  const legible = t.raw('ch3.legible.items') as string[]

  return (
    <div>
      <ReadingProgress />

      {/* ========== 引子 ========== */}
      <section className="manuscript-hero manuscript-hero--compact relative">
        <div className="container mx-auto px-4 py-20 md:py-28 max-w-3xl relative">
          <Reveal>
            <p className="kicker mb-4">{t('kicker')}</p>
            <h1 className="display-xl font-display font-bold mb-8">
              <span className="ink-underline">{t('title')}</span>
            </h1>
            <p className="dropcap text-lg md:text-xl text-text-secondary leading-relaxed">{t('intro')}</p>
          </Reveal>

          {/* 地层视觉:新层覆写旧层(上层 PaliMesh 压住透出旧笔迹的 ClawChain 层) */}
          <Reveal delay={120}>
            <div className="mt-14 select-none" aria-hidden>
              <div className="sheet p-6 relative z-10 border-l-4 border-l-accent-blue">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-display font-bold text-xl">{t('strataTop')}</span>
                  <span className="font-mono text-xs text-accent-blue">2026 —</span>
                </div>
                <p className="text-sm text-text-secondary">{t('strataTopLine')}</p>
              </div>
              <div className="vellum-card p-6 -mt-3 ml-6 mr-1 rotate-[0.8deg] relative">
                <div className="flex items-baseline justify-between mb-2 opacity-70">
                  <span className="font-display font-bold text-xl text-text-secondary line-through decoration-1 decoration-text-muted/60">
                    {t('strataBottom')}
                  </span>
                  <span className="font-mono text-xs text-text-muted">2026</span>
                </div>
                <p className="text-sm italic text-text-muted opacity-80">{t('strataBottomLine')}</p>
              </div>
              <div className="h-2 -mt-1 ml-12 mr-3 rounded-b-lg bg-bg-secondary border border-t-0 border-line opacity-50 rotate-[1.4deg]" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========== 第一章:ClawChain ========== */}
      <section className="py-section">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <ChapterHead label={t('ch1.label')} title={t('ch1.title')} icon={<ScrollInk size={26} />} />
            <p className="text-text-secondary leading-relaxed text-lg mb-8 whitespace-pre-line">{t('ch1.body')}</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {(['chain', 'pose', 'soul'] as const).map((f, i) => (
              <Reveal key={f} delay={i * 60}>
                <div className="vellum-card p-5 h-full">
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
            <ChapterHead label={t('ch2.label')} title={t('ch2.title')} icon={<SealInk size={26} />} />
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

      {/* ========== 第三章:PaliMesh ========== */}
      <section className="py-section">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <ChapterHead label={t('ch3.label')} title={t('ch3.title')} icon={<QuillInk size={26} />} />
            <p className="text-text-secondary leading-relaxed text-lg mb-10 whitespace-pre-line">{t('ch3.body')}</p>
          </Reveal>
          <Reveal delay={60}>
            <AgentLayersDiagram
              labels={{
                aria: td('agent.aria'),
                caption: td('agent.caption'),
                layers: (['identity', 'memory', 'experience', 'reputation', 'assets', 'relationships']).map(
                  (l) => tp(`layers.${l}`),
                ),
              }}
            />
          </Reveal>
          <Reveal delay={100}>
            <div className="sheet-stack">
              <div className="vellum-card p-7">
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
          {/* 品牌承诺句(与首页羊皮纸法则同源) */}
          <Reveal>
            <div className="vellum-card p-7 md:p-8 mb-12 text-left">
              <p className="dropcap text-text-primary leading-loose">{tp('manuscript')}</p>
            </div>
          </Reveal>
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-text-secondary leading-relaxed mb-8">{t('cta.body')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://explorer.palimesh.io"
                target="_blank"
                rel="noopener noreferrer"
                className="seal-button"
              >
                {t('cta.explorer')}
              </a>
              <Link
                href="/testnet"
                className="ink-button"
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

function ChapterHead({ label, title, icon }: { label: string; title: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        {icon && <span className="text-accent-purple/70">{icon}</span>}
        <p className="kicker">{label}</p>
      </div>
      <h2 className="text-3xl md:text-4xl font-display font-bold">{title}</h2>
    </div>
  )
}
