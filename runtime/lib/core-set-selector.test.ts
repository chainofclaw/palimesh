import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  selectCoreSet,
  scoreCandidates,
  DEFAULT_CORE_SET_CONFIG,
  type CoreCandidate,
  type CoreSetConfig,
} from "./core-set-selector.ts"

function cand(hexByte: string, stake: bigint, bond: bigint, reward: bigint): CoreCandidate {
  const nodeId = `0x${hexByte.repeat(32)}`
  return { nodeId, address: `0x${hexByte.repeat(20)}`, stake, bond, rewardAmount: reward }
}

const CFG: CoreSetConfig = { ...DEFAULT_CORE_SET_CONFIG, minCore: 4, maxCore: 5, topN: 4 }

// Six candidates with clearly separated composite scores (a > b > c > d > e > f).
function makeSix(): CoreCandidate[] {
  return [
    cand("aa", 100n, 100n, 100n),
    cand("bb", 90n, 90n, 90n),
    cand("cc", 80n, 80n, 80n),
    cand("dd", 70n, 70n, 70n),
    cand("ee", 60n, 60n, 60n),
    cand("ff", 50n, 50n, 50n),
  ]
}

function shuffle<T>(arr: readonly T[], seed: number): T[] {
  // Deterministic Fisher-Yates using a simple LCG so runs are reproducible.
  const out = [...arr]
  let s = seed >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

describe("core-set-selector", () => {
  it("is deterministic across input orderings (same core + ranking)", () => {
    const base = selectCoreSet(makeSix(), CFG)
    for (let seed = 1; seed <= 8; seed++) {
      const r = selectCoreSet(shuffle(makeSix(), seed), CFG)
      assert.deepEqual(r.core, base.core, `core differs for seed ${seed}`)
      assert.deepEqual(
        r.ranking.map((e) => e.address),
        base.ranking.map((e) => e.address),
        `ranking differs for seed ${seed}`,
      )
    }
  })

  it("selects the top-k by composite score, ranked best-first", () => {
    const r = selectCoreSet(makeSix(), CFG)
    assert.equal(r.usable, true)
    assert.equal(r.core.length, 4) // topN=4 within [minCore 4, maxCore 5]
    assert.deepEqual(r.core, [
      `0x${"aa".repeat(20)}`,
      `0x${"bb".repeat(20)}`,
      `0x${"cc".repeat(20)}`,
      `0x${"dd".repeat(20)}`,
    ])
  })

  it("breaks score ties by nodeId ascending", () => {
    // Two nodes with identical stake/bond/reward → identical score → nodeId order.
    const tied: CoreCandidate[] = [
      cand("ff", 100n, 100n, 100n),
      cand("aa", 100n, 100n, 100n),
      cand("cc", 100n, 100n, 100n),
      cand("bb", 100n, 100n, 100n),
    ]
    const r = selectCoreSet(tied, { ...CFG, minCore: 4, maxCore: 4, topN: 4 })
    assert.deepEqual(
      r.ranking.map((e) => e.nodeId),
      [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`, `0x${"cc".repeat(32)}`, `0x${"ff".repeat(32)}`],
    )
  })

  it("clamps topN into [minCore, maxCore]", () => {
    const six = makeSix()
    // topN below floor → clamps up to minCore
    assert.equal(selectCoreSet(six, { ...CFG, minCore: 4, maxCore: 6, topN: 1 }).core.length, 4)
    // topN above cap → clamps down to maxCore
    assert.equal(selectCoreSet(six, { ...CFG, minCore: 4, maxCore: 5, topN: 99 }).core.length, 5)
    // topN within window → honored
    assert.equal(selectCoreSet(six, { ...CFG, minCore: 4, maxCore: 6, topN: 5 }).core.length, 5)
  })

  it("caps k at the candidate count", () => {
    const four = makeSix().slice(0, 4)
    const r = selectCoreSet(four, { ...CFG, minCore: 4, maxCore: 10, topN: 8 })
    assert.equal(r.core.length, 4)
    assert.equal(r.usable, true)
  })

  it("returns usable:false when fewer than minCore candidates (never shrinks below floor)", () => {
    const three = makeSix().slice(0, 3)
    const r = selectCoreSet(three, CFG)
    assert.equal(r.usable, false)
    assert.equal(r.core.length, 0)
    assert.match(r.reason, /below-floor/)
    // ranking is still emitted for observability
    assert.equal(r.ranking.length, 3)
  })

  it("handles zero totals (all stake/bond/reward = 0) without dividing by zero", () => {
    const zeros: CoreCandidate[] = [
      cand("aa", 0n, 0n, 0n),
      cand("bb", 0n, 0n, 0n),
      cand("cc", 0n, 0n, 0n),
      cand("dd", 0n, 0n, 0n),
    ]
    const r = selectCoreSet(zeros, { ...CFG, minCore: 4, maxCore: 4, topN: 4 })
    assert.equal(r.usable, true)
    // All scores 0 → pure nodeId ordering.
    assert.deepEqual(r.core, [
      `0x${"aa".repeat(20)}`,
      `0x${"bb".repeat(20)}`,
      `0x${"cc".repeat(20)}`,
      `0x${"dd".repeat(20)}`,
    ])
  })

  it("drops the perf component uniformly when rewards are all zero (stake+bond only)", () => {
    // Node cc has the highest stake+bond but zero reward everywhere → still ranks
    // by stake+bond since perf normalizes to 0 for all.
    const c = [
      cand("aa", 10n, 10n, 0n),
      cand("bb", 20n, 20n, 0n),
      cand("cc", 90n, 90n, 0n),
      cand("dd", 30n, 30n, 0n),
    ]
    const r = selectCoreSet(c, { ...CFG, minCore: 4, maxCore: 4, topN: 4 })
    assert.equal(r.ranking[0].nodeId, `0x${"cc".repeat(32)}`)
    assert.equal(r.ranking[0].components.perf, 0n)
  })

  it("handles a single candidate at minCore=1", () => {
    const one = [cand("aa", 5n, 5n, 5n)]
    const r = selectCoreSet(one, { ...CFG, minCore: 1, maxCore: 4, topN: 4 })
    assert.equal(r.usable, true)
    assert.deepEqual(r.core, [`0x${"aa".repeat(20)}`])
  })

  it("scoreCandidates does not mutate its input", () => {
    const input = makeSix()
    const snapshot = input.map((c) => ({ ...c }))
    scoreCandidates(input, CFG)
    assert.deepEqual(input, snapshot)
  })

  it("selected core set preserves a valid 2/3 stake-weighted quorum (>= minCore members)", () => {
    // With equal-ish stakes among the core, a 2/3 quorum needs a real majority
    // and is satisfiable — i.e. the set is never reduced below minCore.
    const r = selectCoreSet(makeSix(), CFG)
    assert.ok(r.core.length >= CFG.minCore)
  })
})
