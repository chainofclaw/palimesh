'use client'

import { INK, VELLUM, EDGE, GOLD, VIOLET, MUTED, DISPLAY, MONO } from './palette'

export interface ArchitectureLabels {
  aria: string
  caption: string
  l4: string
  l4note: string
  l3: string
  l3note: string
  l2: string
  l2note: string
  l1: string
  l1note: string
  txFlow: string
  proofFlow: string
}

// 四层架构:L4 Agent API → L1 BFT 共识,左侧 tx 下行、右侧 proof 上行
export function ArchitectureDiagram({ labels }: { labels: ArchitectureLabels }) {
  const layers = [
    { n: 4, title: labels.l4, note: labels.l4note, rot: -0.4 },
    { n: 3, title: labels.l3, note: labels.l3note, rot: 0.35 },
    { n: 2, title: labels.l2, note: labels.l2note, rot: -0.3 },
    { n: 1, title: labels.l1, note: labels.l1note, rot: 0.4 },
  ]
  return (
    <figure className="my-8">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 780 400" role="img" aria-label={labels.aria} className="w-full min-w-[560px]">
          {layers.map((l, i) => {
            const y = 26 + i * 90
            return (
              <g key={l.n} transform={`rotate(${l.rot} 390 ${y + 34})`}>
                <rect x="96" y={y} width="588" height="68" rx="10" fill={VELLUM} stroke={EDGE} strokeWidth="2" />
                <rect x="96" y={y} width="58" height="68" rx="10" fill={VIOLET} opacity={0.9 - i * 0.14} />
                <text x="125" y={y + 42} textAnchor="middle" fontFamily={MONO} fontSize="17" fill="#fff" fontWeight="600">
                  L{l.n}
                </text>
                <text x="176" y={y + 31} fontFamily={DISPLAY} fontSize="21" fontWeight="600" fill={INK}>
                  {l.title}
                </text>
                <text x="176" y={y + 54} fontFamily={MONO} fontSize="11.5" fill={MUTED}>
                  {l.note}
                </text>
              </g>
            )
          })}
          {/* 左:tx 下行 */}
          <g stroke={INK} strokeWidth="2" fill="none">
            <path d="M56 52 V330" />
            <path d="M48 318 L56 334 L64 318" fill={INK} stroke="none" />
          </g>
          <text x="46" y="196" fontFamily={MONO} fontSize="12" fill={INK} transform="rotate(-90 46 196)" textAnchor="middle">
            {labels.txFlow}
          </text>
          {/* 右:proof 上行(金) */}
          <g stroke={GOLD} strokeWidth="2.5" fill="none">
            <path d="M726 330 V52" />
            <path d="M718 64 L726 48 L734 64" fill={GOLD} stroke="none" />
          </g>
          <text x="740" y="196" fontFamily={MONO} fontSize="12" fill={GOLD} transform="rotate(90 740 196)" textAnchor="middle">
            {labels.proofFlow}
          </text>
        </svg>
      </div>
      <figcaption className="text-center text-sm text-text-muted mt-3">{labels.caption}</figcaption>
    </figure>
  )
}
