'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { site } from '@/config/site'
import { Link } from '@/i18n/routing'
import { Parallax } from '@/components/fx/Effects'
import { ExtLink } from './HomeBits'

interface Fact {
  k: string
  v: string
}

// 双站共享 hero:文案取 home.hero.<variant>.*,图与 CTA 目标取 site 配置
export function Hero() {
  const t = useTranslations('home')
  const ns = `hero.${site.variant}` as const
  const scriptureLines = t.raw(`${ns}.scriptureLines`) as string[]
  const facts = t.raw(`${ns}.facts`) as Fact[]

  return (
    <section className="manuscript-hero relative">
      <MeshField />
      <div className="container relative z-10 mx-auto px-4 py-20 md:py-28 lg:py-32">
        <div className="grid items-center gap-14 md:grid-cols-[0.92fr_1.08fr] lg:gap-20">
          <div className="hero-copy">
            <p className="kicker mb-4 hero-in hero-in-1">{t(`${ns}.kicker`)}</p>
            <h1 className="hero-title display-xl font-display font-bold mb-6 hero-in hero-in-2">
              <span>{t(`${ns}.title`)}</span>
            </h1>
            <p className="hero-deck text-lg text-text-secondary leading-relaxed mb-8 max-w-xl hero-in hero-in-3">
              {t(`${ns}.subtitle`)}
            </p>
            <div className="flex flex-wrap gap-3 hero-in hero-in-4">
              <Link href={site.home.heroPrimaryHref} className="seal-button">
                {t(`${ns}.ctaPrimary`)}
              </Link>
              <Link href={site.home.heroSecondaryHref} className="ink-button">
                {t(`${ns}.ctaSecondary`)}
              </Link>
            </div>
          </div>

          {/* 透明边缘的经文式品牌羊皮纸 */}
          <div className="hero-art-shell relative hero-in hero-in-3">
            <Parallax speed={0.07}>
              <div className="hero-parchment float-slow">
                <Image
                  src={site.heroArt.src}
                  alt={t(`${ns}.artAlt`)}
                  width={site.heroArt.width}
                  height={site.heroArt.height}
                  priority
                  sizes="(min-width: 768px) 46vw, 100vw"
                  className="w-full h-auto"
                />
                <div className="scripture-ticker">
                  <span className="sr-only">{scriptureLines.join(' ')}</span>
                  <div className="scripture-ticker__track" aria-hidden="true">
                    {[...scriptureLines, scriptureLines[0]].map((line, index) => (
                      <span className="scripture-ticker__line" key={`${index}-${line}`}>
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Parallax>
          </div>
        </div>

        <FactsBar label={t(`${ns}.factsLabel`)} facts={facts} />
      </div>
    </section>
  )
}

// 事实条:四个 k/v,mono 小字,羊皮纸底;存储站最后一项(结算链)链到 explorer
function FactsBar({ label, facts }: { label: string; facts: Fact[] }) {
  const linkedIndex = site.variant === 'palimesh' ? facts.length - 1 : -1
  return (
    <div className="hero-in hero-in-4 mt-14 md:mt-20">
      <div className="vellum-card px-5 py-4 md:px-7 md:py-5">
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:gap-8 md:items-center">
          <span className="kicker text-[10px] tracking-[0.28em]">{label}</span>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            {facts.map((f, i) => (
              <div
                key={f.k}
                className={`min-w-0 ${i > 0 ? 'md:border-l md:border-dashed md:border-[#d8c9a8] md:pl-6' : ''}`}
              >
                <dt className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-1">{f.k}</dt>
                <dd className="font-mono text-xs text-text-primary break-words">
                  {i === linkedIndex ? (
                    <ExtLink
                      href={site.chain.explorer}
                      className="hover:text-accent-blue underline decoration-dotted underline-offset-4"
                    >
                      {f.v} ↗
                    </ExtLink>
                  ) : (
                    f.v
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

function MeshField() {
  return (
    <svg
      className="mesh-field"
      aria-hidden="true"
      viewBox="0 0 1400 760"
      preserveAspectRatio="xMidYMid slice"
    >
      <g className="mesh-lines">
        <path d="M70 185 248 92 416 192 594 75 780 168 956 88 1150 185 1335 104" />
        <path d="M70 185 180 370 416 192 510 390 780 168 860 382 1150 185 1240 390" />
        <path d="M180 370 342 620 510 390 690 605 860 382 1042 615 1240 390" />
        <path d="M248 92 180 370M594 75 510 390M956 88 860 382M1335 104 1240 390" />
      </g>
      <g className="mesh-nodes">
        {[['70','185'],['248','92'],['416','192'],['594','75'],['780','168'],['956','88'],['1150','185'],['1335','104'],['180','370'],['510','390'],['860','382'],['1240','390'],['342','620'],['690','605'],['1042','615']].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" />
        ))}
      </g>
    </svg>
  )
}
