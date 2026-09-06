'use client'

import { useLocale, useTranslations } from 'next-intl'
import { AntiqueDivider } from '@/components/shared/Manuscript'
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram'
import { PoseFlowDiagram } from '@/components/diagrams/PoseFlowDiagram'
import { Link } from '@/i18n/routing'
import { site, crossSiteUrl } from '@/config/site'

const PALIUM_LAYERS = [
  { key: 'layer1', color: 'blue' },
  { key: 'layer2', color: 'indigo' },
  { key: 'layer3', color: 'purple' },
  { key: 'layer4', color: 'pink' },
] as const

const POSE_STEPS = ['step1', 'step2', 'step3', 'step4', 'step5'] as const
const COMPARISON_ROWS = [
  { key: 'barrier', better: true },
  { key: 'centralization', better: true },
  { key: 'energy', better: false },
  { key: 'reward', better: true },
  { key: 'decentralization', better: true },
  { key: 'automation', better: true },
] as const
const TECH_STACK_GROUPS = ['execution', 'consensus', 'pose', 'storage'] as const

export default function TechnologyPage() {
  const t = useTranslations('technology')

  return (
    <div className="relative">
      {/* Header - 羊皮纸 hero */}
      <section className="manuscript-hero manuscript-hero--compact relative">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="kicker mb-4">TECHNICAL_ARCHITECTURE</p>
            <h1 className="display-xl font-display font-bold mb-5">
              <span className="ink-underline">{t(`${site.variant}.title`)}</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">{t(`${site.variant}.subtitle`)}</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {site.variant === 'palium' ? <ChainBody /> : <StorageBody />}
      </div>
    </div>
  )
}

// ─── Palium(公链站)────────────────────────────────────────────

