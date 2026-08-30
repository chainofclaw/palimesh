'use client'

import { INK, VELLUM, EDGE, GOLD, GOLD_DEEP, VIOLET, MUTED, DISPLAY, MONO } from './palette'

export interface PoseFlowLabels {
  aria: string
  caption: string
  challenger: string
  node: string
  witness: string
  contract: string
  s1: string
  s2: string
  s3: string
  s4: string
}

// PoSe 挑战时序:Challenger → Node → Witness×3 → Settlement Contract
export function PoseFlowDiagram({ labels }: { labels: PoseFlowLabels }) {
  const cols = [
    { x: 110, title: labels.challenger, rot: -0.4 },
    { x: 310, title: labels.node, rot: 0.3 },
    { x: 510, title: labels.witness, rot: -0.3 },
    { x: 710, title: labels.contract, rot: 0.4 },
  ]
  const Arrow = ({ x1, x2, y, num, label, gold }: { x1: number; x2: number; y: number; num: string; label: string; gold?: boolean }) => {
    const c = gold ? GOLD_DEEP : INK
    const mid = (x1 + x2) / 2
    const dir = x2 > x1 ? 1 : -1
    return (
      <g>
        <line x1={x1} y1={y} x2={x2 - 10 * dir} y2={y} stroke={c} strokeWidth="2" />
        <path d={`M${x2 - 12 * dir} ${y - 6} L${x2} ${y} L${x2 - 12 * dir} ${y + 6}`} fill={c} />
        <circle cx={mid} cy={y - 16} r="11" fill={VELLUM} stroke={c} strokeWidth="1.5" />
        <text x={mid} y={y - 12} textAnchor="middle" fontFamily={MONO} fontSize="12" fontWeight="700" fill={c}>
          {num}
        </text>
        <text x={mid} y={y + 18} textAnchor="middle" fontFamily={MONO} fontSize="11.5" fill={MUTED}>
          {label}
        </text>
      </g>
    )
  }
  return (
    <figure className="my-8">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 820 430" role="img" aria-label={labels.aria} className="w-full min-w-[620px]">
          {/* Witness 叠影(置于主卡之下):×3 */}
          <rect x="434" y="20" width="168" height="52" rx="9" fill={VELLUM} stroke={EDGE} strokeWidth="1.5" opacity="0.55" transform="rotate(-1.2 518 46)" />
          <rect x="440" y="24" width="168" height="52" rx="9" fill={VELLUM} stroke={EDGE} strokeWidth="1.5" opacity="0.75" transform="rotate(-0.7 524 50)" />
          {/* 列头卡 + 生命线 */}
          {cols.map((col) => (
            <g key={col.x} transform={`rotate(${col.rot} ${col.x} 56)`}>
              <rect x={col.x - 84} y="28" width="168" height="52" rx="9" fill={VELLUM} stroke={EDGE} strokeWidth="2" />
              <text x={col.x} y="60" textAnchor="middle" fontFamily={DISPLAY} fontSize="17" fontWeight="600" fill={INK}>
                {col.title}
              </text>
            </g>
          ))}
          {cols.map((col) => (
            <line key={col.x} x1={col.x} y1="82" x2={col.x} y2="352" stroke={MUTED} strokeWidth="1.4" strokeDasharray="5 6" />
          ))}
          {/* 合约火漆金印 */}
          <circle cx="710" cy="112" r="15" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="3" />
          <circle cx="710" cy="112" r="6" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />

          <Arrow x1={110} x2={310} y={150} num="1" label={labels.s1} />
          <Arrow x1={310} x2={510} y={210} num="2" label={labels.s2} />
          <Arrow x1={510} x2={710} y={270} num="3" label={labels.s3} />
          {/* ④ epoch 聚合:合约自环 + 落链 */}
          <path d="M710 300 C 770 300 770 340 710 340" fill="none" stroke={GOLD_DEEP} strokeWidth="2.5" />
          <path d="M722 334 L708 341 L722 348" fill={GOLD_DEEP} />
          <circle cx="748" cy="304" r="11" fill={VELLUM} stroke={GOLD_DEEP} strokeWidth="1.5" />
          <text x="748" y="308" textAnchor="middle" fontFamily={MONO} fontSize="12" fontWeight="700" fill={GOLD_DEEP}>4</text>
          <text x="710" y="374" textAnchor="middle" fontFamily={MONO} fontSize="11.5" fill={GOLD_DEEP}>
            {labels.s4}
          </text>
          {/* 底部链基线 */}
          <line x1="60" y1="398" x2="760" y2="398" stroke={INK} strokeWidth="2" />
          {[110, 310, 510, 710].map((x) => (
            <rect key={x} x={x - 9} y="391" width="18" height="14" rx="3" fill={VIOLET} opacity="0.85" />
          ))}
        </svg>
      </div>
      <figcaption className="text-center text-sm text-text-muted mt-3">{labels.caption}</figcaption>
    </figure>
  )
}
