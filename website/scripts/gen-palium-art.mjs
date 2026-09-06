// 临时版视觉，待设计师替换。
// 生成 Palium 站的 hero 主图 / OG 图 / 图标（node + sharp，无其它依赖，可重复运行）。
//   node scripts/gen-palium-art.mjs
// 产物：
//   public/art/palium-codex.webp   1549×1015
//   public/brand/og-palium.png     1200×630
//   public/brand/icon-palium.png   512×512
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const p = (...seg) => resolve(ROOT, ...seg)

// ---- 色板：从 src/components/diagrams/palette.ts 读取（避免引入 TS 加载器） ----
const readPalette = () => {
  const src = readFileSync(p('src/components/diagrams/palette.ts'), 'utf8')
  const out = {}
  for (const m of src.matchAll(/export const (\w+) = '([^']+)'/g)) out[m[1]] = m[2]
  return out
}
const PAL = readPalette()
const INK = PAL.INK ?? '#1c1917'
const VELLUM = PAL.VELLUM ?? '#f6efdf'
const VELLUM_DEEP = PAL.VELLUM_DEEP ?? '#efe4c9'
const EDGE = PAL.EDGE ?? '#d9c9a3'
const GOLD = PAL.GOLD ?? '#f0a83c'
const GOLD_DEEP = PAL.GOLD_DEEP ?? '#c9962e'
const MUTED = PAL.MUTED ?? '#8a8378'

// palium-mark.svg 的固定配色
const WAX_HI = '#7c5cff'
const WAX_MID = '#5b3fc4'
const WAX_LO = '#3d2a99'
const WAX_EDGE = '#2a1f66'
const RING_GOLD = '#e8c874'
const WAX_TEXT = '#f3ead6'

const SERIF = "Georgia, 'Times New Roman', serif"
const MONO = "'DejaVu Sans Mono', 'Liberation Mono', monospace"

const PARCHMENT = p('public/art/parchment-bg.webp')

// ---- 火漆印 P：复用 palium-mark.svg 的几何（48 单位 viewBox） ----
const sealDefs = (id) => `
  <radialGradient id="${id}-wax" cx="38%" cy="32%" r="75%">
    <stop offset="0" stop-color="${WAX_HI}"/><stop offset="0.6" stop-color="${WAX_MID}"/><stop offset="1" stop-color="${WAX_LO}"/>
  </radialGradient>
  <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>
    <feOffset dx="0.6" dy="1.2" result="o"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`

// cx, cy 为中心，size 为直径（像素）
const seal = (id, cx, cy, size, { shadow = true } = {}) => {
  const s = size / 48
  return `
  <g transform="translate(${cx - 24 * s} ${cy - 24 * s}) scale(${s})" ${shadow ? `filter="url(#${id}-shadow)"` : ''}>
    <circle cx="24" cy="24" r="21" fill="url(#${id}-wax)" stroke="${WAX_EDGE}" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="17" fill="none" stroke="${RING_GOLD}" stroke-width="1.2" opacity="0.85"/>
    <text x="23" y="33" text-anchor="middle" font-family="${SERIF}" font-weight="bold" font-size="26" fill="${WAX_TEXT}">P</text>
    <circle cx="36.5" cy="17" r="2.6" fill="${GOLD}" stroke="${WAX_EDGE}" stroke-width="1"/>
    <circle cx="36.5" cy="31" r="2.6" fill="${GOLD}" stroke="${WAX_EDGE}" stroke-width="1"/>
    <path d="M36.5 19.5 V28.5" stroke="${RING_GOLD}" stroke-width="1.3"/>
  </g>`
}

