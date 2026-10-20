'use client'

import { useEffect, useRef, useState } from 'react'

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 轻视差:仅 transform,rAF 节流,reduced-motion 直接静止
export function Parallax({ children, speed = 0.12, className = '' }: { children: React.ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900)
        el.style.transform = `translate3d(0, ${(-y * speed).toFixed(1)}px, 0)`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [speed])
  return <div ref={ref} className={`will-change-transform ${className}`}>{children}</div>
}

// 墨线描绘:进入视口后给子 SVG 加 .ink-draw(CSS 负责 dash 动画);SSR 默认完整可见
export function InkDraw({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'static' | 'armed' | 'drawing'>('static')
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) return
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.9) return
    setState('armed')
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setState('drawing'); io.disconnect() }
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`${className} ${state === 'armed' ? 'ink-armed' : state === 'drawing' ? 'ink-draw' : ''}`}>
      {children}
    </div>
  )
}
