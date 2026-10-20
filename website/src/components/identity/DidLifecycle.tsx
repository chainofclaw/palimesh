'use client'

// PaliMesh 站的身份页:did:coc 生命周期叙事(无钱包交互)
import { useTranslations } from 'next-intl'
import { site } from '@/config/site'
import { Link } from '@/i18n/routing'
import { PageHero, AntiqueDivider, SectionHead } from '@/components/shared/Manuscript'
import { SealInk } from '@/components/ink/InkArt'

type Step = { title: string; body: string }

export function DidLifecycle() {
  const t = useTranslations('identity.palimesh')
  const steps = t.raw('lifecycle.steps') as Step[]
  const soulItems = t.raw('soul.items') as string[]

  return (
    <div className="relative">
      <PageHero
        kicker={t('kicker')}
        title={t('title')}
        subtitle={t('subtitle')}
        mark={<SealInk size={40} />}
      />

      {/* 生命周期六步 */}
      <AntiqueDivider />
      <section className="mb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <SectionHead kicker={t('kicker')} title={t('lifecycle.title')} subtitle={t('lifecycle.subtitle')} />
          <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <li key={i} className="vellum-card p-6 h-full">
                <div className="font-mono text-xs text-accent-purple/70 mb-2">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 能力位掩码 + Soul 备份 */}
      <AntiqueDivider />
      <section className="mb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="vellum-card p-7">
              <h3 className="font-display font-semibold text-xl mb-3">{t('capabilities.title')}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{t('capabilities.body')}</p>
            </div>
            <div className="vellum-card p-7">
              <h3 className="font-display font-semibold text-xl mb-3">{t('soul.title')}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{t('soul.body')}</p>
              <ul className="space-y-2">
                {soulItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 方法名来历 + 链上注册表 */}
      <AntiqueDivider />
      <section className="mb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="vellum-card p-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-accent-cyan px-2 py-0.5 rounded border border-accent-cyan/40 bg-accent-cyan/10">
                  did:coc
                </span>
                <h3 className="font-display font-semibold text-xl">{t('method.title')}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{t('method.body')}</p>
            </div>
            <div className="sheet folio-card p-7">
              <h3 className="font-display font-semibold text-xl mb-3">{t('registry.title')}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">{t('registry.body')}</p>
              <a
                href={site.chain.explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="ink-button text-sm"
              >
                {t('registry.cta')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 底部 CTA */}
      <AntiqueDivider />
      <section className="mb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="vellum-card p-7 md:p-8">
            <div className="bg-bg-primary/60 rounded-lg p-3 font-mono text-sm text-text-primary border border-text-muted/10 mb-6">
              <span className="text-text-muted">$ </span>
              <span>{t('install')}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/services" className="seal-button">
                {t('ctaInstall')}
              </Link>
              <Link href="/docs" className="ink-button">
                {t('ctaDocs')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
