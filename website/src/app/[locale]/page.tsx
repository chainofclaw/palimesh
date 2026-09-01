'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { NetworkStats } from '@/components/NetworkStats'
import Image from 'next/image'
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram'
import { AgentLayersDiagram } from '@/components/diagrams/AgentLayersDiagram'
import { TopologyDiagram } from '@/components/diagrams/TopologyDiagram'
import { Parallax, InkDraw } from '@/components/fx/Effects'

export default function HomePage() {
  const t = useTranslations('home')
  const td = useTranslations('diagrams')
  const scriptureLines = t.raw('hero.scriptureLines') as string[]

  return (
    <div className="site-canvas overflow-hidden">
      {/* ============ Hero（与全站共享同一羊皮纸底）============ */}
      <section className="manuscript-hero relative">
        <MeshField />
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-28 lg:py-32">
          <div className="grid items-center gap-14 md:grid-cols-[0.92fr_1.08fr] lg:gap-20">
            <div className="hero-copy">
              <p className="kicker mb-4 hero-in hero-in-1">{t('hero.kicker')}</p>
              <h1 className="hero-title display-xl font-display font-bold mb-6 hero-in hero-in-2">
                <span>{t('hero.title')}</span>
              </h1>
              <p className="hero-deck text-lg text-text-secondary leading-relaxed mb-8 max-w-xl hero-in hero-in-3">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-3 hero-in hero-in-4">
                <Link
                  href="/testnet"
                  className="seal-button"
                >
                  {t('hero.ctaTestnet')}
                </Link>
                <Link
                  href="/docs"
                  className="ink-button"
                >
                  {t('hero.ctaDocs')}
                </Link>
              </div>
            </div>

            {/* 透明边缘的经文式品牌羊皮纸 */}
            <div className="hero-art-shell relative hero-in hero-in-3">
              <Parallax speed={0.07}>
                <div className="hero-parchment float-slow">
                  <Image
                    src="/art/palimesh-codex-v4.webp"
                    alt={t('hero.artAlt')}
                    width={1549}
                    height={1015}
                    priority
                    sizes="(min-width: 768px) 46vw, 100vw"
                    className="w-full h-auto"
                  />
                  <div className="scripture-ticker">
                    <span className="sr-only">{scriptureLines.join(' ')}</span>
                    <div className="scripture-ticker__track" aria-hidden="true">
                      {[...scriptureLines, scriptureLines[0]].map((line, index) => (
                        <span className="scripture-ticker__line" key={`${index}-${line}`}>
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Parallax>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Three pillars ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
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
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('parchment.kicker')} title={t('parchment.title')} subtitle={t('parchment.subtitle')} />

          {/* 三拍叙事 */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {(['scribe', 'legible', 'chain'] as const).map((beat, i) => (
              <div key={beat} className="vellum-card manuscript-card p-7">
                <div className="font-display text-2xl text-accent-purple/70 mb-3">{['I', 'II', 'III'][i]}</div>
                <h3 className="font-display font-semibold text-lg mb-2">{t(`parchment.${beat}.title`)}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{t(`parchment.${beat}.body`)}</p>
              </div>
            ))}
          </div>

          {/* Agent 六层叠写:手稿式框图 */}
          <div className="max-w-2xl mx-auto mb-10">
            <InkDraw>
            <AgentLayersDiagram
              labels={{
                aria: td('agent.aria'),
                caption: td('agent.caption'),
                layers: (['identity', 'memory', 'experience', 'reputation', 'assets', 'relationships'] as const).map(
                  (l) => t(`parchment.layers.${l}`),
                ),
              }}
            />
            </InkDraw>
          </div>

          {/* 双笔迹视觉卡:旧墨透出,新墨在上 */}
          <div className="max-w-3xl mx-auto">
            <div className="vellum-card manuscript-card p-8 md:p-10">
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
            <p className="text-center font-display italic text-lg text-accent-purple mt-10">
              {t('parchment.claim')}
            </p>
            <div className="text-center mt-6">
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
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('architecture.kicker')} title={t('architecture.title')} subtitle={t('architecture.subtitle')} />
          <div className="max-w-3xl mx-auto">
            <InkDraw>
            <ArchitectureDiagram
              labels={{
                aria: td('arch.aria'),
                caption: td('arch.caption'),
                l4: td('arch.l4'), l4note: td('arch.l4note'),
                l3: td('arch.l3'), l3note: td('arch.l3note'),
                l2: td('arch.l2'), l2note: td('arch.l2note'),
                l1: td('arch.l1'), l1note: td('arch.l1note'),
                txFlow: td('arch.txFlow'), proofFlow: td('arch.proofFlow'),
              }}
            />
            </InkDraw>
          </div>
        </div>
      </section>

      {/* ============ Live network ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
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
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('node.kicker')} title={t('node.title')} subtitle={t('node.subtitle')} />
          <div className="max-w-3xl mx-auto mb-12">
            <InkDraw>
              <TopologyDiagram
                labels={{
                  aria: td('topo.aria'), caption: td('topo.caption'),
                  validator: td('topo.validator'), storage: td('topo.storage'),
                  relay: td('topo.relay'), rpc: td('topo.rpc'),
                }}
              />
            </InkDraw>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {(['fn', 'sn', 'rn'] as const).map((role) => (
              <div key={role} className="sheet sheet-hover folio-card p-6">
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
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('products.kicker')} title={t('products.title')} subtitle={t('products.subtitle')} />
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {(['soul', 'mem', 'node'] as const).map((p) => (
              <div key={p} className="sheet sheet-hover folio-card p-6">
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
      <div className="section-flourish" aria-hidden="true">
        <span />
        <i />
        <span />
      </div>
      <p className="text-text-secondary leading-relaxed">{subtitle}</p>
    </div>
  )
}

function AntiqueDivider() {
  return (
    <div className="antique-divider" aria-hidden="true">
      <span />
    </div>
  )
}

function PillarCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="sheet-stack">
      <div className="sheet sheet-hover folio-card p-7 h-full">
        <div className="font-mono text-xs text-accent-blue mb-4">{index}</div>
        <h3 className="font-display font-semibold text-xl mb-3">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function MeshField() {
  return (
    <svg
      className="mesh-field"
      aria-hidden="true"
      viewBox="0 0 1400 760"
      preserveAspectRatio="xMidYMid slice"
    >
      <g className="mesh-lines">
        <path d="M70 185 248 92 416 192 594 75 780 168 956 88 1150 185 1335 104" />
        <path d="M70 185 180 370 416 192 510 390 780 168 860 382 1150 185 1240 390" />
        <path d="M180 370 342 620 510 390 690 605 860 382 1042 615 1240 390" />
        <path d="M248 92 180 370M594 75 510 390M956 88 860 382M1335 104 1240 390" />
      </g>
      <g className="mesh-nodes">
        {[['70','185'],['248','92'],['416','192'],['594','75'],['780','168'],['956','88'],['1150','185'],['1335','104'],['180','370'],['510','390'],['860','382'],['1240','390'],['342','620'],['690','605'],['1042','615']].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" />
        ))}
      </g>
    </svg>
  )
}
