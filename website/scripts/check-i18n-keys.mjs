#!/usr/bin/env node
// 五语 messages 校验:①叶子 key 路径集合与 en 一致 ②每个叶子的 {占位符} 集合一致 ③品牌字面量只允许出现在允许清单路径下
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES = ['en', 'zh', 'es', 'ja', 'ko']
const BASE = 'en'

// 允许保留品牌字面量的路径(真实实体名:包名、命令、合约名、叙事、已按站拆分的命名空间)
const ALLOW = [
  /^story\./,
  /^economics\./,
  /^home\.hero\./,
  /^home\.parchment\./,
  /^home\.products\./,
  /^home\.palium\./,
  /^home\.palimesh\./,
  /^footer\.(palium|palimesh)\./,
  /^technology\.(palium|palimesh)\./,
  /^whitepaper\.(palium|palimesh)\./,
  /^docs\.(palium|palimesh)\./,
  /^roadmap\.palium\./,
  /^identity\.palimesh\./,
  /^security\.scope\.in\.(palium|palimesh)/,
  /^diagrams\.palimesh\./,
  /^services\./,
  // 单站独占页面(Palium: testnet/network/governance/forum/roadmap;PaliMesh: story/services)可写死品牌
  /^testnet\./,
  /^network\./,
  /^governance\./,
  /^forum\./,
  /^roadmap\./,
  /^common\.(paliumChain|palimeshStorage|crossSite)/,
  /\.(pkg|install|code|advancedCode|badge|details|desc)$/,
]
const BRAND_RE = /PaliMesh|Palium|Palimesh|palimesh\.io|palium\.io/
const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g
// 品牌占位符缺失无害(不替换即可),只强制真实 ICU 参数一致
const BRAND_PLACEHOLDERS = new Set(['brand', 'token', 'chain', 'networkName', 'other'])

function leaves(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, p, out)
    else out.set(p, v)
  }
  return out
}

function placeholders(value) {
  const set = new Set()
  const walk = (v) => {
    if (typeof v === 'string') for (const m of v.matchAll(PLACEHOLDER_RE)) if (!BRAND_PLACEHOLDERS.has(m[1])) set.add(m[1])
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(value)
  return [...set].sort().join(',')
}

function hasBrand(value) {
  if (typeof value === 'string') return BRAND_RE.test(value)
  if (Array.isArray(value)) return value.some(hasBrand)
  if (value && typeof value === 'object') return Object.values(value).some(hasBrand)
  return false
}

const data = Object.fromEntries(
  LOCALES.map((l) => [l, leaves(JSON.parse(readFileSync(path.join(root, 'messages', `${l}.json`), 'utf8')))]),
)
const base = data[BASE]
const errors = []

for (const l of LOCALES) {
  if (l === BASE) continue
  for (const k of base.keys()) if (!data[l].has(k)) errors.push(`[${l}] missing key: ${k}`)
  for (const k of data[l].keys()) if (!base.has(k)) errors.push(`[${l}] extra key: ${k}`)
  for (const k of base.keys()) {
    if (!data[l].has(k)) continue
    const a = placeholders(base.get(k))
    const b = placeholders(data[l].get(k))
    if (a !== b) errors.push(`[${l}] placeholder mismatch at ${k}: en={${a}} ${l}={${b}}`)
  }
}

for (const l of LOCALES) {
  for (const [k, v] of data[l]) {
    if (hasBrand(v) && !ALLOW.some((re) => re.test(k))) {
      errors.push(`[${l}] brand literal outside allow-list at ${k}: ${JSON.stringify(v).slice(0, 80)}`)
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\ni18n check failed: ${errors.length} problem(s)`)
  process.exit(1)
}
console.log(`i18n check passed: ${base.size} leaf keys × ${LOCALES.length} locales`)
