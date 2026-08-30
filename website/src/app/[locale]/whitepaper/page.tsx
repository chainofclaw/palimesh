'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function WhitepaperPage() {
  const t = useTranslations('whitepaper')
  const locale = useLocale()
  const mdLang = locale === 'zh' ? 'zh' : 'en'

  const sections = ['pose', 'economics', 'anticheat', 'nongoals'] as const

  return (
    <div>
      {/* Hero */}
      <section className="vellum deckle-bottom">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-3xl">
          <p className="kicker mb-4">{t('kicker')}</p>
          <h1 className="display-xl font-display font-bold mb-5">
            <span className="ink-underline">{t('title')}</span>
          </h1>
          <p className="dropcap text-lg text-text-secondary leading-relaxed mb-8">{t('abstract')}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/downloads/palimesh_whitepaper.${mdLang}.md`}
              download
              className="px-5 py-2.5 rounded-lg bg-text-primary text-bg-primary text-sm font-medium hover:bg-accent-purple transition-colors"
            >
              {t('download')}
            </a>
            <a
              href={`/downloads/palimesh_whitepaper.${mdLang === 'zh' ? 'en' : 'zh'}.md`}
              download
              className="px-5 py-2.5 rounded-lg border border-line bg-bg-elevated text-sm text-text-primary hover:border-accent-blue hover:text-accent-blue transition-colors"
            >
              {t('downloadAlt')}
            </a>
          </div>
        </div>
      </section>

      {/* Overview sections */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          {sections.map((s) => (
            <div key={s} className="vellum-card p-7">
              <h2 className="font-display font-semibold text-2xl mb-3">{t(`${s}.title`)}</h2>
              <p className="text-text-secondary leading-relaxed">{t(`${s}.body`)}</p>
            </div>
          ))}

          <div className="sheet-stack mt-10">
            <div className="sheet p-7 text-center">
              <p className="text-text-secondary mb-4">{t('moreText')}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/technology"
                  className="px-5 py-2.5 rounded-lg border border-line bg-bg-elevated text-sm text-text-primary hover:border-accent-blue hover:text-accent-blue transition-colors"
                >
                  {t('moreTechnology')} →
                </Link>
                <Link
                  href="/roadmap"
                  className="px-5 py-2.5 rounded-lg border border-line bg-bg-elevated text-sm text-text-primary hover:border-accent-blue hover:text-accent-blue transition-colors"
                >
                  {t('moreRoadmap')} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
