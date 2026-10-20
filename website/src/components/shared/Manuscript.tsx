// 全站统一的手稿风版式原语:章节分隔线、章节标题、hero 小图
import type { ReactNode } from 'react'

// 章节之间的古董分隔线(双墨线 + 中心菱形印记)
export function AntiqueDivider() {
  return (
    <div className="antique-divider" aria-hidden="true">
      <span />
    </div>
  )
}

// 居中章节标题(kicker + h2 + 小花饰 + subtitle)
export function SectionHead({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle: string
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      <p className="kicker mb-3">{kicker}</p>
      <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{title}</h2>
      <div className="section-flourish" aria-hidden="true">
        <span />
        <i />
        <span />
      </div>
      <p className="text-text-secondary leading-relaxed">{subtitle}</p>
    </div>
  )
}

// 子页 hero:羊皮纸底 + kicker + 标题 + 副题 + 主题墨线小图(mark)
export function PageHero({
  kicker,
  title,
  subtitle,
  mark,
  children,
}: {
  kicker: string
  title: string
  subtitle?: string
  mark?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="manuscript-hero manuscript-hero--compact relative">
      <div className="container relative z-10 mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          {mark && <div className="page-hero-mark mx-auto mb-5 text-accent-purple/80">{mark}</div>}
          <p className="kicker mb-4">{kicker}</p>
          <h1 className="display-xl font-display font-bold mb-5">
            <span className="ink-underline">{title}</span>
          </h1>
          {subtitle && <p className="text-lg text-text-secondary leading-relaxed">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}
