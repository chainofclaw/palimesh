'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { NetworkStats } from '@/components/NetworkStats'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <div className="overflow-hidden">
      {/* ============ Hero ============ */}
      <section className="relative border-b border-line grain">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="kicker mb-4">{t('hero.kicker')}</p>
              <h1 className="text-4xl md:text-6xl font-display font-bold leading-[1.08] mb-6">
                <span className="ink-underline">{t('hero.title')}</span>
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-xl">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/testnet"
                  className="px-6 py-3 rounded-lg bg-text-primary text-bg-primary font-medium hover:bg-accent-purple transition-colors"
                >
                  {t('hero.ctaTestnet')}
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 rounded-lg border border-line bg-bg-elevated text-text-primary font-medium hover:border-accent-blue hover:text-accent-blue transition-colors"
                >
                  {t('hero.ctaDocs')}
                </Link>
              </div>
            </div>

            {/* Layered-sheet visual with protocol facts */}
            <div className="relative md:pl-8">
              <div className="sheet-stack">
                <div className="sheet p-8">
                  <div className="font-mono text-xs text-text-muted mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                    {t('hero.factsLabel')}
                  </div>
                  <dl className="space-y-5">
                    <HeroFact label={t('hero.factChain')} value="88780" mono />
                    <HeroFact label={t('hero.factConsensus')} value={t('hero.factConsensusValue')} />
                    <HeroFact label={t('hero.factEvm')} value={t('hero.factEvmValue')} />
                    <HeroFact label={t('hero.factRpc')} value="rpc.palimesh.io" mono />
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Three pillars ============ */}
      <section className="py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('pillars.kicker')} title={t('pillars.title')} subtitle={t('pillars.subtitle')} />
          <div className="grid md:grid-cols-3 gap-6">
            <PillarCard
              index="01"
              title={t('pillars.pose.title')}
              description={t('pillars.pose.description')}
            />
            <PillarCard
              index="02"
              title={t('pillars.storage.title')}
              description={t('pillars.storage.description')}
            />
            <PillarCard
              index="03"
              title={t('pillars.identity.title')}
              description={t('pillars.identity.description')}
            />
          </div>
        </div>
      </section>

      {/* ============ Architecture ============ */}
      <section className="py-section bg-bg-secondary border-y border-line">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('architecture.kicker')} title={t('architecture.title')} subtitle={t('architecture.subtitle')} />
          <div className="max-w-3xl mx-auto space-y-3">
            {(['l4', 'l3', 'l2', 'l1'] as const).map((layer, i) => (
              <div
                key={layer}
                className="sheet sheet-hover p-5 flex items-start gap-5"
                style={{ marginLeft: `${i * 14}px`, marginRight: `${(3 - i) * 14}px` }}
              >
                <span className="font-mono text-xs text-accent-blue pt-1 shrink-0">
                  L{4 - i}
                </span>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">{t(`architecture.${layer}.name`)}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{t(`architecture.${layer}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Live network ============ */}
      <section className="py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('live.kicker')} title={t('live.title')} subtitle={t('live.subtitle')} />
          <div className="max-w-4xl mx-auto">
            <NetworkStats />
            <div className="text-center mt-8">
              <Link
                href="/network"
                className="inline-block px-5 py-2.5 rounded-lg border border-line bg-bg-elevated text-sm text-text-primary hover:border-accent-cyan hover:text-accent-cyan transition-colors"
              >
                {t('live.cta')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Run a node ============ */}
      <section className="py-section bg-bg-secondary border-y border-line grain">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('node.kicker')} title={t('node.title')} subtitle={t('node.subtitle')} />
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {(['fn', 'sn', 'rn'] as const).map((role) => (
              <div key={role} className="sheet sheet-hover p-6">
                <div className="font-mono text-xs text-accent-cyan mb-3 uppercase tracking-widest">
                  {t(`node.${role}.tag`)}
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{t(`node.${role}.name`)}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{t(`node.${role}.description`)}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/testnet"
              className="inline-block px-6 py-3 rounded-lg bg-text-primary text-bg-primary font-medium hover:bg-accent-purple transition-colors"
            >
              {t('node.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ Products ============ */}
      <section className="py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('products.kicker')} title={t('products.title')} subtitle={t('products.subtitle')} />
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {(['soul', 'mem', 'node'] as const).map((p) => (
              <div key={p} className="sheet sheet-hover p-6">
                <div className="font-mono text-xs text-text-muted mb-3">{t(`products.${p}.pkg`)}</div>
                <h3 className="font-display font-semibold text-xl mb-2">{t(`products.${p}.name`)}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{t(`products.${p}.description`)}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/services"
              className="inline-block px-5 py-2.5 rounded-lg border border-line bg-bg-elevated text-sm text-text-primary hover:border-accent-blue hover:text-accent-blue transition-colors"
            >
              {t('products.cta')} →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------- Local building blocks ---------- */

function SectionHead({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      <p className="kicker mb-3">{kicker}</p>
      <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{title}</h2>
      <p className="text-text-secondary leading-relaxed">{subtitle}</p>
    </div>
  )
}

function HeroFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className={`text-text-primary ${mono ? 'font-mono text-sm' : 'font-medium text-sm'}`}>{value}</dd>
    </div>
  )
}

function PillarCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="sheet-stack">
      <div className="sheet sheet-hover p-7 h-full">
        <div className="font-mono text-xs text-accent-blue mb-4">{index}</div>
        <h3 className="font-display font-semibold text-xl mb-3">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
