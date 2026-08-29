import { JsonRpcProvider } from 'ethers'

// Default Palimesh R3.2 testnet (88780). 18780 was decommissioned 2026-05-12.
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '88780')

// Browser / client bundle: NEXT_PUBLIC_* only. Server: PALI_RPC_URL for SSR (same chain as Explorer).
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:28780'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:28790'

export const SERVER_RPC_URL = process.env.PALI_RPC_URL || RPC_URL

/** Server-side JSON-RPC uses PALI_RPC_URL; client uses NEXT_PUBLIC_RPC_URL (falls back when Palimesh is unset). */
export function getEffectiveRpcUrl(): string {
  return typeof window === 'undefined' ? SERVER_RPC_URL : RPC_URL
}

export const provider = new JsonRpcProvider(SERVER_RPC_URL, {
  chainId: CHAIN_ID,
  name: 'Palimesh',
})

export function formatHash(hash: string, start = 6, end = 4): string {
  if (!hash || hash.length < start + end) return hash
  return `${hash.slice(0, start + 2)}...${hash.slice(-end)}`
}

export function formatAddress(address: string): string {
  return formatHash(address, 6, 4)
}

export function formatTimestamp(ts: number, locale?: string): string {
  const date = new Date(ts * 1000)
  const now = Date.now()
  const diff = now - date.getTime()

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  if (diff < 60000) return rtf.format(-Math.floor(diff / 1000), 'second')
  if (diff < 3600000) return rtf.format(-Math.floor(diff / 60000), 'minute')
  if (diff < 86400000) return rtf.format(-Math.floor(diff / 3600000), 'hour')

  return date.toLocaleString(locale)
}

export function formatValue(value: bigint | string | number, decimals = 18): string {
  const val = typeof value === 'bigint' ? value : BigInt(value)
  const divisor = BigInt(10 ** decimals)
  const quotient = val / divisor
  const remainder = val % divisor

  if (remainder === 0n) return quotient.toString()

  const remainderStr = remainder.toString().padStart(decimals, '0')
  const trimmed = remainderStr.replace(/0+$/, '')
  return `${quotient}.${trimmed}`
}
