'use client'

import { useTranslations } from 'next-intl'
import { PageHero, AntiqueDivider } from '@/components/shared/Manuscript'
import { ConstellationInk } from '@/components/ink/InkArt'
import { Link } from '@/i18n/routing'
import { site } from '@/config/site'

type TrackItem = { title: string; body: string }
type TrackKey = 'delivered' | 'inProgress' | 'next'

// 三栏状态色:已交付绿、进行中琥珀、下一步灰
const TRACKS: { key: TrackKey; dot: string; ring: string }[] = [
  { key: 'delivered', dot: 'bg-green-500', ring: 'ring-green-500/30' },
  { key: 'inProgress', dot: 'bg-amber-500 animate-pulse', ring: 'ring-amber-500/30' },
  { key: 'next', dot: 'bg-text-muted/50', ring: 'ring-text-muted/20' },
]

export default function RoadmapPage() {
  const t = useTranslations('roadmap.palium')

  return (
    <div className="relative min-h-screen">
      <PageHero kicker="RELEASE_TRACK" title={t('title')} subtitle={t('subtitle')} mark={<ConstellationInk size={40} />} />

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <AntiqueDivider />
        <section className="mb-16">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {TRACKS.map((track, i) => (
              <TrackColumn
                key={track.key}
                title={t(`${track.key}.title`)}
                items={t.raw(`${track.key}.items`) as TrackItem[]}
                dot={track.dot}
                ring={track.ring}
                delay={i * 0.1}
              />
            ))}
          </div>
        </section>

        <p className="text-text-muted text-sm text-center max-w-2xl mx-auto mb-12">{t('disclaimer')}</p>

        {/* CTA */}
        <section className="pb-8">
          <div className="sheet-stack">
            <div className="sheet p-8 text-center">
              <div className="flex flex-wrap justify-center gap-3">
                <a href={site.github} target="_blank" rel="noopener noreferrer" className="seal-button text-sm">
                  {t('cta.github')} ↗
                </a>
                <Link href="/docs" className="ink-button text-sm">
                  {t('cta.docs')} →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function TrackColumn({
  title,
  items,
  dot,
  ring,
  delay,
}: {
  title: string
  items: TrackItem[]
  dot: string
  ring: string
  delay: number
}) {
  return (
    <div className="fade-in-up" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-3 mb-5 px-1">
        <span className={`w-3 h-3 rounded-full ring-4 ${dot} ${ring}`} aria-hidden="true" />
        <h2 className="text-xl font-display font-bold text-text-primary">{title}</h2>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.title} className="vellum-card p-5">
            <h3 className="font-display font-semibold text-text-primary mb-2">{item.title}</h3>
            <p className="text-sm text-text-secondary font-body leading-relaxed">{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
