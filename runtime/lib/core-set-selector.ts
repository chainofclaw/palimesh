/**
 * Core-set selector — deterministic node ranking for the two-tier
 * (core / non-core) validator model.
 *
 * A "core" node ranks high enough by composite score to sit in the BFT
 * consensus set (proposes + votes on blocks). A "non-core" node is simply
 * absent from the selected set: it keeps participating in PoSe (witness /
 * settlement) but carries zero BFT quorum weight and is never a proposer.
 *
 * This module is a PURE FUNCTION: no I/O, no clock, no consensus imports. All
 * math is BigInt so that every node, given byte-identical candidate inputs,
 * derives a byte-identical core set — the invariant that keeps the BFT set
 * from splitting across the network. Determinism is enforced two ways:
 *   1. all arithmetic is integer (BigInt), no floats;
 *   2. the selection defensively sorts its own copy of the input, so a caller
 *      passing candidates in a different order still gets the same result.
 *
 * The composite score blends three inputs, each normalized to `scoreDenom`
 * and weighted (weights are basis points, conventionally summing to 10000):
 *   - stake: BFT stake from ValidatorRegistry (Sybil cost, quorum weight)
 *   - bond:  PoSe bond from PoSeManagerV2 (skin-in-the-game)
 *   - perf:  per-epoch PoSe reward amount, which already encodes the
 *            uptime/storage/relay quality split from services/verifier/scoring.ts
 */

export type Hex = `0x${string}`

/** One ranking candidate. `address` is the lowercase BFT id (0x + nodeId[-40:]). */
export interface CoreCandidate {
  nodeId: string
  address: string
  stake: bigint
  bond: bigint
  /** Per-epoch PoSe reward as the performance proxy; 0 when unavailable. */
  rewardAmount: bigint
}

export interface CoreSetConfig {
  /** Hard floor on core-set size (>= 4, tied to consensus PR1A_MIN_VALIDATORS). */
  minCore: number
  /** Upper cap on core-set size. */
  maxCore: number
  /** Desired target size before clamping into [minCore, maxCore]. */
  topN: number
  /** Weight (basis points) of the normalized stake component. */
  wStake: bigint
  /** Weight (basis points) of the normalized bond component. */
  wBond: bigint
  /** Weight (basis points) of the normalized performance component. */
  wPerf: bigint
  /** Normalization scale for each component, e.g. 1_000_000_000n. */
  scoreDenom: bigint
}

export interface CoreScoreComponents {
  stake: bigint
  bond: bigint
  perf: bigint
}

export interface CoreRankingEntry {
  nodeId: string
  address: string
  score: bigint
  components: CoreScoreComponents
}

export interface CoreSetResult {
  /** Selected core addresses (lowercase), ranked best-first. Empty if !usable. */
  core: string[]
  /** Full ranking (all candidates), best-first — emitted even when !usable. */
  ranking: CoreRankingEntry[]
  /** True when a core set was selected; false means caller keeps the prior set. */
  usable: boolean
  /** Human-readable explanation (selection reason or fallback cause). */
  reason: string
}

export const DEFAULT_CORE_SET_CONFIG: CoreSetConfig = {
  minCore: 4,
  maxCore: 21,
  topN: 21,
  wStake: 5000n,
  wBond: 2000n,
  wPerf: 3000n,
  scoreDenom: 1_000_000_000n,
}

/** Normalize a value against a set total, scaled to `denom`. 0 when total is 0. */
function normalize(value: bigint, total: bigint, denom: bigint): bigint {
  if (total <= 0n || value <= 0n) return 0n
  return (value * denom) / total
}

/**
 * Compute the composite score for every candidate. Pure; does not mutate input.
 * Score = wStake*nStake + wBond*nBond + wPerf*nPerf (weights are bps; the common
 * /10000 is omitted because the ranking is relative and it preserves precision).
 */
export function scoreCandidates(
  candidates: readonly CoreCandidate[],
  cfg: CoreSetConfig,
): CoreRankingEntry[] {
  const totalStake = candidates.reduce((acc, c) => acc + (c.stake > 0n ? c.stake : 0n), 0n)
  const totalBond = candidates.reduce((acc, c) => acc + (c.bond > 0n ? c.bond : 0n), 0n)
  const totalPerf = candidates.reduce((acc, c) => acc + (c.rewardAmount > 0n ? c.rewardAmount : 0n), 0n)

  return candidates.map((c) => {
    const nStake = normalize(c.stake, totalStake, cfg.scoreDenom)
    const nBond = normalize(c.bond, totalBond, cfg.scoreDenom)
    const nPerf = normalize(c.rewardAmount, totalPerf, cfg.scoreDenom)
    const score = cfg.wStake * nStake + cfg.wBond * nBond + cfg.wPerf * nPerf
    return {
      nodeId: c.nodeId,
      address: c.address,
      score,
      components: { stake: nStake, bond: nBond, perf: nPerf },
    }
  })
}

/**
 * Total order: score descending, then nodeId ascending (lexicographic hex).
 * The nodeId tie-break makes the order unambiguous and matches the deterministic
 * nodeId ordering used elsewhere (ValidatorRegistryReader.getActiveSet).
 */
function compareRanking(a: CoreRankingEntry, b: CoreRankingEntry): number {
  if (a.score > b.score) return -1
  if (a.score < b.score) return 1
  return a.nodeId.localeCompare(b.nodeId)
}

/**
 * Rank candidates and pick the hybrid Top-N-with-floor core set.
 *
 * Rules:
 *   - k = clamp(topN, minCore, maxCore), then k = min(k, candidateCount).
 *   - If candidateCount < minCore → usable:false (caller keeps prior/static set;
 *     never shrink below minCore, which would break PR1A and the 2/3 quorum).
 *   - Otherwise core = the top-k addresses in ranked order.
 *
 * Defensive: sorts a copy of the input, so caller ordering does not affect output.
 */
export function selectCoreSet(
  candidates: readonly CoreCandidate[],
  cfg: CoreSetConfig = DEFAULT_CORE_SET_CONFIG,
): CoreSetResult {
  const ranking = scoreCandidates(candidates, cfg).sort(compareRanking)

  if (candidates.length < cfg.minCore) {
    return {
      core: [],
      ranking,
      usable: false,
      reason: `below-floor: ${candidates.length} candidates < minCore ${cfg.minCore}`,
    }
  }

  // Guard a misconfigured window where maxCore < minCore.
  const upper = cfg.maxCore < cfg.minCore ? cfg.minCore : cfg.maxCore
  const target = cfg.topN < cfg.minCore ? cfg.minCore : cfg.topN > upper ? upper : cfg.topN
  const k = target > candidates.length ? candidates.length : target

  return {
    core: ranking.slice(0, k).map((r) => r.address),
    ranking,
    usable: true,
    reason: `selected top-${k} of ${candidates.length} (minCore=${cfg.minCore}, maxCore=${upper})`,
  }
}
