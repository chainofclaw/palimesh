/**
 * Classifier for transient network errors that may escape to the process
 * level. Node's http client can emit a late socket 'error' (e.g. ECONNRESET
 * arriving after ethers' own timeout already settled the request promise)
 * with no listener attached — no application try/catch can reach it, and the
 * default handler kills the process (observed 2026-09-06: relayer died mid
 * network flap). The process-level guard uses this classifier to swallow
 * ONLY well-known transient network failures; everything else still fails
 * fast so real bugs are never masked.
 */

const TRANSIENT_CODES = new Set([
  // Node.js socket / DNS error codes
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENETDOWN",
  "ENETRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
  // ethers v6 wrapper codes for network-layer failures
  "TIMEOUT",
  "NETWORK_ERROR",
])

const TRANSIENT_MESSAGE = /socket hang up|socket disconnected|other side closed|network socket/i

const MAX_CAUSE_DEPTH = 4

/**
 * True when the value is a known-transient network error (by code, message,
 * or a nested cause/error chain up to MAX_CAUSE_DEPTH). Conservative by
 * design: anything unrecognized is NOT transient.
 */
export function isTransientNetError(err: unknown, depth = 0): boolean {
  if (depth > MAX_CAUSE_DEPTH || err === null || typeof err !== "object") return false
  const e = err as { code?: unknown; message?: unknown; cause?: unknown; error?: unknown }
  if (typeof e.code === "string" && TRANSIENT_CODES.has(e.code)) return true
  if (typeof e.message === "string" && TRANSIENT_MESSAGE.test(e.message)) return true
  return isTransientNetError(e.cause, depth + 1) || isTransientNetError(e.error, depth + 1)
}
