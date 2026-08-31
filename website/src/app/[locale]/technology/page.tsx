'use client'

import { useTranslations } from 'next-intl'
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram'
import { PoseFlowDiagram } from '@/components/diagrams/PoseFlowDiagram'

export default function TechnologyPage() {
  const t = useTranslations('technology')
  const td = useTranslations('diagrams')

  return (
    <div className="relative">
      {/* Header - 羊皮纸 hero */}
      <section className="vellum deckle-bottom">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="kicker mb-4">TECHNICAL_ARCHITECTURE</p>
            <h1 className="display-xl font-display font-bold mb-5">
              <span className="ink-underline">{t('title')}</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Architecture Layers */}
        <section className="mb-20">
          <div className="text-center mb-12 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span>{t('layersTitle')}</span>
            </h2>
            <div className="w-16 h-px bg-line mx-auto mt-4 rounded-full" />
          </div>
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
            <LayerCard
              number={t('layer1.number')}
              title={t('layer1.title')}
              subtitle={t('layer1.subtitle')}
              color="blue"
              features={t.raw('layer1.features') as string[]}
              note={t('layer1.note')}
            />

            <LayerCard
              number={t('layer2.number')}
              title={t('layer2.title')}
              subtitle={t('layer2.subtitle')}
              color="indigo"
              features={t.raw('layer2.features') as string[]}
              note={t('layer2.note')}
            />

            <LayerCard
              number={t('layer3.number')}
              title={t('layer3.title')}
              subtitle={t('layer3.subtitle')}
              color="purple"
              features={t.raw('layer3.features') as string[]}
              note={t('layer3.note')}
            />

            <LayerCard
              number={t('layer4.number')}
              title={t('layer4.title')}
              subtitle={t('layer4.subtitle')}
              color="pink"
              features={t.raw('layer4.features') as string[]}
              note={t('layer4.note')}
            />
          </div>
        </section>

        {/* PoSe Protocol Deep Dive */}
        <section className="mb-20">
          <div className="text-center mb-12 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span>{t('poseProtocol.title')}</span>
            </h2>
            <div className="w-16 h-px bg-line mx-auto mt-4 rounded-full" />
          </div>

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
                <FlowStep
                  step="1"
                  title={t('poseProtocol.step1.title')}
                  description={t('poseProtocol.step1.description')}
                  details={t.raw('poseProtocol.step1.details') as string[]}
                />
                <FlowStep
                  step="2"
                  title={t('poseProtocol.step2.title')}
                  description={t('poseProtocol.step2.description')}
                  details={t.raw('poseProtocol.step2.details') as string[]}
                />
                <FlowStep
                  step="3"
                  title={t('poseProtocol.step3.title')}
                  description={t('poseProtocol.step3.description')}
                  details={t.raw('poseProtocol.step3.details') as string[]}
                />
                <FlowStep
                  step="4"
                  title={t('poseProtocol.step4.title')}
                  description={t('poseProtocol.step4.description')}
                  details={t.raw('poseProtocol.step4.details') as string[]}
                />
                <FlowStep
                  step="5"
                  title={t('poseProtocol.step5.title')}
                  description={t('poseProtocol.step5.description')}
                  details={t.raw('poseProtocol.step5.details') as string[]}
                />
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
            <div className="relative bg-bg-elevated p-6 rounded-lg border border-accent-cyan/30 hover:border-accent-cyan/50 transition-all duration-500 fade-in-delay-3">
              <h3 className="text-xl font-display font-semibold mb-4 text-accent-cyan">{t('poseProtocol.antiSybilTitle')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-text-secondary font-body">
                  {(t.raw('poseProtocol.antiSybilItems') as string[]).slice(0, 4).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent-cyan mt-1">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2 text-text-secondary font-body">
                  {(t.raw('poseProtocol.antiSybilItems') as string[]).slice(4).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent-cyan mt-1">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Metrics */}
        <section className="mb-20">
          <div className="text-center mb-12 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span>{t('performance.title')}</span>
            </h2>
            <div className="w-16 h-px bg-line mx-auto mt-4 rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <MetricCard
              title={t('performance.blockTime.title')}
              value={t('performance.blockTime.value')}
              description={t('performance.blockTime.description')}
            />
            <MetricCard
              title={t('performance.finality.title')}
              value={t('performance.finality.value')}
              description={t('performance.finality.description')}
            />
            <MetricCard
              title={t('performance.storage.title')}
              value={t('performance.storage.value')}
              description={t('performance.storage.description')}
            />
            <MetricCard
              title={t('performance.bandwidth.title')}
              value={t('performance.bandwidth.value')}
              description={t('performance.bandwidth.description')}
            />
            <MetricCard
              title={t('performance.frequency.title')}
              value={t('performance.frequency.value')}
              description={t('performance.frequency.description')}
            />
            <MetricCard
              title={t('performance.threshold.title')}
              value={t('performance.threshold.value')}
              description={t('performance.threshold.description')}
            />
          </div>
        </section>

        {/* Comparison */}
        <section className="mb-20">
          <div className="text-center mb-12 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span>{t('comparison.title')}</span>
            </h2>
            <div className="w-16 h-px bg-line mx-auto mt-4 rounded-full" />
          </div>
          <div className="overflow-x-auto fade-in-delay-1">
            <table className="min-w-full bg-bg-elevated border border-text-muted/20 rounded-lg overflow-hidden">
              <thead className="bg-bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">{t('comparison.dimensions.barrier')}</th>
                  <th className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">PoW</th>
                  <th className="px-6 py-4 text-left text-sm font-display font-semibold text-text-primary">PoS</th>
                  <th className="px-6 py-4 text-left text-sm font-display font-semibold text-accent-cyan border-l-2 border-accent-cyan/30">PaliMesh (PoSe)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-muted/10">
                <ComparisonRow
                  dimension={t('comparison.dimensions.barrier')}
                  pow={t('comparison.pow.barrier')}
                  pos={t('comparison.pos.barrier')}
                  coc={t('comparison.coc.barrier')}
                  paliBetter
                />
                <ComparisonRow
                  dimension={t('comparison.dimensions.centralization')}
                  pow={t('comparison.pow.centralization')}
                  pos={t('comparison.pos.centralization')}
                  coc={t('comparison.coc.centralization')}
                  paliBetter
                />
                <ComparisonRow
                  dimension={t('comparison.dimensions.energy')}
                  pow={t('comparison.pow.energy')}
                  pos={t('comparison.pos.energy')}
                  coc={t('comparison.coc.energy')}
                />
                <ComparisonRow
                  dimension={t('comparison.dimensions.reward')}
                  pow={t('comparison.pow.reward')}
                  pos={t('comparison.pos.reward')}
                  coc={t('comparison.coc.reward')}
                  paliBetter
                />
                <ComparisonRow
                  dimension={t('comparison.dimensions.decentralization')}
                  pow={t('comparison.pow.decentralization')}
                  pos={t('comparison.pos.decentralization')}
                  coc={t('comparison.coc.decentralization')}
                  paliBetter
                />
                <ComparisonRow
                  dimension={t('comparison.dimensions.automation')}
                  pow={t('comparison.pow.automation')}
                  pos={t('comparison.pos.automation')}
                  coc={t('comparison.coc.automation')}
                  paliBetter
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="pb-8">
          <div className="text-center mb-12 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span>{t('techStack.title')}</span>
            </h2>
            <div className="w-16 h-px bg-line mx-auto mt-4 rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <TechStackCard
              title={t('techStack.execution.title')}
              items={t.raw('techStack.execution.items') as string[]}
            />
            <TechStackCard
              title={t('techStack.consensus.title')}
              items={t.raw('techStack.consensus.items') as string[]}
            />
            <TechStackCard
              title={t('techStack.pose.title')}
              items={t.raw('techStack.pose.items') as string[]}
            />
            <TechStackCard
              title={t('techStack.storage.title')}
              items={t.raw('techStack.storage.items') as string[]}
            />
          </div>
        </section>
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
    <div className="group bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-cyan/50 transition-all duration-500 text-center fade-in-up">
      <div className="absolute inset-0 bg-accent-blue opacity-0 group-hover:opacity-5 rounded-lg transition-opacity duration-500" />
      <h4 className="text-xs font-display font-medium text-text-muted uppercase tracking-wider mb-3">{title}</h4>
      <p className="text-4xl font-display font-bold mb-3 transition-all">
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
    <div className="group bg-bg-elevated p-6 rounded-lg border border-text-muted/10 hover:border-accent-blue/50 transition-all duration-500 fade-in-up">
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
