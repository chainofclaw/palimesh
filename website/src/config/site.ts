// 双站变体单一真相源:NEXT_PUBLIC_SITE=palium(公链) | palimesh(存储)
// 同一 codebase 两次 build(distDir 按变体分离),导航/品牌/域名/首页/经济/footer/路由归属按变体区分。
// NEXT_PUBLIC_SITE 由 package.json 的 build:*/start:*/dev:* 脚本注入,不要写进 .env.local。

export type SiteVariant = 'palium' | 'palimesh'

export type NavKey =
  | 'story'
  | 'technology'
  | 'network'
  | 'testnet'
  | 'whitepaper'
  | 'governance'
  | 'economics'
  | 'docs'
  | 'services'
  | 'identity'
  | 'roadmap'
  | 'security'
  | 'forum'

/** footer 条目:本站路由 / 外部 URL / 对方站点路径(自动加 locale 前缀) */
export type FooterItem =
  | { kind: 'route'; key: NavKey; labelKey?: string }
  | { kind: 'url'; key: string; url: string; label?: string }
  | { kind: 'cross'; key: string; path: string }

export interface FooterColumn {
  titleKey: string
  items: FooterItem[]
}

const VARIANT: SiteVariant =
  (process.env.NEXT_PUBLIC_SITE as SiteVariant) === 'palimesh' ? 'palimesh' : 'palium'

// 链基础设施只有一条链(88780),两站都链接到 palium.io 的 explorer/rpc/faucet
const CHAIN = {
  id: 88780,
  name: 'Palium',
  networkName: 'Palium Canary 88780',
  symbol: 'PALI',
  explorer: 'https://explorer.palium.io',
  rpc: 'https://rpc.palium.io',
  ws: 'wss://rpc.palium.io/ws',
  faucet: 'https://faucet.palium.io',
}

const GITHUB = 'https://github.com/palimesh/palimesh'
const TWITTER = 'https://x.com/parallelmeshes'
const NPM_ORG = 'https://www.npmjs.com/org/palimesh'

export interface SiteConfig {
  variant: SiteVariant
  brand: string
  token: string // 代币符号(不含 $)
  apex: string
  chain: typeof CHAIN
  logo: string
  title: string
  description: string
  /** 顶部导航:i18n common key */
  navKeys: NavKey[]
  /** 移动菜单在 navKeys 之外追加的项 */
  mobileExtra: NavKey[]
  /** footer 分栏 */
  footer: FooterColumn[]
  /** 本站不提供、308 跳到对方站的路由段 */
  exclusiveRoutes: string[]
  /** 本站不使用、加载期从 messages 剪掉的命名空间(点路径),避免对方站文案随 HTML 下发 */
  messagePrune: string[]
  github: string
  twitter: string
  /** TODO: security@palium.io 邮箱建好后改为各站独立 */
  securityEmail: string
  heroArt: { src: string; width: number; height: number }
  ogImage: string
  favicon: string
  /** /downloads/<base>.<lang>.md */
  whitepaperBase: string
  home: {
    heroPrimaryHref: string
    heroSecondaryHref: string
  }
}

const PALIUM: SiteConfig = {
  variant: 'palium',
  brand: 'Palium',
  token: 'PALI',
  apex: 'https://palium.io',
  chain: CHAIN,
  logo: '/brand/palium-mark.svg',
  title: 'Palium · Public chain for AI agents',
  description:
    'Palium is a BFT public chain purpose-built for AI agents: verifiable service (PoSe), standard EVM execution, and bicameral on-chain governance. Chain ID 88780. $PALI.',
  navKeys: ['technology', 'network', 'testnet', 'whitepaper', 'governance', 'economics', 'docs'],
  mobileExtra: ['roadmap', 'forum', 'identity', 'security'],
  footer: [
    {
      titleKey: 'protocol',
      items: [
        { kind: 'route', key: 'technology' },
        { kind: 'route', key: 'network' },
        { kind: 'route', key: 'whitepaper' },
        { kind: 'route', key: 'roadmap' },
        { kind: 'route', key: 'security' },
      ],
    },
    {
      titleKey: 'build',
      items: [
        { kind: 'route', key: 'docs' },
        { kind: 'route', key: 'testnet' },
        { kind: 'url', key: 'explorer', url: CHAIN.explorer },
        { kind: 'url', key: 'faucet', url: CHAIN.faucet },
        { kind: 'url', key: 'github', url: GITHUB },
      ],
    },
    {
      titleKey: 'community',
      items: [
        { kind: 'route', key: 'governance' },
        { kind: 'route', key: 'forum' },
        { kind: 'route', key: 'identity', labelKey: 'governanceIdentity' },
        { kind: 'url', key: 'x', url: TWITTER, label: 'X (Twitter)' },
      ],
    },
    {
      titleKey: 'ecosystem',
      items: [
        { kind: 'cross', key: 'palimeshStorage', path: '' },
        { kind: 'cross', key: 'story', path: '/story' },
        { kind: 'cross', key: 'services', path: '/services' },
      ],
    },
  ],
  exclusiveRoutes: ['story', 'services'],
  messagePrune: ['story', 'services', 'home.parchment', 'home.products'],
  github: GITHUB,
  twitter: TWITTER,
  securityEmail: 'security@palimesh.io',
  heroArt: { src: '/art/palium-codex.webp', width: 1549, height: 1015 },
  ogImage: '/brand/og-palium.png',
  favicon: '/brand/icon-palium.png',
  whitepaperBase: 'palium_whitepaper',
  home: { heroPrimaryHref: '/testnet', heroSecondaryHref: '/docs' },
}

