'use client'

import { INK, VELLUM, EDGE, GOLD_DEEP, VIOLET, MUTED, DISPLAY, MONO } from './palette'

export interface TopologyLabels {
  aria: string
  caption: string
  validator: string
  storage: string
  relay: string
  rpc: string
}

// 网络拓扑:中心 4 validator 全连 mesh,外围 storage/relay 辐射,RPC 虚线入口
export function TopologyDiagram({ labels }: { labels: TopologyLabels }) {
  const V = [
    { x: 290, y: 150 },
    { x: 430, y: 150 },
    { x: 290, y: 290 },
    { x: 430, y: 290 },
  ]
  const outer = [
    { x: 130, y: 90, kind: 's' },
    { x: 590, y: 90, kind: 'r' },
    { x: 620, y: 220, kind: 's' },
    { x: 590, y: 360, kind: 'r' },
    { x: 130, y: 360, kind: 's' },
    { x: 100, y: 220, kind: 'r' },
  ] as const
  const near = (o: { x: number; y: number }) =>
    V.reduce((a, b) => ((o.x - a.x) ** 2 + (o.y - a.y) ** 2 < (o.x - b.x) ** 2 + (o.y - b.y) ** 2 ? a : b))
  return (
    <figure className="my-8">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 720 460" role="img" aria-label={labels.aria} className="w-full min-w-[520px]">
          {/* 外围连线 */}
          {outer.map((o, i) => {
            const v = near(o)
            return <line key={i} x1={o.x} y1={o.y} x2={v.x} y2={v.y} stroke={MUTED} strokeWidth="1.6" />
          })}
          {/* validator 全连 mesh */}
          {V.flatMap((a, i) =>
            V.slice(i + 1).map((b, j) => (
              <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={VIOLET} strokeWidth="2.4" opacity="0.8" />
            )),
          )}
          {/* validator 节点 */}
          {V.map((v, i) => (
            <g key={i}>
              <circle cx={v.x} cy={v.y} r="26" fill={VIOLET} stroke={INK} strokeWidth="3" />
              <circle cx={v.x} cy={v.y} r="10" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.85" />
            </g>
          ))}
          {/* 外围节点:storage=方形字牌 / relay=空心圆 */}
          {outer.map((o, i) =>
            o.kind === 's' ? (
              <g key={i} transform={`rotate(${i % 2 ? 2 : -2} ${o.x} ${o.y})`}>
                <rect x={o.x - 20} y={o.y - 20} width="40" height="40" rx="7" fill={VELLUM} stroke={INK} strokeWidth="2.5" />
                <line x1={o.x - 10} y1={o.y - 5} x2={o.x + 10} y2={o.y - 5} stroke={INK} strokeWidth="2" />
                <line x1={o.x - 10} y1={o.y + 5} x2={o.x + 10} y2={o.y + 5} stroke={INK} strokeWidth="2" />
              </g>
            ) : (
              <circle key={i} cx={o.x} cy={o.y} r="18" fill={VELLUM} stroke={INK} strokeWidth="2.5" />
            ),
          )}
          {/* RPC 虚线入口 → 右上 relay */}
          <line x1="680" y1="34" x2="604" y2="80" stroke={GOLD_DEEP} strokeWidth="2" strokeDasharray="6 5" />
          <text x="676" y="24" textAnchor="end" fontFamily={MONO} fontSize="13" fill={GOLD_DEEP}>
            {labels.rpc}
          </text>
          {/* 图例 */}
          <g fontFamily={DISPLAY} fontSize="14" fill={INK}>
            <circle cx="120" cy="428" r="9" fill={VIOLET} stroke={INK} strokeWidth="2" />
            <text x="138" y="433">{labels.validator}</text>
            <rect x="268" y="419" width="18" height="18" rx="4" fill={VELLUM} stroke={INK} strokeWidth="2" />
            <text x="295" y="433">{labels.storage}</text>
            <circle cx="438" cy="428" r="9" fill={VELLUM} stroke={INK} strokeWidth="2" />
            <text x="456" y="433">{labels.relay}</text>
          </g>
        </svg>
      </div>
      <figcaption className="text-center text-sm text-text-muted mt-3">{labels.caption}</figcaption>
    </figure>
  )
}
