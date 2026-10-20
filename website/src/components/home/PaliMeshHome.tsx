'use client'

import { useLocale, useTranslations } from 'next-intl'
import { crossSiteUrl } from '@/config/site'
import { AntiqueDivider, SectionHead } from '@/components/shared/Manuscript'
import { Link } from '@/i18n/routing'
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram'
import { AgentLayersDiagram } from '@/components/diagrams/AgentLayersDiagram'
import { InkDraw } from '@/components/fx/Effects'
import { Hero } from './Hero'
import { PillarCard, ExtLink, ElsewhereNote } from './HomeBits'
import { SettlementStats } from './SettlementStats'

const ROMAN = ['I', 'II', 'III'] as const
const PILLARS = ['storage', 'identity', 'memory'] as const
const BEATS = ['scribe', 'legible', 'chain'] as const
const AGENT_LAYERS = ['identity', 'memory', 'experience', 'reputation', 'assets', 'relationships'] as const
const PRODUCTS = ['soul', 'mem', 'node'] as const

interface ProofStat {
  v: string
  k: string
}

// 存储站首页:Hero → 三支柱 → 品牌故事 → 实证 → 架构 → 结算 → 运行节点 → 软件包
export function PaliMeshHome() {
  const t = useTranslations('home')
  const td = useTranslations('diagrams')
  const locale = useLocale()
  const proofStats = t.raw('palimesh.proof.stats') as ProofStat[]
  const tableCols = t.raw('palimesh.proof.table.cols') as string[]
  const tableRows = t.raw('palimesh.proof.table.rows') as string[][]

  return (
    <div className="site-canvas overflow-hidden">
      <Hero />

      {/* ============ 三支柱 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palimesh.pillars.kicker')}
            title={t('palimesh.pillars.title')}
            subtitle={t('palimesh.pillars.subtitle')}
          />
          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <PillarCard
                key={p}
                index={`0${i + 1}`}
                title={t(`palimesh.pillars.${p}.title`)}
                description={t(`palimesh.pillars.${p}.description`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ 品牌故事:羊皮纸法则 ============ */}
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('parchment.kicker')} title={t('parchment.title')} subtitle={t('parchment.subtitle')} />

          {/* 三拍叙事(第三拍取存储站专属文案) */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {BEATS.map((beat, i) => {
              const base = beat === 'chain' ? 'palimesh.parchment.chain' : `parchment.${beat}`
              return (
                <div key={beat} className="vellum-card manuscript-card p-7">
                  <div className="font-display text-2xl text-accent-purple/70 mb-3">{ROMAN[i]}</div>
                  <h3 className="font-display font-semibold text-lg mb-2">{t(`${base}.title`)}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{t(`${base}.body`)}</p>
                </div>
              )
            })}
          </div>

          {/* Agent 六层叠写:手稿式框图 */}
          <div className="max-w-2xl mx-auto mb-10">
            <InkDraw>
              <AgentLayersDiagram
                labels={{
                  aria: td('agent.aria'),
                  caption: td('agent.caption'),
                  layers: AGENT_LAYERS.map((l) => t(`parchment.layers.${l}`)),
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
              <Link href="/story" className="inline-block ink-button text-sm">
                {t('parchment.cta')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 实证 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palimesh.proof.kicker')}
            title={t('palimesh.proof.title')}
            subtitle={t('palimesh.proof.subtitle')}
          />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {proofStats.map((s) => (
              <div key={s.k} className="sheet sheet-hover folio-card p-7 text-center">
                <div className="display-xl font-display font-bold text-accent-purple mb-3">{s.v}</div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted leading-relaxed">{s.k}</p>
              </div>
            ))}
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="vellum-card manuscript-card p-6 md:p-8">
              <h3 className="font-display font-semibold text-lg mb-4 text-center">{t('palimesh.proof.table.title')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#d8c9a8]">
                      {tableCols.map((c) => (
                        <th key={c} className="text-left font-mono text-[11px] uppercase tracking-widest text-text-muted py-2 pr-4">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr key={row[0]} className="border-b border-dashed border-[#d8c9a8] last:border-b-0">
                        {row.map((cell, j) => (
                          <td
                            key={`${row[0]}-${j}`}
                            className={`py-3 pr-4 ${j === 0 ? 'font-display font-semibold text-text-primary' : 'font-mono text-text-secondary'}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link href="/whitepaper" className="inline-block ink-button text-sm">
                {t('palimesh.proof.cta')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 架构 ============ */}
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palimesh.architecture.kicker')}
            title={t('palimesh.architecture.title')}
            subtitle={t('palimesh.architecture.subtitle')}
          />
          <div className="max-w-3xl mx-auto">
            <InkDraw>
              <ArchitectureDiagram
                labels={{
                  aria: td('palimesh.arch.aria'),
                  caption: td('palimesh.arch.caption'),
                  l4: td('palimesh.arch.l4'), l4note: td('palimesh.arch.l4note'),
                  l3: td('palimesh.arch.l3'), l3note: td('palimesh.arch.l3note'),
                  l2: td('palimesh.arch.l2'), l2note: td('palimesh.arch.l2note'),
                  l1: td('palimesh.arch.l1'), l1note: td('palimesh.arch.l1note'),
                  txFlow: td('palimesh.arch.txFlow'), proofFlow: td('palimesh.arch.proofFlow'),
                }}
              />
            </InkDraw>
          </div>
        </div>
      </section>

      {/* ============ 结算 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palimesh.settlement.kicker')}
            title={t('palimesh.settlement.title')}
            subtitle={t('palimesh.settlement.subtitle')}
          />
          <div className="max-w-4xl mx-auto">
            <SettlementStats
              labels={{
                chain: t('palimesh.settlement.chain'),
                height: t('palimesh.settlement.height'),
                dht: t('palimesh.settlement.dht'),
                wire: t('palimesh.settlement.wire'),
              }}
            />
            <div className="text-center mt-8">
              <ExtLink href={crossSiteUrl(locale, '/network')} className="inline-block ink-button text-sm">
                {t('palimesh.settlement.cta')} ↗
              </ExtLink>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 运行节点(仅存储节点) ============ */}
      <AntiqueDivider />
      <section className="folio-band py-section">
        <div className="container mx-auto px-4">
          <SectionHead
            kicker={t('palimesh.node.kicker')}
            title={t('palimesh.node.title')}
            subtitle={t('palimesh.node.subtitle')}
          />
          <div className="max-w-md mx-auto mb-8">
            <div className="sheet-stack">
              <div className="sheet sheet-hover folio-card p-7">
                <div className="font-mono text-xs text-accent-cyan mb-3 uppercase tracking-widest">{t('node.sn.tag')}</div>
                <h3 className="font-display font-semibold text-xl mb-2">{t('node.sn.name')}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{t('node.sn.description')}</p>
              </div>
            </div>
          </div>
          <div className="mb-8">
            <ElsewhereNote href={crossSiteUrl(locale, '/testnet')}>{t('palimesh.node.validatorsElsewhere')}</ElsewhereNote>
          </div>
          <div className="text-center">
            <Link href="/services#node" className="inline-block seal-button">
              {t('palimesh.node.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 软件包 ============ */}
      <AntiqueDivider />
      <section className="chapter-section py-section">
        <div className="container mx-auto px-4">
          <SectionHead kicker={t('products.kicker')} title={t('products.title')} subtitle={t('products.subtitle')} />
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PRODUCTS.map((p) => (
              <div key={p} className="sheet sheet-hover folio-card p-6">
                <div className="font-mono text-xs text-text-muted mb-3">{t(`products.${p}.pkg`)}</div>
                <h3 className="font-display font-semibold text-xl mb-2">{t(`products.${p}.name`)}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{t(`products.${p}.description`)}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/services" className="inline-block ink-button text-sm">
              {t('products.cta')} →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
