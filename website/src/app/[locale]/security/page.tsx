'use client'

import { useTranslations } from 'next-intl'
import { PageHero, AntiqueDivider } from '@/components/shared/Manuscript'
import { SealInk } from '@/components/ink/InkArt'
import { Link } from '@/i18n/routing'
import { site } from '@/config/site'

export default function SecurityPage() {
  const t = useTranslations('security')
  const scopeIn = t.raw(`scope.in.${site.variant}`) as string[]

  return (
    <div className="relative min-h-screen">
      
      <PageHero kicker="SECURITY_DISCLOSURE" title={t('title')} subtitle={t('subtitle')} mark={<SealInk size={40} />} />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Contact card — first thing visible */}
        <AntiqueDivider />
        <section className="mb-12 fade-in-up">
          <div className="bg-bg-elevated rounded-xl p-8 border border-accent-cyan/30">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 text-text-primary">
              {t('contact.title')}
            </h2>
            <p className="text-text-secondary font-body mb-6 leading-relaxed">
              {t('contact.body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`mailto:${site.securityEmail}`}
                className="px-6 py-3 rounded-lg bg-text-primary text-bg-primary font-medium transition-all text-center"
              >
                {site.securityEmail}
              </a>
              <a
                href={`${site.github}/security/advisories/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-lg border border-accent-cyan/30 text-accent-cyan font-display font-semibold hover:bg-accent-cyan/10 transition-all text-center"
              >
                {t('contact.advisory')}
              </a>
            </div>
          </div>
        </section>

        {/* Scope */}
        <AntiqueDivider />
        <section className="mb-12 fade-in-up">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 text-text-primary">
            {t('scope.title')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-bg-elevated rounded-xl p-6 border border-green-500/20">
              <h3 className="font-display font-bold text-green-400 mb-3">{t('scope.inTitle')}</h3>
              <ul className="space-y-2 text-text-secondary font-body text-sm">
                {scopeIn.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-bg-elevated rounded-xl p-6 border border-red-500/20">
              <h3 className="font-display font-bold text-red-400 mb-3">{t('scope.outTitle')}</h3>
              <ul className="space-y-2 text-text-secondary font-body text-sm">
                <li>• {t('scope.out.thirdParty')}</li>
                <li>• {t('scope.out.docs')}</li>
                <li>• {t('scope.out.dos')}</li>
                <li>• {t('scope.out.social')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Reward tiers */}
        <AntiqueDivider />
        <section className="mb-12 fade-in-up">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 text-text-primary">
            {t('rewards.title')}
          </h2>
          <div className="bg-bg-elevated rounded-xl overflow-hidden border border-text-muted/10">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-bg-secondary border-b border-text-muted/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-display font-semibold text-text-muted uppercase tracking-wider">{t('rewards.severity')}</th>
                    <th className="px-6 py-4 text-left text-xs font-display font-semibold text-text-muted uppercase tracking-wider">{t('rewards.range')}</th>
                    <th className="px-6 py-4 text-left text-xs font-display font-semibold text-text-muted uppercase tracking-wider">{t('rewards.example')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text-muted/10">
                  <tr><td className="px-6 py-4 font-display text-red-400">Critical</td><td className="px-6 py-4 font-display text-text-primary">$10,000 – $50,000</td><td className="px-6 py-4 font-body text-sm text-text-secondary">{t('rewards.criticalEx')}</td></tr>
                  <tr><td className="px-6 py-4 font-display text-orange-400">High</td><td className="px-6 py-4 font-display text-text-primary">$2,500 – $10,000</td><td className="px-6 py-4 font-body text-sm text-text-secondary">{t('rewards.highEx')}</td></tr>
                  <tr><td className="px-6 py-4 font-display text-yellow-400">Medium</td><td className="px-6 py-4 font-display text-text-primary">$500 – $2,500</td><td className="px-6 py-4 font-body text-sm text-text-secondary">{t('rewards.mediumEx')}</td></tr>
                  <tr><td className="px-6 py-4 font-display text-accent-cyan">Low</td><td className="px-6 py-4 font-display text-text-primary">$100 – $500</td><td className="px-6 py-4 font-body text-sm text-text-secondary">{t('rewards.lowEx')}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Response timeline */}
        <AntiqueDivider />
        <section className="mb-12 fade-in-up">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 text-text-primary">
            {t('timeline.title')}
          </h2>
          <div className="bg-bg-elevated rounded-xl p-8 border border-text-muted/10">
            <ul className="space-y-3 text-text-secondary font-body">
              <li><span className="font-display text-accent-cyan">24h</span> — {t('timeline.ack')}</li>
              <li><span className="font-display text-accent-cyan">7d</span> — {t('timeline.triage')}</li>
              <li><span className="font-display text-accent-cyan">30d</span> — {t('timeline.fix')}</li>
              <li><span className="font-display text-accent-cyan">90d</span> — {t('timeline.disclosure')}</li>
            </ul>
          </div>
        </section>

        {/* Canonical link */}
        <section className="fade-in-up">
          <div className="vellum-card rounded-xl p-8">
            <h3 className="font-display font-bold text-text-primary mb-3">
              {t('canonical.title')}
            </h3>
            <p className="text-text-secondary font-body mb-4">
              {t('canonical.body')}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`${site.github}/blob/main/SECURITY.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-lg border border-accent-cyan/30 text-accent-cyan font-display text-sm hover:bg-accent-cyan/10 transition-all"
              >
                SECURITY.md
              </a>
              <Link
                href="/docs"
                className="px-5 py-2 rounded-lg border border-accent-cyan/30 text-accent-cyan font-display text-sm hover:bg-accent-cyan/10 transition-all"
              >
                {t('canonical.docs')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
