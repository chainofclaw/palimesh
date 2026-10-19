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
import { site, otherSite, crossSiteUrl, type FooterItem } from '@/config/site'
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
  metadataBase: new URL(site.apex),
  title: site.title,
  description: site.description,
  icons: { icon: site.favicon },
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.apex,
    siteName: site.brand,
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: site.brand }],
  },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description, images: [site.ogImage] },
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

  const navItems = site.navKeys.map((k) => ({ href: `/${k}`, label: tCommon(k) }))
  const mobileItems = [
    { href: '/', label: tCommon('home') },
    ...navItems,
    ...site.mobileExtra.map((k) => ({ href: `/${k}`, label: tCommon(k) })),
    { href: crossSiteUrl(locale), label: tCommon('crossSite', { other: otherSite.brand }), external: true },
  ]

  const footerHref = (item: FooterItem): { href: string; external: boolean; label: string } => {
    if (item.kind === 'route') return { href: `/${item.key}`, external: false, label: tCommon(item.labelKey ?? item.key) }
    if (item.kind === 'url') return { href: item.url, external: true, label: item.label ?? tCommon(item.key) }
    return { href: crossSiteUrl(locale, item.path), external: true, label: tCommon(item.key) }
  }

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
                      src={site.logo}
                      alt={site.brand}
                      width={42}
                      height={42}
                      className="brand-signet shrink-0 transition-transform group-hover:-rotate-3"
                    />
                    <span className="font-display font-bold text-2xl tracking-tight text-text-primary group-hover:text-accent-blue transition-colors">
                      {site.brand}
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
                    <MobileMenu items={mobileItems} />
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="parchment-main flex-1">{children}</main>

            {/* Footer */}
            <footer className="codex-footer relative border-t border-line grain">
              <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
                  {/* Brand Section */}
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-2.5 mb-4">
                      <Image className="brand-signet" src={site.logo} alt={site.brand} width={42} height={42} />
                      <h3 className="font-display font-bold text-lg text-text-primary">{site.brand}</h3>
                      <QuillInk size={18} className="text-text-muted" />
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {tFooter(`${site.variant}.tagline`)}
                    </p>
                  </div>

                  {site.footer.map((col) => (
                    <div key={col.titleKey}>
                      <h4 className="font-display font-semibold mb-4 text-text-primary">{tCommon(col.titleKey)}</h4>
                      <ul className="space-y-2">
                        {col.items.map((item) => {
                          const { href, external, label } = footerHref(item)
                          return (
                            <FooterLink key={`${col.titleKey}-${item.key}`} href={href} external={external}>
                              {label}
                            </FooterLink>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-line pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-text-muted text-sm">
                      &copy; 2026 {site.brand}. {tFooter('allRightsReserved')}.
                    </p>
                    <div className="flex items-center gap-4 text-text-muted text-sm font-mono">
                      <a href={crossSiteUrl(locale)} className="hover:text-accent-blue transition-colors">
                        {tCommon('crossSite', { other: otherSite.brand })} ↗
                      </a>
                      <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                      <span>{tFooter(`${site.variant}.testnetLabel`)}</span>
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