function ChainBody() {
  const t = useTranslations('technology')
  const tp = useTranslations('technology.palium')
  const td = useTranslations('diagrams')
  const locale = useLocale()

  return (
    <>
      {/* Architecture Layers */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{tp('layersTitle')}</SectionTitle>
        <ArchitectureDiagram
          labels={{
            aria: td('arch.aria'), caption: td('arch.caption'),
            l4: td('arch.l4'), l4note: td('arch.l4note'),
            l3: td('arch.l3'), l3note: td('arch.l3note'),
            l2: td('arch.l2'), l2note: td('arch.l2note'),
            l1: td('arch.l1'), l1note: td('arch.l1note'),
            txFlow: td('arch.txFlow'), proofFlow: td('arch.proofFlow'),
          }}
        />
        <div className="space-y-6">
          {PALIUM_LAYERS.map(({ key, color }) => (
            <LayerCard
              key={key}
              number={tp(`${key}.number`)}
              title={tp(`${key}.title`)}
              subtitle={tp(`${key}.subtitle`)}
              color={color}
              features={tp.raw(`${key}.features`) as string[]}
              note={tp(`${key}.note`)}
            />
          ))}
        </div>
      </section>

      {/* PoSe Protocol Deep Dive */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{t('poseProtocol.title')}</SectionTitle>

        <PoseFlowDiagram
          labels={{
            aria: td('pose.aria'), caption: td('pose.caption'),
            challenger: td('pose.challenger'), node: td('pose.node'),
            witness: td('pose.witness'), contract: td('pose.contract'),
            s1: td('pose.s1'), s2: td('pose.s2'), s3: td('pose.s3'), s4: td('pose.s4'),
          }}
        />

        <div className="space-y-8">
          {/* Challenge Flow */}
          <div className="relative bg-bg-elevated p-8 rounded-xl border border-accent-blue/30 hover:border-accent-blue/50 transition-all duration-500 fade-in-delay-1">
            <h3 className="text-2xl font-display font-semibold mb-6 text-accent-blue">{t('poseProtocol.challengeFlow')}</h3>
            <div className="space-y-4">
              {POSE_STEPS.map((s, i) => (
                <FlowStep
                  key={s}
                  step={String(i + 1)}
                  title={t(`poseProtocol.${s}.title`)}
                  description={t(`poseProtocol.${s}.description`)}
                  details={t.raw(`poseProtocol.${s}.details`) as string[]}
                />
              ))}
            </div>
          </div>

          {/* Scoring Formulas */}
          <div className="fade-in-delay-2">
            <h3 className="text-2xl font-display font-semibold mb-6 text-text-primary">{t('poseProtocol.scoringTitle')}</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <FormulaCard
                title={t('poseProtocol.uptimeScore.title')}
                formula={t('poseProtocol.uptimeScore.formula')}
                variables={t.raw('poseProtocol.uptimeScore.variables') as string[]}
                rationale={t('poseProtocol.uptimeScore.rationale')}
              />
              <FormulaCard
                title={t('poseProtocol.storageScore.title')}
                formula={t('poseProtocol.storageScore.formula')}
                variables={t.raw('poseProtocol.storageScore.variables') as string[]}
                rationale={t('poseProtocol.storageScore.rationale')}
              />
            </div>
          </div>

          {/* Anti-Sybil */}
          <AntiSybilCard title={t('poseProtocol.antiSybilTitle')} items={t.raw('poseProtocol.antiSybilItems') as string[]} />
        </div>
      </section>

      {/* Rollup Evolution */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle subtitle={tp('rollup.subtitle')}>{tp('rollup.title')}</SectionTitle>
        <div className="vellum-card p-8 fade-in-up">
          <ul className="grid md:grid-cols-2 gap-4 mb-6">
            {(tp.raw('rollup.items') as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-text-secondary font-body">
                <span className="text-accent-cyan mt-1 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="relative bg-bg-secondary/50 p-4 rounded-lg border-l-4 border-accent-purple/50">
            <p className="text-sm text-text-muted italic font-body">{tp('rollup.note')}</p>
          </div>
        </div>
      </section>

      {/* Protocol Parameters */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{tp('params.title')}</SectionTitle>
        <div className="grid md:grid-cols-3 gap-6">
          {(tp.raw('params.items') as { k: string; v: string; d: string }[]).map((p) => (
            <MetricCard key={p.k} title={p.k} value={p.v} description={p.d} />
          ))}
        </div>
      </section>

      {/* Comparison */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{t('comparison.title')}</SectionTitle>
        <div className="overflow-x-auto fade-in-delay-1">
          <table className="min-w-full bg-bg-elevated border border-text-muted/20 rounded-lg overflow-hidden">
            <thead className="bg-bg-secondary/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">{t('comparison.dimensions.barrier')}</th>
                <th className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">PoW</th>
                <th className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">PoS</th>
                <th className="px-6 py-4 text-left text-sm font-display font-semibold text-accent-cyan border-l-2 border-accent-cyan/30">{t('comparison.brandHeader')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-muted/10">
              {COMPARISON_ROWS.map(({ key, better }) => (
                <ComparisonRow
                  key={key}
                  dimension={t(`comparison.dimensions.${key}`)}
                  pow={t(`comparison.pow.${key}`)}
                  pos={t(`comparison.pos.${key}`)}
                  coc={t(`comparison.coc.${key}`)}
                  paliBetter={better}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-20">
        <SectionTitle>{t('techStack.title')}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-6">
          {TECH_STACK_GROUPS.map((g) => (
            <TechStackCard key={g} title={t(`techStack.${g}.title`)} items={t.raw(`techStack.${g}.items`) as string[]} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-8">
        <div className="sheet-stack">
          <div className="sheet p-8 text-center">
            <div className="flex flex-wrap justify-center gap-3 mb-5">
              <Link href="/whitepaper" className="seal-button text-sm">{tp('ctaWhitepaper')}</Link>
              <Link href="/testnet" className="ink-button text-sm">{tp('ctaTestnet')} →</Link>
            </div>
            <a
              href={crossSiteUrl(locale, '/technology')}
              className="text-sm text-text-muted hover:text-accent-blue transition-colors"
            >
              {tp('storageElsewhere')} ↗
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

// ─── PaliMesh(存储站)──────────────────────────────────────────

function StorageBody() {
  const tm = useTranslations('technology.palimesh')
  const td = useTranslations('diagrams.palimesh')
  const layers = tm.raw('layers') as { name: string; note: string }[]
  const algorithms = tm.raw('algorithms.items') as { name: string; body: string }[]
  const erasureCols = tm.raw('erasure.cols') as string[]
  const erasureRows = tm.raw('erasure.rows') as string[][]

  return (
    <>
      {/* Seven Layers */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{tm('layersTitle')}</SectionTitle>
        <ArchitectureDiagram
          labels={{
            aria: td('arch.aria'), caption: td('arch.caption'),
            l4: td('arch.l4'), l4note: td('arch.l4note'),
            l3: td('arch.l3'), l3note: td('arch.l3note'),
            l2: td('arch.l2'), l2note: td('arch.l2note'),
            l1: td('arch.l1'), l1note: td('arch.l1note'),
            txFlow: td('arch.txFlow'), proofFlow: td('arch.proofFlow'),
          }}
        />
        <div className="space-y-3">
          {layers.map((layer, i) => (
            <StackLayer key={layer.name} name={layer.name} note={layer.note} depth={i} total={layers.length} />
          ))}
        </div>
      </section>

      {/* Core Algorithms */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{tm('algorithms.title')}</SectionTitle>
        <div className="grid md:grid-cols-2 gap-6">
          {algorithms.map((a) => (
            <div key={a.name} className="group bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-cyan/50 transition-all duration-500 fade-in-up">
              <h3 className="font-mono text-lg font-bold text-accent-cyan mb-3 group-hover:text-accent-blue transition-colors">{a.name}</h3>
              <p className="text-text-secondary font-body leading-relaxed">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Erasure Coding Economics */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle subtitle={tm('erasure.subtitle')}>{tm('erasure.title')}</SectionTitle>
        <div className="overflow-x-auto fade-in-delay-1">
          <table className="min-w-full bg-bg-elevated border border-text-muted/20 rounded-lg overflow-hidden">
            <thead className="bg-bg-secondary/50">
              <tr>
                {erasureCols.map((c) => (
                  <th key={c} className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-text-muted/10">
              {erasureRows.map((row, i) => (
                <tr key={i} className={`transition-colors ${i === 0 ? 'text-text-muted' : 'hover:bg-bg-secondary/30'}`}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-6 py-4 ${j === 0 ? 'font-mono font-semibold text-text-primary' : 'font-body text-text-secondary'} ${j === 1 && i > 0 ? 'text-accent-cyan font-semibold' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* PoSe Storage Challenge */}
      <AntiqueDivider />
      <section className="mb-20">
        <SectionTitle>{tm('poseStorage.title')}</SectionTitle>
        <div className="vellum-card p-8 fade-in-up">
          <p className="dropcap text-text-secondary font-body leading-relaxed mb-6">{tm('poseStorage.body')}</p>
          <BulletList items={tm.raw('poseStorage.items') as string[]} />
        </div>
      </section>

      {/* Identity & Memory / Recovery */}
      <AntiqueDivider />
      <section className="mb-20">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-purple/50 transition-all duration-500 fade-in-up">
            <h3 className="text-xl font-display font-bold text-text-primary mb-4">{tm('identityMemory.title')}</h3>
            <BulletList items={tm.raw('identityMemory.items') as string[]} />
          </div>
          <div className="bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-cyan/50 transition-all duration-500 fade-in-up">
            <h3 className="text-xl font-display font-bold text-text-primary mb-4">{tm('recovery.title')}</h3>
            <BulletList items={tm.raw('recovery.items') as string[]} />
          </div>
        </div>
      </section>

      {/* Next: Storage Market */}
      <AntiqueDivider />
      <section id="next" className="mb-20 scroll-mt-24">
        <SectionTitle>{tm('next.title')}</SectionTitle>
        <div className="vellum-card p-8 max-w-3xl mx-auto fade-in-up">
          <p className="text-text-secondary font-body leading-relaxed">{tm('next.body')}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-8">
        <div className="sheet-stack">
          <div className="sheet p-8 text-center">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/whitepaper" className="seal-button text-sm">{tm('ctaPaper')}</Link>
              <Link href="/services" className="ink-button text-sm">{tm('ctaServices')} →</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

// ─── 共用小件 ──────────────────────────────────────────────────

function SectionTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12 fade-in-up">
      <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
        <span>{children}</span>
      </h2>
      <div className="w-16 h-px bg-line mx-auto mt-4 rounded-full" />
      {subtitle && <p className="text-text-secondary mt-4 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-text-secondary font-body">
          <span className="text-accent-cyan mt-1">▸</span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

// 七层堆叠:自上而下 L7→L1,逐层加宽,底部结算层高亮
function StackLayer({ name, note, depth, total }: { name: string; note: string; depth: number; total: number }) {
  const isBase = depth === total - 1
  const inset = (total - 1 - depth) * 2.5
  return (
    <div
      className={`rounded-lg border p-4 md:px-6 transition-all duration-500 fade-in-up flex flex-col md:flex-row md:items-center gap-1 md:gap-6 ${
        isBase
          ? 'bg-accent-cyan/10 border-accent-cyan shadow-glow-sm'
          : 'bg-bg-elevated border-text-muted/10 hover:border-accent-cyan/40'
      }`}
      style={{ marginLeft: `${inset}%`, marginRight: `${inset}%`, animationDelay: `${depth * 0.06}s` }}
    >
      <span className={`font-mono font-semibold shrink-0 md:w-40 ${isBase ? 'text-accent-cyan' : 'text-text-primary'}`}>{name}</span>
      <span className="text-sm text-text-secondary font-body leading-relaxed">{note}</span>
    </div>
  )
}

function AntiSybilCard({ title, items }: { title: string; items: string[] }) {
  const half = Math.ceil(items.length / 2)
  const columns = [items.slice(0, half), items.slice(half)]
  return (
    <div className="relative bg-bg-elevated p-6 rounded-lg border border-accent-cyan/30 hover:border-accent-cyan/50 transition-all duration-500 fade-in-delay-3">
      <h3 className="text-xl font-display font-semibold mb-4 text-accent-cyan">{title}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {columns.map((col, c) => (
          <ul key={c} className="space-y-2 text-text-secondary font-body">
            {col.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-accent-cyan mt-1">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

function LayerCard({
  number,
  title,
  subtitle,
  color,
  features,
  note,
}: {
  number: string
  title: string
  subtitle: string
  color: string
  features: string[]
  note: string
}) {
  const colorMap: Record<string, { gradient: string; accent: string; border: string }> = {
    blue: { gradient: 'from-accent-blue to-accent-cyan', accent: 'text-accent-blue', border: 'border-accent-blue/50' },
    indigo: { gradient: 'from-accent-cyan to-accent-blue', accent: 'text-accent-cyan', border: 'border-accent-cyan/50' },
    purple: { gradient: 'from-accent-purple to-accent-blue', accent: 'text-accent-purple', border: 'border-accent-purple/50' },
    pink: { gradient: 'from-pink-500 to-accent-purple', accent: 'text-pink-400', border: 'border-pink-500/50' },
  }

  const colors = colorMap[color]

  return (
    <div className="group bg-bg-elevated rounded-xl border border-text-muted/10 hover:border-accent-cyan/50 overflow-hidden transition-all duration-500 fade-in-up">
      <div className={`relative bg-gradient-to-r ${colors.gradient} p-6 overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 data-flow" />
        <div className="flex items-center gap-4 mb-2 relative z-10">
          <div className="bg-white/10 rounded-lg w-14 h-14 flex items-center justify-center font-display font-bold text-2xl text-white border border-white/20 group-hover:scale-110 transition-transform duration-500">
            {number}
          </div>
          <div>
            <h3 className="text-2xl font-display font-bold text-white">{title}</h3>
            <p className="text-sm text-white/80 font-body">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <ul className="space-y-3 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-text-secondary font-body">
              <span className="text-accent-cyan mt-1 font-bold">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className={`relative bg-bg-secondary/50 p-4 rounded-lg border-l-4 ${colors.border}`}>
          <p className="text-sm text-text-muted italic font-body">{note}</p>
        </div>
      </div>
    </div>
  )
}

function FlowStep({
  step,
  title,
  description,
  details,
}: {
  step: string
  title: string
  description: string
  details: string[]
}) {
  return (
    <div className="flex gap-4 group">
      <div className="bg-gradient-to-br from-accent-blue to-accent-cyan text-white rounded-lg w-12 h-12 flex items-center justify-center font-display font-bold flex-shrink-0 group-hover:shadow-glow-md transition-all duration-500 group-hover:scale-110">
        {step}
      </div>
      <div className="flex-1">
        <h4 className="font-display font-bold text-text-primary mb-2 group-hover:text-accent-cyan transition-colors">{title}</h4>
        <p className="text-text-secondary mb-3 font-body">{description}</p>
        <ul className="space-y-2">
          {details.map((d, i) => (
            <li key={i} className="text-sm text-text-muted font-display bg-bg-secondary/50 p-3 rounded-lg border border-text-muted/10 hover:border-accent-blue/30 transition-all">
              <span className="text-accent-blue">▸</span> {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FormulaCard({
  title,
  formula,
  variables,
  rationale,
}: {
  title: string
  formula: string
  variables: string[]
  rationale: string
}) {
  return (
    <div className="group bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-purple/50 transition-all duration-500">
      <h4 className="font-display font-bold text-text-primary mb-4 group-hover:text-accent-purple transition-colors">{title}</h4>
      <div className="bg-accent-blue/10 p-4 rounded-lg mb-4 font-display text-sm text-accent-blue border border-accent-blue/20 overflow-x-auto">
        {formula}
      </div>
      <div className="space-y-2 mb-4">
        {variables.map((v, i) => (
          <p key={i} className="text-sm text-text-secondary font-body flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">•</span>
            <span>{v}</span>
          </p>
        ))}
      </div>
      <div className="relative bg-accent-cyan/5 p-4 rounded-lg border-l-4 border-accent-cyan/50">
        <p className="text-sm text-text-muted italic font-body">{rationale}</p>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="group relative bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-cyan/50 transition-all duration-500 text-center fade-in-up">
      <div className="absolute inset-0 bg-accent-blue opacity-0 group-hover:opacity-5 rounded-lg transition-opacity duration-500" />
      <h4 className="text-xs font-display font-medium text-text-muted uppercase tracking-wider mb-3">{title}</h4>
      <p className="text-3xl md:text-4xl font-display font-bold mb-3 transition-all">
        {value}
      </p>
      <p className="text-sm text-text-secondary font-body">{description}</p>
    </div>
  )
}

function ComparisonRow({
  dimension,
  pow,
  pos,
  coc,
  paliBetter = false,
}: {
  dimension: string
  pow: string
  pos: string
  coc: string
  paliBetter?: boolean
}) {
  return (
    <tr className="hover:bg-bg-secondary/30 transition-colors">
      <td className="px-6 py-4 font-display font-semibold text-text-primary">{dimension}</td>
      <td className="px-6 py-4 text-text-secondary font-body">{pow}</td>
      <td className="px-6 py-4 text-text-secondary font-body">{pos}</td>
      <td className={`px-6 py-4 border-l-2 border-accent-cyan/30 font-body ${
        paliBetter
          ? 'bg-accent-cyan/10 font-semibold text-accent-cyan'
          : 'text-text-secondary'
      }`}>
        {paliBetter && <span className="text-accent-cyan mr-2">✓</span>}
        {coc}
      </td>
    </tr>
  )
}

function TechStackCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="group relative bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-blue/50 transition-all duration-500 fade-in-up">
      <div className="absolute inset-0 bg-accent-blue opacity-0 group-hover:opacity-5 rounded-lg transition-opacity duration-500" />
      <h3 className="text-lg font-display font-bold mb-4 text-text-primary group-hover:text-accent-blue transition-colors">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-text-secondary font-body group/item hover:text-text-primary transition-colors">
            <span className="text-accent-cyan group-hover/item:text-accent-blue transition-colors">▸</span>
            <span className="font-display text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
