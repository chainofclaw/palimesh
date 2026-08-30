'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { NetworkStats } from '@/components/NetworkStats'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <div className="overflow-hidden">
      {/* ============ Hero(羊皮纸底)============ */}
      <section className="relative vellum deckle-bottom">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="kicker mb-4">{t('hero.kicker')}</p>
              <h1 className="display-xl font-display font-bold mb-6">
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

      {/* ============ 品牌故事:羊皮纸法则 ============ */}
      <section className="py-section bg-bg-secondary border-y border-line grain">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('parchment.kicker')} title={t('parchment.title')} subtitle={t('parchment.subtitle')} />

          {/* 三拍叙事 */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {(['scribe', 'legible', 'chain'] as const).map((beat, i) => (
              <div key={beat} className="vellum-card p-7">
                <div className="font-display text-2xl text-accent-purple/70 mb-3">{['I', 'II', 'III'][i]}</div>
                <h3 className="font-display font-semibold text-lg mb-2">{t(`parchment.${beat}.title`)}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{t(`parchment.${beat}.body`)}</p>
              </div>
            ))}
          </div>

          {/* 双笔迹视觉卡:旧墨透出,新墨在上 */}
          <div className="max-w-3xl mx-auto">
            <div className="vellum-card p-8 md:p-10">
              <p className="dropcap text-text-primary leading-loose text-lg mb-8">{t('parchment.manuscript')}</p>
              <div className="border-t border-dashed border-[#d8c9a8] pt-6 space-y-4">
                <div>
                  <p className="script-ghost text-base leading-relaxed">{t('parchment.ghostLine')}</p>
                  <p className="font-mono text-[11px] text-text-muted mt-1">{t('parchment.ghostLabel')}</p>
                </div>
                <div>
                  <p className="font-display text-xl text-text-primary">{t('parchment.inkLine')}</p>
                  <p className="font-mono text-[11px] text-accent-blue mt-1">{t('parchment.inkLabel')}</p>
                </div>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link
                href="/story"
                className="inline-block px-5 py-2.5 rounded-lg border border-line bg-bg-primary text-sm text-text-primary hover:border-accent-purple hover:text-accent-purple transition-colors"
              >
                {t('parchment.cta')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Architecture ============ */}
      <section className="py-section">
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
