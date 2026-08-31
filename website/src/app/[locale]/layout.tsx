import type { Metadata } from 'next'
import Image from 'next/image'
import { Cormorant_Garamond, JetBrains_Mono, Literata, Noto_Serif_SC } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletProvider } from '@/components/shared/WalletProvider'
import { WalletConnect } from '@/components/identity/WalletConnect'
import { MobileMenu } from '@/components/shared/MobileMenu'
import { Link } from '@/i18n/routing'
import { QuillInk } from '@/components/ink/InkArt'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const literata = Literata({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
})

const notoSerifSc = Noto_Serif_SC({
  weight: 'variable',
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://palimesh.io'),
  title: 'PaliMesh · The chain where state returns',
  description:
    'PaliMesh is a BFT blockchain purpose-built for AI agents: verifiable service (PoSe), persistent P2P storage, and portable on-chain identity. Chain ID 88780.',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages()
  const tFooter = await getTranslations('footer')
  const tCommon = await getTranslations('common')

  const navItems = [
    { href: '/story', label: tCommon('story') },
    { href: '/technology', label: tCommon('technology') },
    { href: '/network', label: tCommon('network') },
    { href: '/testnet', label: tCommon('testnet') },
    { href: '/services', label: tCommon('services') },
    { href: '/governance', label: tCommon('governance') },
    { href: '/docs', label: tCommon('docs') },
  ]

  return (
    <html lang={locale} className={`${cormorant.variable} ${literata.variable} ${notoSerifSc.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <WalletProvider>
          <div className="parchment-page min-h-screen flex flex-col">
            {/* Header */}
            <header className="manuscript-header sticky top-0 z-50">
              <div className="container mx-auto px-4 py-2.5 lg:py-3">
                <div className="scroll-banner flex items-center gap-3 lg:gap-4">
                  {/* Logo */}
                  <Link
                    href="/"
                    className="scroll-brand group flex shrink-0 items-center gap-2.5 leading-none"
                  >
                    <Image
                      src="/logo-icon.png"
                      alt="PaliMesh"
                      width={36}
                      height={36}
                      className="brand-signet shrink-0 transition-transform group-hover:-rotate-3"
                    />
                    <span className="font-display font-bold text-2xl tracking-tight text-text-primary group-hover:text-accent-blue transition-colors">
                      PaliMesh
                    </span>
                  </Link>

                  {/* Desktop Navigation */}
                  <nav className="scroll-nav hidden lg:flex items-center" aria-label="Primary navigation">
                    {navItems.map((item) => (
                      <NavLink key={item.href} href={item.href}>{item.label}</NavLink>
                    ))}
                  </nav>

                  {/* Right Section */}
                  <div className="scroll-tools flex shrink-0 items-center gap-1.5 lg:gap-2">
                    <div className="hidden xl:block">
                      <WalletConnect />
                    </div>
                    <LanguageSwitcher />
                    <MobileMenu items={[
                      { href: '/', label: tCommon('home') },
                      ...navItems,
                      { href: '/roadmap', label: tCommon('roadmap') },
                      { href: '/whitepaper', label: tCommon('whitepaper') },
                      { href: '/forum', label: tCommon('forum') },
                      { href: '/identity', label: tCommon('identity') },
                    ]} />
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="parchment-main flex-1">{children}</main>

            {/* Footer */}
            <footer className="codex-footer relative border-t border-line grain">
              <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  {/* Brand Section */}
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-2.5 mb-4">
                      <Image className="brand-signet" src="/logo-icon.png" alt="PaliMesh" width={36} height={36} />
                      <h3 className="font-display font-bold text-lg text-text-primary">PaliMesh</h3>
                      <QuillInk size={18} className="text-text-muted" />
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {tFooter('tagline')}
                    </p>
                  </div>

                  {/* Protocol */}
                  <div>
                    <h4 className="font-display font-semibold mb-4 text-text-primary">{tCommon('protocol')}</h4>
                    <ul className="space-y-2">
                      <FooterLink href="/story">{tCommon('story')}</FooterLink>
                      <FooterLink href="/technology">{tCommon('technology')}</FooterLink>
                      <FooterLink href="/network">{tCommon('network')}</FooterLink>
                      <FooterLink href="/roadmap">{tCommon('roadmap')}</FooterLink>
                      <FooterLink href="/whitepaper">{tCommon('whitepaper')}</FooterLink>
                      <FooterLink href="/security">{tCommon('security')}</FooterLink>
                    </ul>
                  </div>

                  {/* Build */}
                  <div>
                    <h4 className="font-display font-semibold mb-4 text-text-primary">{tCommon('build')}</h4>
                    <ul className="space-y-2">
                      <FooterLink href="/docs">{tCommon('docs')}</FooterLink>
                      <FooterLink href="/testnet">{tCommon('testnet')}</FooterLink>
                      <FooterLink href="https://explorer.palimesh.io" external>{tCommon('explorer')}</FooterLink>
                      <FooterLink href="https://faucet.palimesh.io" external>{tCommon('faucet')}</FooterLink>
                      <FooterLink href="https://github.com/palimesh/palimesh" external>{tCommon('github')}</FooterLink>
                    </ul>
                  </div>

                  {/* Community */}
                  <div>
                    <h4 className="font-display font-semibold mb-4 text-text-primary">{tCommon('community')}</h4>
                    <ul className="space-y-2">
                      <FooterLink href="/governance">{tCommon('governance')}</FooterLink>
                      <FooterLink href="/forum">{tCommon('forum')}</FooterLink>
                      <FooterLink href="/identity">{tCommon('identity')}</FooterLink>
                      <FooterLink href="https://x.com/parallelmeshes" external>X (Twitter)</FooterLink>
                    </ul>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-line pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-text-muted text-sm">
                      &copy; 2026 PaliMesh. {tFooter('allRightsReserved')}.
                    </p>
                    <div className="flex items-center gap-3 text-text-muted text-sm font-mono">
                      <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                      <span>{tFooter('testnetLabel')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
          </WalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

// Navigation Link Component
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="scroll-nav-link min-h-11 inline-flex items-center px-3 py-2 text-sm text-text-secondary transition-colors"
    >
      {children}
    </Link>
  )
}

// Footer Link Component
function FooterLink({
  href,
  children,
  external,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  const className =
    'text-text-secondary hover:text-accent-blue transition-colors text-sm'

  if (external) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      </li>
    )
  }

  return (
    <li>
      <Link href={href} className={className}>
        {children}
      </Link>
    </li>
  )
}
