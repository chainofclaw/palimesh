'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'

type MenuItem = { href: string; label: string }

export function MobileMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-primary hover:bg-accent-blue/5 hover:text-accent-blue transition-colors"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav
            id="mobile-navigation"
            className="mobile-scroll-menu fixed top-[68px] left-3 right-3 z-50 py-4 px-4 space-y-1 shadow-xl"
            aria-label="Mobile navigation"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block min-h-11 px-4 py-3 rounded-md text-text-secondary hover:text-accent-blue hover:bg-accent-blue/5 font-body text-base transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  )
}
