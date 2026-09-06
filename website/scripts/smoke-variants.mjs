#!/usr/bin/env node
// 双站泄漏烟测(仅 fetch,不需要浏览器):
//   node scripts/smoke-variants.mjs --palium http://127.0.0.1:3004 --palimesh http://127.0.0.1:3001
// 断言:本站路由 200;独占路由 308 且 location 指向对方 apex;HTML 不含对方站的标志性文案;title/og:image/logo 与变体一致。
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const BASE = { palium: opt('--palium', 'http://127.0.0.1:3004'), palimesh: opt('--palimesh', 'http://127.0.0.1:3001') }
const APEX = { palium: 'https://palium.io', palimesh: 'https://palimesh.io' }
const LOCALES = ['zh', 'en']
const ROUTES = ['', 'technology', 'whitepaper', 'docs', 'economics', 'identity', 'security', 'network', 'testnet', 'governance', 'forum', 'roadmap', 'story', 'services']
const EXCLUSIVE = { palium: ['story', 'services'], palimesh: ['network', 'testnet', 'governance', 'forum', 'roadmap'] }
const FORBIDDEN = {
  // palimesh 站不该出现的链站文案
  palimesh: ['Palium 使服务可验证', 'Palium made service verifiable', 'Palium Canary 88780 实时遥测', '/brand/palium-mark.svg', 'Palium · Public chain'],
  // palium 站不该出现的存储站文案
  palium: ['PaliMesh Canary', '纠删码存储 mesh', 'erasure-coded storage mesh', '重写本的法则', '/brand/logo-seal-simple.svg', 'PaliMesh · Decentralized storage'],
}
const EXPECT = {
  palium: { title: 'Palium', logo: '/brand/palium-mark.svg', og: '/brand/og-palium.png' },
  palimesh: { title: 'PaliMesh', logo: '/brand/logo-seal-simple.svg', og: '/brand/og-palimesh.png' },
}

let failures = 0
const fail = (m) => { failures++; console.error('  ✗ ' + m) }
const ok = (m) => console.log('  ✓ ' + m)

for (const variant of ['palium', 'palimesh']) {
  console.log(`\n== ${variant} @ ${BASE[variant]}`)
  for (const locale of LOCALES) {
    for (const route of ROUTES) {
      const path = `/${locale}${route ? '/' + route : ''}`
      const url = BASE[variant] + path
      let res
      try { res = await fetch(url, { redirect: 'manual' }) } catch (e) { fail(`${path} fetch error: ${e.message}`); continue }
      const exclusive = EXCLUSIVE[variant].includes(route)
      if (exclusive) {
        const loc = res.headers.get('location') || ''
        if (res.status === 308 && loc.startsWith(APEX[variant === 'palium' ? 'palimesh' : 'palium'] + path)) ok(`${path} → 308 ${loc}`)
        else fail(`${path} expected 308 to other site, got ${res.status} ${loc}`)
        continue
      }
      if (res.status !== 200) { fail(`${path} HTTP ${res.status}`); continue }
      const html = await res.text()
      const leaks = FORBIDDEN[variant].filter((s) => html.includes(s))
      if (leaks.length) fail(`${path} leaks: ${leaks.join(' | ')}`)
      else ok(`${path} 200, no leaks`)
      if (route === '') {
        const e = EXPECT[variant]
        if (!new RegExp(`<title>[^<]*${e.title}`).test(html)) fail(`${path} <title> missing ${e.title}`)
        if (!html.includes(e.logo)) fail(`${path} header logo ${e.logo} missing`)
        if (!html.includes(e.og)) fail(`${path} og:image ${e.og} missing`)
      }
    }
  }
}
console.log(failures ? `\nsmoke FAILED: ${failures} problem(s)` : '\nsmoke passed')
process.exit(failures ? 1 : 0)
