import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { site, otherSite } from './config/site'

const intlMiddleware = createMiddleware(routing)

// 不属于本站的页面(如存储站上的 /testnet、链站上的 /story)308 跳到对方站,保留 locale 与路径
const EXCLUSIVE_RE =
  site.exclusiveRoutes.length > 0
    ? new RegExp(`^/(${routing.locales.join('|')})/(${site.exclusiveRoutes.join('|')})(/|$)`)
    : null

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (EXCLUSIVE_RE && EXCLUSIVE_RE.test(pathname)) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, otherSite.apex), 308)
  }
  return intlMiddleware(request)
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(zh|en|es|ja|ko)/:path*']
}
