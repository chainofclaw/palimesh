'use client'

import { useTranslations, useLocale } from 'next-intl'
import { AntiqueDivider } from '@/components/shared/Manuscript'
import { Link } from '@/i18n/routing'
import { site } from '@/config/site'

const SECTIONS: Record<typeof site.variant, readonly string[]> = {
  palium: ['pose', 'economics', 'anticheat', 'nongoals'],
  palimesh: ['setup', 'finding', 'guarantees', 'bugs'],
}

export default function WhitepaperPage() {
  const t = useTranslations('whitepaper')
  const tv = useTranslations(`whitepaper.${site.variant}`)
  const locale = useLocale()
  const mdLang = locale === 'zh' ? 'zh' : 'en'
  const altLang = mdLang === 'zh' ? 'en' : 'zh'
  const isStorageSite = site.variant === 'palimesh'

  return (
    <div>
      {/* Hero */}
      <section className="manuscript-hero manuscript-hero--compact relative">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-3xl">
          <p className="kicker mb-4">{tv('kicker')}</p>
          <h1 className="display-xl font-display font-bold mb-5">
            <span className="ink-underline">{tv('title')}</span>
          </h1>
          <p className="dropcap text-lg text-text-secondary leading-relaxed mb-8">{tv('abstract')}</p>
          {isStorageSite && (
            <p className="text-sm text-text-muted mb-8">⚠ {tv('networkNote')}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <a
              href={`/downloads/${site.whitepaperBase}.${mdLang}.md`}
              download
              className="seal-button text-sm"
            >
              {t('download')}
            </a>
            <a
              href={`/downloads/${site.whitepaperBase}.${altLang}.md`}
              download
              className="ink-button text-sm"
            >
              {t('downloadAlt')}
            </a>
          </div>
        </div>
      </section>

      {/* Overview sections */}
      <AntiqueDivider />
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          {SECTIONS[site.variant].map((s) => (
            <div key={s} className="vellum-card p-7">
              <h2 className="font-display font-semibold text-2xl mb-3">{tv(`sections.${s}.title`)}</h2>
              <p className="text-text-secondary leading-relaxed">{tv(`sections.${s}.body`)}</p>
            </div>
          ))}

          <div className="sheet-stack mt-10">
            <div className="sheet p-7 text-center">
              <p className="text-text-secondary mb-4">{t('moreText')}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/technology" className="ink-button text-sm">
                  {t('moreTechnology')} →
                </Link>
                {isStorageSite ? (
                  <Link href="/services" className="ink-button text-sm">
                    {tv('moreServices')} →
                  </Link>
                ) : (
                  <Link href="/roadmap" className="ink-button text-sm">
                    {tv('moreRoadmap')} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