// ---- 确定性伪随机（mulberry32），保证可重复生成 ----
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ---- 链节网格：节点 + 连线，避开火漆印区域 ----
// avoid: 火漆印圆区；keepOut: 额外的矩形禁区（如标题）
const buildNetwork = ({ w, h, seed, avoid, keepOut = [], count, highlight, minGap = 70 }) => {
  const rand = rng(seed)
  const nodes = []
  let guard = 0
  while (nodes.length < count && guard++ < count * 60) {
    const x = 90 + rand() * (w - 180)
    const y = 90 + rand() * (h - 210)
    if (Math.hypot(x - avoid.cx, y - avoid.cy) < avoid.r) continue
    if (keepOut.some((k) => x > k.x && x < k.x + k.w && y > k.y && y < k.y + k.h)) continue
    if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < minGap)) continue
    nodes.push({ x, y, r: 3 + rand() * 3 })
  }
  // 每个节点连接最近的 2–3 个
  const edges = new Set()
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2 + Math.floor(rand() * 2))
    near.forEach((o) => edges.add(i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`))
  })
  // 火漆印向外辐射 3 条"链"
  const spokes = nodes
    .map((n, i) => ({ i, d: Math.hypot(n.x - avoid.cx, n.y - avoid.cy) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
  const gold = new Set()
  while (gold.size < highlight) gold.add(Math.floor(rand() * nodes.length))

  const lines = [...edges]
    .map((k) => k.split('-').map(Number))
    .map(([a, b]) => `<line x1="${nodes[a].x.toFixed(1)}" y1="${nodes[a].y.toFixed(1)}" x2="${nodes[b].x.toFixed(1)}" y2="${nodes[b].y.toFixed(1)}"/>`)
    .join('')
  const spokeLines = spokes
    .map(({ i }) => {
      const n = nodes[i]
      const ang = Math.atan2(n.y - avoid.cy, n.x - avoid.cx)
      const sx = avoid.cx + Math.cos(ang) * avoid.r * 0.92
      const sy = avoid.cy + Math.sin(ang) * avoid.r * 0.92
      return `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke-dasharray="4 5"/>`
    })
    .join('')
  const dots = nodes
    .map((n, i) =>
      gold.has(i)
        ? `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(n.r + 3).toFixed(1)}" fill="${GOLD}" stroke="${WAX_EDGE}" stroke-width="1.4"/>
           <circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(n.r + 9).toFixed(1)}" fill="none" stroke="${GOLD_DEEP}" stroke-width="0.8" opacity="0.6"/>`
        : `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${VELLUM}" stroke="${WAX_LO}" stroke-width="1.4"/>`,
    )
    .join('')
  return `
  <g stroke="${WAX_LO}" stroke-width="1.1" stroke-opacity="0.4" fill="none">${lines}${spokeLines}</g>
  <g>${dots}</g>`
}

// ---- 淡金细线装饰框 + 四角花纹 ----
const frame = (w, h, m) => {
  const corner = (x, y, sx, sy) => `
    <g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${GOLD_DEEP}" stroke-width="1.2" opacity="0.7">
      <path d="M0 34 V0 H34"/>
      <path d="M6 40 V6 H40" opacity="0.6"/>
      <path d="M6 6 q10 2 14 14 M6 6 q2 10 14 14" opacity="0.8"/>
      <circle cx="6" cy="6" r="2.2" fill="${GOLD}" stroke="none"/>
    </g>`
  return `
  <rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${GOLD_DEEP}" stroke-width="1" opacity="0.45"/>
  <rect x="${m + 7}" y="${m + 7}" width="${w - 2 * m - 14}" height="${h - 2 * m - 14}" fill="none" stroke="${GOLD_DEEP}" stroke-width="0.6" opacity="0.35"/>
  ${corner(m - 6, m - 6, 1, 1)}
  ${corner(w - m + 6, m - 6, -1, 1)}
  ${corner(m - 6, h - m + 6, 1, -1)}
  ${corner(w - m + 6, h - m + 6, -1, -1)}`
}

// ---- 微弱的"经文"横线，呼应抄本气质 ----
const rulings = (x, y, w, rows, gap) => {
  let out = ''
  const rand = rng(7)
  for (let i = 0; i < rows; i++) {
    const len = w * (0.55 + rand() * 0.45)
    out += `<line x1="${x}" y1="${y + i * gap}" x2="${(x + len).toFixed(0)}" y2="${y + i * gap}"/>`
  }
  return `<g stroke="${INK}" stroke-width="1.6" stroke-opacity="0.08" stroke-linecap="round" stroke-dasharray="9 5 14 6 5 7">${out}</g>`
}

const parchmentBase = (w, h) => sharp(PARCHMENT).resize(w, h, { fit: 'cover' })

