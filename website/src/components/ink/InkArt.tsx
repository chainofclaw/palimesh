'use client'

// 墨线装饰插画:currentColor,统一 1.5px 笔触,均为纯装饰(aria-hidden)
type P = { size?: number; className?: string }
const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className,
})

// 羽笔
export function QuillInk({ size = 28, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M38 6 C 26 10 14 22 11 36 C 22 34 33 24 38 6 Z" />
      <path d="M11 36 L7 42" />
      <path d="M16 30 C 22 26 28 20 32 13" strokeDasharray="1 4" />
    </svg>
  )
}

// 卷轴
export function ScrollInk({ size = 28, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 10 H36 A4 4 0 0 1 36 18 H12 A4 4 0 0 0 12 10 Z" transform="translate(0 -2)" />
      <path d="M10 8 V38 A4 4 0 0 0 18 38 V12" />
      <path d="M14 40 H34 A4 4 0 0 0 38 36 V14" />
      <path d="M20 20 H32 M20 26 H32 M20 32 H28" strokeWidth="1.2" />
    </svg>
  )
}

// 小链印(圆印内三节点)
export function SealInk({ size = 28, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="24" cy="24" r="17" />
      <circle cx="24" cy="24" r="13" strokeDasharray="2 3" strokeWidth="1" />
      <circle cx="18" cy="20" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="30" cy="20" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="24" cy="30" r="2.4" fill="currentColor" stroke="none" />
      <path d="M18 20 L30 20 L24 30 Z" strokeWidth="1.2" />
    </svg>
  )
}

// 网格星图
export function ConstellationInk({ size = 28, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 34 L22 12 L38 20 L30 38 Z M22 12 L30 38 M10 34 L38 20" strokeWidth="1.2" />
      <circle cx="10" cy="34" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="22" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="38" cy="20" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="30" cy="38" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

// 单色字标:方框衬线 P + 节点(页面装饰/水印用)
export function MarkInk({ size = 32, className }: P) {
  return (
    <svg {...base(size, className)}>
      <rect x="6" y="6" width="36" height="36" rx="7" />
      <text x="21" y="34" textAnchor="middle" fontFamily="var(--font-display)" fontSize="26" fontWeight="700" fill="currentColor" stroke="none">
        P
      </text>
      <circle cx="35" cy="18" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="35" cy="31" r="2.6" fill="currentColor" stroke="none" />
      <path d="M35 20.5 V28.5" strokeWidth="1.3" />
    </svg>
  )
}
