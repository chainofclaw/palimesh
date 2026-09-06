'use client'

import type { ReactNode } from 'react'

// 首页共用的小构件:支柱卡、外链、章节 CTA

export function PillarCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="sheet-stack">
      <div className="sheet sheet-hover folio-card p-7 h-full">
        <div className="font-mono text-xs text-accent-blue mb-4">{index}</div>
        <h3 className="font-display font-semibold text-xl mb-3">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// 跨站 / 站外链接:新标签打开
export function ExtLink({ href, className = '', children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}

// 「另一站可见」提示行:mono 小字 + 外链
export function ElsewhereNote({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="text-center font-mono text-[11px] text-text-muted">
      <ExtLink href={href} className="hover:text-accent-blue underline decoration-dotted underline-offset-4">
        {children} ↗
      </ExtLink>
    </p>
  )
}
