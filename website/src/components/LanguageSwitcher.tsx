'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { useState, useTransition } from 'react'

const languages = [
  { code: 'en', name: 'English', mark: 'EN' },
  { code: 'zh', name: '中文', mark: '中' },
  { code: 'es', name: 'Español', mark: 'ES' },
  { code: 'ja', name: '日本語', mark: '日' },
  { code: 'ko', name: '한국어', mark: '한' },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0]

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale })
      setIsOpen(false)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="language-seal group flex min-h-11 items-center gap-2 rounded-md px-2.5 py-2 transition-colors font-display"
        disabled={isPending}
        aria-label={`Language: ${currentLanguage.name}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-accent-blue/25 px-1 font-mono text-[10px] font-semibold text-accent-blue">
          {currentLanguage.mark}
        </span>
        <span className="hidden sm:inline text-sm text-text-secondary group-hover:text-accent-cyan transition-colors">
          {currentLanguage.name}
        </span>
        <svg
          className={`w-3 h-3 md:w-4 md:h-4 text-text-muted group-hover:text-accent-cyan transition-all ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-bg-elevated rounded-lg border border-line z-50 overflow-hidden" role="listbox">
            {languages.map((lang, index) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`group min-h-11 w-full flex items-center gap-3 px-4 py-3 hover:bg-accent-blue/10 transition-colors ${
                  lang.code === locale
                    ? 'bg-accent-blue/5 text-accent-blue border-l-2 border-accent-blue'
                    : 'text-text-secondary hover:text-text-primary border-l-2 border-transparent'
                } ${index === 0 ? 'rounded-t-xl' : ''} ${index === languages.length - 1 ? 'rounded-b-xl' : ''}`}
                role="option"
                aria-selected={lang.code === locale}
              >
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-line px-1 font-mono text-[10px] font-semibold text-accent-blue">
                  {lang.mark}
                </span>
                <span className="font-display font-medium text-sm flex-1 text-left">{lang.name}</span>
                {lang.code === locale && (
                  <svg className="w-5 h-5 text-accent-cyan" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
