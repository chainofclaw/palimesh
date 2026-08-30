'use client'

import { useEffect, useRef, useState } from 'react'

// 渐进增强的滚动显现:
// - SSR / 无 JS / hydration 前:内容完全可见(绝不以隐藏态发货)
// - 挂载后:仅当元素在视口下方且未开启 reduced-motion 时,才隐藏并观察显现
type RevealState = 'static' | 'hidden' | 'shown'

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<RevealState>('static')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // 已在首屏(或接近)的内容保持可见,不做入场动画
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) return

    setState('hidden')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const cls =
    state === 'hidden'
      ? 'opacity-0 translate-y-4'
      : state === 'shown'
        ? 'opacity-100 translate-y-0'
        : ''

  return (
    <div
      ref={ref}
      className={`${className} transition-[opacity,transform] duration-300 ease-out ${cls}`}
      style={delay && state !== 'static' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

// 页面顶部阅读进度条(带淡色轨道,滚动即见)。
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement
        const max = h.scrollHeight - h.clientHeight
        setProgress(max > 0 ? h.scrollTop / max : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-line/60" aria-hidden>
      <div
        className="h-full origin-left bg-gradient-to-r from-accent-purple via-accent-blue to-accent-cyan transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}
