'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function TestnetPage() {
  const t = useTranslations('testnet')

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="vellum deckle-bottom">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="kicker mb-4">CANARY_TESTNET_88780_LIVE</p>
            <h1 className="display-xl font-display font-bold mb-5">
              <span className="ink-underline">{t('title')}</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              {t('subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-delay-2">
              <Link
                href="/docs"
                className="px-8 py-3 rounded-lg bg-gradient-cyber text-white font-display font-semibold hover:shadow-glow-md transition-all hover:scale-105"
              >
                {t('joinNow')}
              </Link>
              <a
                href="https://faucet.palimesh.io"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg border border-accent-cyan/30 text-accent-cyan font-display font-semibold hover:bg-accent-cyan/10 transition-all"
              >
                {t('getFaucet')}
              </a>
            </div>
          </div>
        </div>

      </section>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Network Info Cards */}
        <section className="mb-16">
          <div className="text-center mb-12 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">{t('networkInfo')}</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-cyber mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard label={t('chainId')} value="88780 (0x15acc)" />
            <InfoCard label={t('rpcEndpoint')} value="https://rpc.palimesh.io" mono />
            <InfoCard label={t('wsEndpoint')} value="wss://rpc.palimesh.io/ws" mono />
            <InfoCard label={t('blockTime')} value="~2.1s" />
            <InfoCard label={t('consensus')} value="BFT + PoSe" />
            <InfoCard label={t('tokenSymbol')} value="PALI" />
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-16">
          <div className="text-center mb-6 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">{t('quickStart')}</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-cyber mx-auto mt-4 rounded-full" />
          </div>

          {/* Recommended deploy via palimesh-node skill */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 backdrop-blur-sm px-5 py-4 flex items-start gap-3">
              <span className="font-display text-xs text-accent-cyan tracking-wider px-2 py-0.5 rounded border border-accent-cyan/40 bg-accent-cyan/10 shrink-0 whitespace-nowrap mt-0.5">
                {t('paliNodeBadge')}
              </span>
              <p className="text-text-secondary text-sm font-body leading-relaxed">
                {t('paliNodeNote')}{' '}
                <Link href="/services" className="text-accent-cyan hover:text-accent-cyan/80 underline underline-offset-2">
                  {t('paliNodeNoteLink')}
                </Link>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              step="01"
              title={t('step1.title')}
              description={t('step1.description')}
              color="cyan"
            />
            <StepCard
              step="02"
              title={t('step2.title')}
              description={t('step2.description')}
              color="purple"
            />
            <StepCard
              step="03"
              title={t('step3.title')}
              description={t('step3.description')}
              color="blue"
            />
          </div>
        </section>

        {/* Connect Wallet */}
        <section className="mb-16">
          <div className="bg-bg-secondary/50 backdrop-blur-lg rounded-2xl border border-text-muted/10 p-8 md:p-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-display font-bold mb-4">
                <span className="gradient-text">{t('connectWallet')}</span>
              </h2>
              <p className="text-text-secondary font-body mb-8">{t('connectDescription')}</p>

              <div className="bg-bg-primary/50 rounded-lg p-6 text-left font-mono text-sm text-text-secondary space-y-2">
                <p><span className="text-accent-cyan">Network Name:</span> Palimesh Canary 88780</p>
                <p><span className="text-accent-cyan">RPC URL:</span> https://rpc.palimesh.io</p>
                <p><span className="text-accent-cyan">Chain ID:</span> 88780</p>
                <p><span className="text-accent-cyan">Currency Symbol:</span> PALI</p>
                <p><span className="text-accent-cyan">Explorer:</span> https://explorer.palimesh.io</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <QuickLink
              title={t('links.explorer')}
              href="https://explorer.palimesh.io"
              external
              icon="search"
            />
            <QuickLink
              title={t('links.faucet')}
              href="https://faucet.palimesh.io"
              external
              icon="droplet"
            />
            <QuickLink
              title={t('links.docs')}
              href="/docs"
              icon="book"
            />
            <QuickLink
              title={t('links.github')}
              href="https://github.com/palimesh/palimesh"
              external
              icon="code"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-bg-secondary/50 backdrop-blur-lg rounded-xl border border-text-muted/10 p-6 hover:border-accent-cyan/30 transition-colors">
      <div className="text-xs font-display text-text-muted uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-xl font-bold text-text-primary ${mono ? 'font-mono text-base' : 'font-display'}`}>
        {value}
      </div>
    </div>
  )
}

function StepCard({ step, title, description, color }: { step: string; title: string; description: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'from-accent-cyan/20 to-accent-cyan/5 border-accent-cyan/30',
    purple: 'from-accent-purple/20 to-accent-purple/5 border-accent-purple/30',
    blue: 'from-accent-blue/20 to-accent-blue/5 border-accent-blue/30',
  }

  return (
    <div className={`bg-gradient-to-b ${colorMap[color] ?? colorMap.cyan} backdrop-blur-lg rounded-xl border p-6`}>
      <div className="text-3xl font-display font-bold text-text-muted/30 mb-4">{step}</div>
      <h3 className="text-lg font-display font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm font-body">{description}</p>
    </div>
  )
}

function QuickLink({ title, href, external, icon }: { title: string; href: string; external?: boolean; icon: string }) {
  const icons: Record<string, string> = {
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    droplet: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  }

  const content = (
    <div className="bg-bg-secondary/50 backdrop-blur-lg rounded-xl border border-text-muted/10 p-6 hover:border-accent-cyan/30 transition-all hover:scale-105 group cursor-pointer">
      <svg className="w-6 h-6 text-accent-cyan mb-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon] ?? icons.code} />
      </svg>
      <h3 className="font-display font-bold text-text-primary group-hover:text-accent-cyan transition-colors">{title}</h3>
    </div>
  )

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>
  }
  return <Link href={href}>{content}</Link>
}