// 无底图时的备用羊皮纸（VELLUM 渐变 + 噪点），目前仅作为 OG 底纹上的柔光层
const vellumWash = (id) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${VELLUM}" stop-opacity="0.35"/>
    <stop offset="1" stop-color="${VELLUM_DEEP}" stop-opacity="0.2"/>
  </linearGradient>`

// =============== 1. palium-codex.webp 1549×1015 ===============
const genCodex = async () => {
  const w = 1549
  const h = 1015
  const sealC = { cx: 1010, cy: 470, r: 250 }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${sealDefs('cx')}${vellumWash('wash')}
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${WAX_LO}" stop-opacity="0.16"/><stop offset="1" stop-color="${WAX_LO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#wash)"/>
  ${frame(w, h, 42)}
  ${rulings(120, 250, 520, 14, 30)}
  ${buildNetwork({ w, h, seed: 88780, avoid: { cx: sealC.cx, cy: sealC.cy, r: sealC.r + 30 }, keepOut: [{ x: 60, y: 60, w: 760, h: 200 }, { x: 300, y: h - 120, w: 950, h: 120 }], count: 40, highlight: 4, minGap: 95 })}
  <circle cx="${sealC.cx}" cy="${sealC.cy}" r="${sealC.r + 90}" fill="url(#glow)"/>
  <circle cx="${sealC.cx}" cy="${sealC.cy}" r="${sealC.r + 22}" fill="none" stroke="${GOLD_DEEP}" stroke-width="1" stroke-dasharray="2 9" opacity="0.7"/>
  ${seal('cx', sealC.cx, sealC.cy, sealC.r * 2 * 0.9)}
  <text x="120" y="176" font-family="${SERIF}" font-size="92" font-weight="bold" fill="${INK}" fill-opacity="0.88" letter-spacing="2">Palium</text>
  <text x="123" y="214" font-family="${MONO}" font-size="17" fill="${MUTED}" letter-spacing="4">STATUS REDIT · THE CHAIN WHERE STATE RETURNS</text>
  <text x="${w / 2}" y="${h - 62}" text-anchor="middle" font-family="${MONO}" font-size="16" letter-spacing="5" fill="${INK}" fill-opacity="0.4">PALIUM · CHAIN ID 88780 · PROOF OF SERVICE</text>
</svg>`
  const out = p('public/art/palium-codex.webp')
  await parchmentBase(w, h)
    .composite([{ input: Buffer.from(svg) }])
    .webp({ quality: 82 })
    .toFile(out)
  return out
}

// =============== 2. og-palium.png 1200×630 ===============
const genOg = async () => {
  const w = 1200
  const h = 630
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${sealDefs('og')}${vellumWash('wash')}
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${WAX_LO}" stop-opacity="0.18"/><stop offset="1" stop-color="${WAX_LO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#wash)"/>
  ${frame(w, h, 28)}
  ${buildNetwork({ w, h, seed: 8878, avoid: { cx: 930, cy: 315, r: 240 }, keepOut: [{ x: 0, y: 0, w: 660, h: h }], count: 11, highlight: 3, minGap: 80 })}
  <rect x="60" y="120" width="560" height="400" fill="${VELLUM}" fill-opacity="0.55" rx="4"/>
  <circle cx="930" cy="315" r="300" fill="url(#glow)"/>
  <circle cx="930" cy="315" r="222" fill="none" stroke="${GOLD_DEEP}" stroke-width="1" stroke-dasharray="2 9" opacity="0.7"/>
  ${seal('og', 930, 315, 400)}
  <text x="88" y="290" font-family="${SERIF}" font-size="150" font-weight="bold" fill="${INK}" fill-opacity="0.9" letter-spacing="2">Palium</text>
  <line x1="94" y1="322" x2="500" y2="322" stroke="${GOLD_DEEP}" stroke-width="1.2" opacity="0.8"/>
  <text x="94" y="378" font-family="${SERIF}" font-size="38" font-style="italic" fill="${INK}" fill-opacity="0.85">The chain where state returns.</text>
  <text x="95" y="432" font-family="${MONO}" font-size="20" letter-spacing="2" fill="${INK}" fill-opacity="0.6">Public chain for AI agents · Chain ID 88780</text>
</svg>`
  const out = p('public/brand/og-palium.png')
  await parchmentBase(w, h)
    .composite([{ input: Buffer.from(svg) }])
    .flatten({ background: VELLUM })
    .png({ compressionLevel: 9, palette: true, quality: 90, dither: 0.6 })
    .toFile(out)
  return out
}

// =============== 3. icon-palium.png 512×512（透明底） ===============
const genIcon = async () => {
  const s = 512
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>${sealDefs('ic')}</defs>
  ${seal('ic', s / 2, s / 2, s * 0.94, { shadow: false })}
</svg>`
  const out = p('public/brand/icon-palium.png')
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out)
  return out
}

const main = async () => {
  mkdirSync(p('public/art'), { recursive: true })
  mkdirSync(p('public/brand'), { recursive: true })
  const files = [await genCodex(), await genOg(), await genIcon()]
  for (const f of files) {
    const m = await sharp(f).metadata()
    process.stdout.write(`${f.replace(ROOT + '/', '')}  ${m.width}×${m.height}  ${m.format}  ${m.hasAlpha ? 'alpha' : 'opaque'}\n`)
  }
}

main().catch((err) => {
  process.stderr.write(`gen-palium-art failed: ${err?.stack ?? err}\n`)
  process.exit(1)
})
