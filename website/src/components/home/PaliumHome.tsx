'use client'

import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { crossSiteUrl } from '@/config/site'
import { AntiqueDivider, SectionHead } from '@/components/shared/Manuscript'
import { Link } from '@/i18n/routing'
import { NetworkStats } from '@/components/NetworkStats'
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram'
import { TopologyDiagram } from '@/components/diagrams/TopologyDiagram'
import { InkDraw } from '@/components/fx/Effects'
import { Hero } from './Hero'
import { PillarCard, ExtLink, ElsewhereNote } from './HomeBits'

const ROMAN = ['I', 'II', 'III'] as const
const PILLARS = ['consensus', 'evm', 'settlement'] as const
const PRINCIPLES = ['verify', 'standards', 'nongoals'] as const
const LAYERS = ['l1', 'l2', 'l3', 'l4'] as const
const ROLES = ['fn', 'sn', 'rn'] as const

// 公链站首页:Hero → 三支柱 → 设计原则 → 架构 → 实时 → 运行节点 → 生态
export function PaliumHome() {
  const t = useTranslations('home')
  const td = useTranslations('diagrams')
  const locale = useLocale()

  return (
    <div className="site-canvas overflow-hidden">
      <Hero />

      {/* ============ 三支柱 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palium.pillars.kicker')}
            title={t('palium.pillars.title')}
            subtitle={t('palium.pillars.subtitle')}
          />
          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <PillarCard
                key={p}
                index={`0${i + 1}`}
                title={t(`palium.pillars.${p}.title`)}
                description={t(`palium.pillars.${p}.description`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ 设计原则 ============ */}
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palium.principles.kicker')}
            title={t('palium.principles.title')}
            subtitle={t('palium.principles.subtitle')}
          />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRINCIPLES.map((p, i) => (
              <div key={p} className="vellum-card manuscript-card p-7">
                <div className="font-display text-2xl text-accent-purple/70 mb-3">{ROMAN[i]}</div>
                <h3 className="font-display font-semibold text-lg mb-2">{t(`palium.principles.${p}.title`)}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{t(`palium.principles.${p}.body`)}</p>
              </div>
            ))}
          </div>
          <p className="text-center font-display italic text-lg text-accent-purple mt-10">
            {t('palium.principles.oneOfMany')}
          </p>
        </div>
      </section>

      {/* ============ 架构 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('architecture.kicker')}
            title={t('architecture.title')}
            subtitle={t('architecture.subtitle')}
          />
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto mt-6">
            {LAYERS.map((l) => (
              <div key={l} className="sheet sheet-hover folio-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent-blue mb-2">{l.toUpperCase()}</div>
                <h3 className="font-display font-semibold text-base mb-2">{t(`architecture.${l}.name`)}</h3>
                <p className="text-text-secondary text-xs leading-relaxed">
                  {l === 'l4' ? t('palium.architecture.l4') : t(`architecture.${l}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 实时 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('live.kicker')} title={t('live.title')} subtitle={t('live.subtitle')} />
          <div className="max-w-4xl mx-auto">
            <NetworkStats />
            <div className="text-center mt-8">
              <Link href="/network" className="inline-block ink-button text-sm">
                {t('live.cta')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 运行节点 ============ */}
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('node.kicker')} title={t('palium.node.title')} subtitle={t('palium.node.subtitle')} />
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
            {ROLES.map((role) => (
              <div key={role} className="sheet sheet-hover folio-card p-6 flex flex-col">
                <div className="font-mono text-xs text-accent-cyan mb-3 uppercase tracking-widest">
                  {t(`node.${role}.tag`)}
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{t(`node.${role}.name`)}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{t(`node.${role}.description`)}</p>
                {role === 'sn' && (
                  <div className="mt-4 pt-4 border-t border-dashed border-[#d8c9a8]">
                    <ElsewhereNote href={crossSiteUrl(locale, '/services')}>{t('palium.node.storageElsewhere')}</ElsewhereNote>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/testnet" className="inline-block seal-button">
              {t('node.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 生态 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palium.ecosystem.kicker')}
            title={t('palium.ecosystem.title')}
            subtitle={t('palium.ecosystem.subtitle')}
          />
          <div className="grid md:grid-cols-3 gap-6">
            <EcosystemCard
              title={t('palium.ecosystem.mesh.title')}
              body={t('palium.ecosystem.mesh.body')}
              action={
                <ExtLink href={crossSiteUrl(locale)} className="inline-block ink-button text-sm">
                  {t('palium.ecosystem.mesh.cta')} ↗
                </ExtLink>
              }
            />
            <EcosystemCard
              title={t('palium.ecosystem.builders.title')}
              body={t('palium.ecosystem.builders.body')}
              action={
                <Link href="/docs" className="inline-block ink-button text-sm">
                  {t('palium.ecosystem.builders.cta')} →
                </Link>
              }
            />
            <EcosystemCard
              title={t('palium.ecosystem.governance.title')}
              body={t('palium.ecosystem.governance.body')}
              action={
                <Link href="/governance" className="inline-block ink-button text-sm">
                  {t('palium.ecosystem.governance.cta')} →
                </Link>
              }
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function EcosystemCard({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="sheet-stack">
      <div className="sheet sheet-hover folio-card p-7 h-full flex flex-col">
        <h3 className="font-display font-semibold text-xl mb-3">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">{body}</p>
        <div className="mt-auto">{action}</div>
      </div>
    </div>
  )
}
