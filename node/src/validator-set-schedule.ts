/**
 * Height-segmented validator set schedule (epoch-fencing).
 *
 * Problem (observed 2026-09-06, val6): after a core-set rotation the current
 * validator set no longer contains demoted proposers, but a catch-up node
 * validates HISTORICAL blocks against the CURRENT set — blocks legitimately
 * proposed in an earlier era get "proposer not in validator set" and the node
 * wedges below the tip forever. The set must be looked up by block height.
 *
 * Each entry records "from this height on, this membership applied" for THIS
 * node. Entries are appended when the node applies a set change (core-set
 * driver → updateProposerSet) and seeded from the static config set at
 * startup. Heights below the first entry are an UNKNOWN era (history that
 * predates the schedule — e.g. a node that adopted this feature mid-chain, or
 * a freshly wiped node): membership cannot be checked there, so the caller
 * skips the proposer-membership check (block hash + proposer signature are
 * still verified, and adopted history is quorum-finalized peer state — the
 * same trust model snap-sync import has always used via skipProposerCheck).
 *
 * Boundary tolerance: apply heights differ slightly between nodes (each
 * records the tip it saw when IT applied), so membership at a height is the
 * union of the era covering the height and its immediate neighbours. This
 * absorbs cross-node apply skew of any size while still rejecting proposers
 * that were never members near that era.
 *
 * Persistence: one small JSON file in the node data dir, rewritten on each
 * change (set changes are rare — at most hourly). Corrupt or missing files
 * degrade to an empty schedule, never a crash.
 */

import { readFileSync, writeFileSync, renameSync } from "node:fs"

export interface ValidatorSetEra {
  fromHeight: bigint
  validators: string[]
}

interface PersistShape {
  version: 1
  entries: Array<{ fromHeight: string; validators: string[] }>
}

export class ValidatorSetSchedule {
  private entries: ValidatorSetEra[] = []
  private readonly filePath: string | null

  constructor(filePath: string | null = null) {
    this.filePath = filePath
  }

  /** Load from disk; a missing or corrupt file yields an empty schedule. */
  static load(filePath: string): ValidatorSetSchedule {
    const schedule = new ValidatorSetSchedule(filePath)
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8")) as PersistShape
      if (raw && raw.version === 1 && Array.isArray(raw.entries)) {
        schedule.entries = raw.entries
          .filter((e) => typeof e.fromHeight === "string" && Array.isArray(e.validators))
          .map((e) => ({
            fromHeight: BigInt(e.fromHeight),
            validators: e.validators.map((v) => String(v).toLowerCase()),
          }))
          .sort((a, b) => (a.fromHeight < b.fromHeight ? -1 : a.fromHeight > b.fromHeight ? 1 : 0))
      }
    } catch {
      /* fresh or corrupt — start empty */
    }
    return schedule
  }

  /** Number of recorded eras (observability / tests). */
  size(): number {
    return this.entries.length
  }

  /** Snapshot of all eras, ascending by fromHeight. */
  eras(): ValidatorSetEra[] {
    return this.entries.map((e) => ({ fromHeight: e.fromHeight, validators: [...e.validators] }))
  }

  /**
   * Record that `validators` took effect at `fromHeight`. No-ops when the
   * membership equals the latest recorded era (same-set re-applies and
   * restart seeding must not spam entries). An entry at an existing
   * fromHeight is replaced. Persists on every mutation.
   */
  record(fromHeight: bigint, validators: string[]): boolean {
    const normalized = [...new Set(validators.map((v) => v.toLowerCase()))].sort()
    if (normalized.length === 0) return false
    const latest = this.entries[this.entries.length - 1]
    if (latest && sameMembers(latest.validators, normalized)) return false

    const next = this.entries.filter((e) => e.fromHeight !== fromHeight)
    next.push({ fromHeight, validators: normalized })
    next.sort((a, b) => (a.fromHeight < b.fromHeight ? -1 : a.fromHeight > b.fromHeight ? 1 : 0))
    this.entries = next
    this.persist()
    return true
  }

  /**
   * Membership allowed at `height`: the era covering the height unioned with
   * its immediate neighbours (see boundary tolerance above). Returns null
   * when the height predates the first recorded era (unknown era — caller
   * must skip the membership check) or when the schedule is empty.
   */
  allowedAt(height: bigint): Set<string> | null {
    if (this.entries.length === 0) return null
    if (height < this.entries[0].fromHeight) return null
    let idx = 0
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].fromHeight <= height) idx = i
      else break
    }
    const allowed = new Set<string>()
    for (const entry of [this.entries[idx - 1], this.entries[idx], this.entries[idx + 1]]) {
      if (entry) for (const v of entry.validators) allowed.add(v)
    }
    return allowed
  }

  private persist(): void {
    if (!this.filePath) return
    try {
      const shape: PersistShape = {
        version: 1,
        entries: this.entries.map((e) => ({
          fromHeight: e.fromHeight.toString(),
          validators: [...e.validators],
        })),
      }
      const tmp = `${this.filePath}.tmp`
      writeFileSync(tmp, JSON.stringify(shape))
      renameSync(tmp, this.filePath)
    } catch {
      /* persistence is best-effort; in-memory schedule still protects this run */
    }
  }
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
