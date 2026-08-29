import type { Metadata } from 'next'
import Image from 'next/image'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletProvider } from '@/components/shared/WalletProvider'
import { WalletConnect } from '@/components/identity/WalletConnect'
import { MobileMenu } from '@/components/shared/MobileMenu'
import { Link } from '@/i18n/routing'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Palimesh · The chain where state returns',
  description:
    'Palimesh is a BFT blockchain purpose-built for AI agents: verifiable service (PoSe), persistent P2P storage, and portable on-chain identity. Chain ID 88780.',
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
    { href: '/technology', label: tCommon('technology') },
    { href: '/network', label: tCommon('network') },
    { href: '/testnet', label: tCommon('testnet') },
    { href: '/services', label: tCommon('services') },
    { href: '/governance', label: tCommon('governance') },
    { href: '/docs', label: tCommon('docs') },
  ]

  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <WalletProvider>
          <div className="min-h-screen flex flex-col bg-bg-primary">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-lg border-b border-line">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo */}
                  <Link
                    href="/"
                    className="group flex items-center gap-2.5 leading-none"
                  >
                    <Image
                      src="/logo-icon.png"
                      alt="Palimesh"
                      width={36}
                      height={36}
                      className="shrink-0 transition-transform group-hover:-rotate-3"
                    />
                    <span className="font-display font-bold text-2xl tracking-tight text-text-primary group-hover:text-accent-blue transition-colors">
                      Palimesh
                    </span>
                  </Link>

                  {/* Desktop Navigation */}
                  <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => (
                      <NavLink key={item.href} href={item.href}>{item.label}</NavLink>
                    ))}
                  </nav>

                  {/* Right Section */}
                  <div className="flex items-center gap-3">
                    <div className="hidden md:block">
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
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="relative bg-bg-secondary border-t border-line grain">
              <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  {/* Brand Section */}
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-2.5 mb-4">
                      <Image src="/logo-icon.png" alt="Palimesh" width={36} height={36} />
                      <h3 className="font-display font-bold text-lg text-text-primary">Palimesh</h3>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {tFooter('tagline')}
                    </p>
                  </div>

                  {/* Protocol */}
                  <div>
                    <h4 className="font-display font-semibold mb-4 text-text-primary">{tCommon('protocol')}</h4>
                    <ul className="space-y-2">
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
                      &copy; 2026 Palimesh. {tFooter('allRightsReserved')}.
                    </p>
                    <div className="flex items-center gap-3 text-text-muted text-sm font-mono">
                      <span>chainId 88780</span>
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
      className="px-3.5 py-2 rounded-lg text-sm text-text-secondary hover:text-accent-blue hover:bg-accent-blue/5 transition-all"
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