const PALIMESH: SiteConfig = {
  variant: 'palimesh',
  brand: 'PaliMesh',
  token: 'MESH',
  apex: 'https://palimesh.io',
  chain: CHAIN,
  logo: '/brand/logo-seal-simple.svg',
  title: 'PaliMesh · Decentralized storage for AI agents',
  description:
    'PaliMesh is a decentralized storage network for AI agents — erasure-coded P2P storage, portable identity (DID/Soul), and persistent memory, settled on Palium. $MESH.',
  navKeys: ['story', 'technology', 'services', 'identity', 'economics', 'docs'],
  mobileExtra: ['whitepaper', 'security'],
  footer: [
    {
      titleKey: 'network',
      items: [
        { kind: 'route', key: 'story' },
        { kind: 'route', key: 'technology' },
        { kind: 'route', key: 'whitepaper', labelKey: 'paper' },
        { kind: 'route', key: 'security' },
      ],
    },
    {
      titleKey: 'build',
      items: [
        { kind: 'route', key: 'services' },
        { kind: 'route', key: 'docs' },
        { kind: 'url', key: 'npm', url: NPM_ORG, label: 'npm' },
        { kind: 'url', key: 'github', url: GITHUB },
      ],
    },
    {
      titleKey: 'settlement',
      items: [
        { kind: 'cross', key: 'paliumChain', path: '' },
        { kind: 'url', key: 'explorer', url: CHAIN.explorer },
        { kind: 'cross', key: 'testnet', path: '/testnet' },
        { kind: 'cross', key: 'governance', path: '/governance' },
      ],
    },
    {
      titleKey: 'community',
      items: [
        { kind: 'route', key: 'identity' },
        { kind: 'url', key: 'x', url: TWITTER, label: 'X (Twitter)' },
      ],
    },
  ],
  exclusiveRoutes: ['network', 'testnet', 'governance', 'forum', 'roadmap'],
  messagePrune: ['network', 'testnet', 'governance', 'forum', 'roadmap'],
  github: GITHUB,
  twitter: TWITTER,
  securityEmail: 'security@palimesh.io',
  heroArt: { src: '/art/palimesh-codex-v4.webp', width: 1549, height: 1015 },
  ogImage: '/brand/og-palimesh.png',
  favicon: '/brand/icon-palimesh.png',
  whitepaperBase: 'palimesh-p2p-storage-paper',
  home: { heroPrimaryHref: '/services', heroSecondaryHref: '/whitepaper' },
}

export const site: SiteConfig = VARIANT === 'palimesh' ? PALIMESH : PALIUM
export const otherSite: SiteConfig = VARIANT === 'palimesh' ? PALIUM : PALIMESH
export const isPalium = site.variant === 'palium'
export const isPaliMesh = site.variant === 'palimesh'

/** i18n 文案里的品牌占位符({brand}/{token}/{chain}/{networkName}),在 messages 加载期替换 */
export const BRAND_VARS: Record<string, string> = {
  brand: site.brand,
  token: site.token,
  chain: CHAIN.name,
  networkName: CHAIN.networkName,
}

/** 对方站点的 locale 前缀 URL */
export function crossSiteUrl(locale: string, path = ''): string {
  return `${otherSite.apex}/${locale}${path}`
}
