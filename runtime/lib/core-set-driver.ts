/**
 * Core-set driver — applies the ranked core set to the BFT validator set at
 * epoch boundaries, reusing the existing consensus.onValidatorSetChange path.
 *
 * Flow each boundary (a new finalized epoch appears):
 *   1. build candidates for the target (lagged, finalized) epoch via CoreSetReader
 *   2. rank + pick hybrid Top-N-with-floor via selectCoreSet
 *   3. log the full ranking + chosen set (always — shadow and enforce)
 *   4. if usable and NOT shadow → consensus.onValidatorSetChange(next)
 *      (non-core nodes are simply absent → 0 quorum weight, never proposer;
 *       their PoSe participation is untouched)
 *
 * Split-safety: every node targets the SAME lagged finalized epoch and reads the
 * SAME on-chain-anchored inputs, so every node computes a byte-identical set.
 * The set is applied through updateValidators, which force-clears BFT round
 * state + the vote ledger on membership churn — the documented mitigation for
 * the self-equivocation deadlock this network has hit on set changes. Applying
 * only at the (lagged, stable) epoch boundary keeps the clear between rounds.
 * (Phase 2 moves the canonical set on-chain so nodes READ instead of recompute,
 *  removing any residual recompute-divergence risk.)
 */

import { selectCoreSet, type CoreCandidate, type CoreSetConfig } from "./core-set-selector.ts"
import type { CoreSetReader } from "./core-set-reader.ts"

export interface CoreSetDriverLogger {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
}

export interface CoreSetDriverOptions {
  enabled: boolean
  shadow: boolean
  minCore: number
  maxCore: number
  topN: number
  weightStakeBps: number
  weightBondBps: number
  weightPerfBps: number
  lagEpochs: number
  /** Normalization scale for the composite score; defaults to 1e9. */
  scoreDenom?: bigint
  /** How often to check for a new epoch boundary (ms). Defaults to 15000. */
  pollIntervalMs?: number
  /**
   * Restart safety (2026-08-31 B2 incident, default TRUE): when enforcing,
   * skip the first target epoch seen after startup and only apply from the
   * NEXT epoch boundary on. An immediate post-restart apply races the BFT
   * round already in flight on the pre-restart set: the rotation change
   * mints a second legitimate proposer for the same height, the #780 vote
   * ledger pins each node to whichever block it prepared first, and quorum
   * never forms (observed chain stall, ~8 min, rolled back). Deferring makes
   * every node switch at the same on-chain instant, minutes away from any
   * restart turbulence. No effect in shadow mode (shadow never applies).
   */
  deferFirstApply?: boolean
}

export interface CoreSetDriverDeps {
  reader: CoreSetReader
  /** consensus.onValidatorSetChange — the existing BFT set apply path. */
  applySet: (validators: Array<{ id: string; stake: bigint }>) => void
  /** Wall-clock epoch id (epoch-utils.currentEpochId); floor(now/3600000). */
  currentEpoch: () => number
  log: CoreSetDriverLogger
  /**
   * Phase 2 (on-chain canonical): when provided, the driver READS the finalized
   * core set for the target epoch from CoreSetManager instead of recomputing it
   * locally — every node applies the identical stored set, removing the
   * recompute-divergence risk. Returns the ranked set ({id,stake}), or null when
   * the epoch is not finalized on-chain yet (driver keeps the current set).
   */
  getCanonicalCoreSet?: (epoch: number) => Promise<Array<{ id: string; stake: bigint }> | null>
}

export class CoreSetDriver {
  private readonly deps: CoreSetDriverDeps
  private readonly opts: CoreSetDriverOptions
  private readonly cfg: CoreSetConfig
  private lastHandledEpoch = -1
  // First target epoch seen after startup (deferFirstApply); null = not yet seen.
  private deferredStartupEpoch: number | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private ticking = false

  constructor(deps: CoreSetDriverDeps, opts: CoreSetDriverOptions) {
    this.deps = deps
    this.opts = opts
    this.cfg = {
      minCore: opts.minCore,
      maxCore: opts.maxCore,
      topN: opts.topN,
      wStake: BigInt(opts.weightStakeBps),
      wBond: BigInt(opts.weightBondBps),
      wPerf: BigInt(opts.weightPerfBps),
      scoreDenom: opts.scoreDenom ?? 1_000_000_000n,
    }
  }

