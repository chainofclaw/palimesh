'use client'

import { INK, VELLUM, EDGE, GOLD_DEEP, VIOLET, MUTED, DISPLAY, MONO } from './palette'

export interface AgentLayersLabels {
  aria: string
  caption: string
  layers: string[] // 自底(L1 身份)向顶(L6 关系),长度 6
}

// Agent 六层叠写:手稿层板,旧层渐褪,顶层带书写笔尖
export function AgentLayersDiagram({ labels }: { labels: AgentLayersLabels }) {
  const n = labels.layers.length
  return (
    <figure className="my-8">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 640 430" role="img" aria-label={labels.aria} className="w-full min-w-[440px]">
          {labels.layers.map((name, i) => {
            // i=0 是 L1(最老,最底);渲染自底向上
            const y = 372 - i * 58
            const inset = (n - 1 - i) * 14
            const opacity = 0.45 + (i / (n - 1)) * 0.55
            const rot = (i % 2 ? -0.35 : 0.35) * (1 + i * 0.15)
            const top = i === n - 1
            return (
              <g key={i} opacity={opacity} transform={`rotate(${rot} 300 ${y + 22})`}>
                <rect x={60 + inset} y={y} width={420 - inset * 2} height="46" rx="8" fill={top ? '#fffdf4' : VELLUM} stroke={top ? GOLD_DEEP : EDGE} strokeWidth={top ? 2.5 : 2} />
                <text x={82 + inset} y={y + 29} fontFamily={DISPLAY} fontSize="18" fontWeight="600" fill={INK}>
                  {name}
                </text>
                {/* 右侧边注引线 */}
                <line x1={480 - inset} y1={y + 22} x2={532} y2={y + 22} stroke={MUTED} strokeWidth="1.3" />
                <text x={540} y={y + 26} fontFamily={MONO} fontSize="12" fill={i === n - 1 ? GOLD_DEEP : MUTED}>
                  L{i + 1}
                </text>
              </g>
            )
          })}
          {/* 顶层书写笔尖(墨紫羽笔尖,正在写最新一层) */}
          <g transform="translate(455 32) rotate(38)">
            <path d="M0 0 L14 44 L7 52 L0 44 Z" fill={VIOLET} stroke={INK} strokeWidth="1.5" />
            <line x1="7" y1="52" x2="7" y2="64" stroke={INK} strokeWidth="2" />
          </g>
          <path d="M300 52 Q 380 40 448 52" fill="none" stroke={VIOLET} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 7" />
        </svg>
      </div>
      <figcaption className="text-center text-sm text-text-muted mt-3">{labels.caption}</figcaption>
    </figure>
  )
}
