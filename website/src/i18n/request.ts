import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { BRAND_VARS, otherSite, site } from '@/config/site'

type Messages = Record<string, unknown>

// 仅替换品牌占位符,不触碰 {days}/{p} 等真实 ICU 参数
const BRAND_RE = /\{(brand|token|chain|networkName)\}/g

function brandify<T>(node: T): T {
  if (typeof node === 'string') {
    return node.replace(BRAND_RE, (_, k: string) => BRAND_VARS[k] ?? `{${k}}`) as T
  }
  if (Array.isArray(node)) {
    return node.map(brandify) as T
  }
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = brandify(v)
    return out as T
  }
  return node
}

// 剪掉对方变体的子命名空间(xxx.palium / xxx.palimesh),既减小客户端 payload,也避免对方站文案随 HTML 下发
function pruneOtherVariant<T>(node: T): T {
  if (Array.isArray(node)) return node.map(pruneOtherVariant) as T
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === otherSite.variant) continue
      out[k] = pruneOtherVariant(v)
    }
    return out as T
  }
  return node
}

function prunePaths(root: Messages): Messages {
  for (const path of site.messagePrune) {
    const keys = path.split('.')
    const last = keys.pop() as string
    let cur: Record<string, unknown> | undefined = root
    for (const k of keys) cur = cur?.[k] as Record<string, unknown> | undefined
    if (cur && last in cur) delete cur[last]
  }
  return root
}

const cache = new Map<string, Messages>()

async function loadMessages(locale: string): Promise<Messages> {
  const cached = cache.get(locale)
  if (cached) return cached
  const raw = (await import(`../../messages/${locale}.json`)).default as Messages
  const branded = prunePaths(pruneOtherVariant(brandify(raw)))
  cache.set(locale, branded)
  return branded
}

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