  start(): void {
    if (!this.opts.enabled) return
    const interval = this.opts.pollIntervalMs ?? 15_000
    this.deps.log.info("core-set driver started", {
      shadow: this.opts.shadow,
      minCore: this.opts.minCore,
      maxCore: this.opts.maxCore,
      topN: this.opts.topN,
      lagEpochs: this.opts.lagEpochs,
    })
    // Fire once immediately, then poll for the next epoch boundary.
    void this.tick()
    this.timer = setInterval(() => void this.tick(), interval)
    if (typeof this.timer === "object" && this.timer && "unref" in this.timer) {
      ;(this.timer as { unref: () => void }).unref()
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * One evaluation. Idempotent per epoch: acts at most once per target epoch.
   * Exposed (not just interval-driven) so tests can drive it deterministically.
   */
  async tick(): Promise<void> {
    if (!this.opts.enabled || this.ticking) return
    this.ticking = true
    try {
      const targetEpoch = this.deps.currentEpoch() - this.opts.lagEpochs
      if (targetEpoch <= 0 || targetEpoch <= this.lastHandledEpoch) return

      // Restart safety: in enforce mode, observe the first target epoch and
      // only start applying from the next boundary (see deferFirstApply doc).
      if (
        this.opts.deferFirstApply !== false
        && !this.opts.shadow
        && this.deferredStartupEpoch === null
      ) {
        this.deferredStartupEpoch = targetEpoch
        this.lastHandledEpoch = targetEpoch
        this.deps.log.info(
          "core-set: deferring first apply to the next epoch boundary (restart safety)",
          { epoch: targetEpoch },
        )
        return
      }

      // Phase 2 — on-chain canonical mode: read the finalized set, don't recompute.
      if (this.deps.getCanonicalCoreSet) {
        let next: Array<{ id: string; stake: bigint }> | null
        try {
          next = await this.deps.getCanonicalCoreSet(targetEpoch)
        } catch (err) {
          this.deps.log.warn("core-set: on-chain read failed; keeping current set", {
            epoch: targetEpoch,
            error: String(err),
          })
          return
        }
        if (!next || next.length === 0) {
          // Not finalized on-chain yet — keep current set, retry next tick.
          this.deps.log.info("core-set (on-chain): epoch not finalized yet; keeping current set", {
            epoch: targetEpoch,
          })
          return
        }
        this.lastHandledEpoch = targetEpoch
        this.deps.log.info("core-set (on-chain) read", {
          epoch: targetEpoch,
          shadow: this.opts.shadow,
          size: next.length,
          ids: next.map((n) => n.id),
        })
        if (this.opts.shadow) {
          this.deps.log.info("core-set: SHADOW mode — not applying (on-chain set logged above)", {
            epoch: targetEpoch,
          })
          return
        }
        this.deps.applySet(next)
        this.deps.log.info("core-set: applied to BFT set (on-chain)", { epoch: targetEpoch, size: next.length })
        return
      }

      let candidates: CoreCandidate[]
      try {
        candidates = await this.deps.reader.buildCandidates(targetEpoch)
      } catch (err) {
        this.deps.log.warn("core-set: buildCandidates failed; keeping current set", {
          epoch: targetEpoch,
          error: String(err),
        })
        return
      }

      const result = selectCoreSet(candidates, this.cfg)
      this.deps.log.info("core-set computed", {
        epoch: targetEpoch,
        shadow: this.opts.shadow,
        usable: result.usable,
        reason: result.reason,
        candidateCount: candidates.length,
        core: result.core,
        ranking: result.ranking.map((r) => ({ address: r.address, score: r.score.toString() })),
      })

      // Mark handled regardless of outcome so we don't reprocess this epoch.
      this.lastHandledEpoch = targetEpoch

      if (!result.usable) {
        this.deps.log.warn("core-set: not usable, keeping current set", {
          epoch: targetEpoch,
          reason: result.reason,
        })
        return
      }

      const stakeByAddr = new Map<string, bigint>()
      for (const c of candidates) stakeByAddr.set(c.address, c.stake)
      const next = result.core.map((addr) => ({ id: addr, stake: stakeByAddr.get(addr) ?? 0n }))

      if (this.opts.shadow) {
        this.deps.log.info("core-set: SHADOW mode — not applying (would-be set logged above)", {
          epoch: targetEpoch,
          size: next.length,
        })
        return
      }

      this.deps.applySet(next)
      this.deps.log.info("core-set: applied to BFT set", { epoch: targetEpoch, size: next.length, ids: next.map((n) => n.id) })
    } finally {
      this.ticking = false
    }
  }
}
