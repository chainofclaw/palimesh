'use client'

import { useEffect, useState } from 'react'
import { site } from '@/config/site'
import { rpcCall } from '@/lib/rpc'
import { ExtLink } from './HomeBits'

const POLL_MS = 15_000
const EMPTY = '—'

interface MeshNetworkStats {
  dht?: { enabled?: boolean; nodes?: number }
  wire?: { enabled?: boolean; peers?: number }
}

interface Reading {
  height: string
  dht: string
  wire: string
}

const INITIAL: Reading = { height: EMPTY, dht: EMPTY, wire: EMPTY }

function fmt(n: number | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : EMPTY
}

async function readChain(): Promise<Reading> {
  const [heightHex, net] = await Promise.all([
    rpcCall<string>('eth_blockNumber').catch(() => null),
    rpcCall<MeshNetworkStats>('pali_getNetworkStats').catch(() => null),
  ])
  const height = heightHex ? Number.parseInt(heightHex, 16) : Number.NaN
  return {
    height: Number.isFinite(height) ? height.toLocaleString() : EMPTY,
    dht: fmt(net?.dht?.nodes),
    wire: fmt(net?.wire?.peers),
  }
}

export interface SettlementLabels {
  chain: string
  height: string
  dht: string
  wire: string
}

// 存储站「结算」四指标:结算链 / 当前高度 / DHT 节点 / Wire 连接,15s 轮询,失败静默
export function SettlementStats({ labels }: { labels: SettlementLabels }) {
  const [reading, setReading] = useState<Reading>(INITIAL)

  useEffect(() => {
    let mounted = true
    const tick = async () => {
      const next = await readChain()
      if (mounted) setReading(next)
    }
    void tick()
    const timer = setInterval(() => void tick(), POLL_MS)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const chainLabel = `${site.chain.name} ${site.chain.id}`
  const cards: { key: keyof SettlementLabels; value: string; href?: string }[] = [
    { key: 'chain', value: chainLabel, href: site.chain.explorer },
    { key: 'height', value: reading.height },
    { key: 'dht', value: reading.dht },
    { key: 'wire', value: reading.wire },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {cards.map((c) => (
        <div key={c.key} className="sheet sheet-hover folio-card p-5 md:p-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-3">{labels[c.key]}</div>
          <div className="font-display font-semibold text-xl md:text-2xl text-text-primary break-words">
            {c.href ? (
              <ExtLink href={c.href} className="hover:text-accent-blue">
                {c.value}
              </ExtLink>
            ) : (
              c.value
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
