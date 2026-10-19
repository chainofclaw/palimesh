import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// 双站变体各自独立的构建输出目录,两次 build 不互相覆盖(build 与 start 必须使用同一 NEXT_PUBLIC_SITE)
const variant = process.env.NEXT_PUBLIC_SITE === 'palimesh' ? 'palimesh' : 'palium'

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: `.next-${variant}`,
}

export default withNextIntl(nextConfig)
