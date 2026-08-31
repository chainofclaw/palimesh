import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { CoreSetDriver, type CoreSetDriverDeps, type CoreSetDriverOptions } from "./core-set-driver.ts"
import type { CoreSetReader } from "./core-set-reader.ts"
import type { CoreCandidate } from "./core-set-selector.ts"

function cand(b: string, stake: bigint): CoreCandidate {
  return { nodeId: `0x${b.repeat(32)}`, address: `0x${b.repeat(20)}`, stake, bond: stake, rewardAmount: stake }
}

const SIX = () => ["aa", "bb", "cc", "dd", "ee", "ff"].map((b, i) => cand(b, BigInt(100 - i * 10)))

function opts(over: Partial<CoreSetDriverOptions> = {}): CoreSetDriverOptions {
  return {
    enabled: true,
    shadow: false,
    minCore: 4,
    maxCore: 5,
    topN: 4,
    weightStakeBps: 5000,
    weightBondBps: 2000,
    weightPerfBps: 3000,
    lagEpochs: 3,
    // Most tests exercise pure selection/apply logic; the restart-safety
    // deferral has its own dedicated tests below.
    deferFirstApply: false,
    ...over,
  }
}

interface Harness {
  driver: CoreSetDriver
  applied: Array<Array<{ id: string; stake: bigint }>>
  setEpoch: (e: number) => void
}

function harness(o: CoreSetDriverOptions, candidates: () => CoreCandidate[]): Harness {
  const applied: Array<Array<{ id: string; stake: bigint }>> = []
  let epoch = 10
  const reader = { buildCandidates: async () => candidates() } as unknown as CoreSetReader
  const deps: CoreSetDriverDeps = {
    reader,
    applySet: (v) => applied.push(v),
    currentEpoch: () => epoch,
    log: { info: () => {}, warn: () => {} },
  }
  return { driver: new CoreSetDriver(deps, o), applied, setEpoch: (e) => (epoch = e) }
}

describe("core-set-driver", () => {
  it("enforce mode applies the top-N core set once per epoch (idempotent)", async () => {
    const h = harness(opts(), SIX)
    await h.driver.tick()
    assert.equal(h.applied.length, 1)
    assert.equal(h.applied[0].length, 4)
    assert.deepEqual(h.applied[0].map((n) => n.id), [
      `0x${"aa".repeat(20)}`,
      `0x${"bb".repeat(20)}`,
      `0x${"cc".repeat(20)}`,
      `0x${"dd".repeat(20)}`,
    ])
    // Second tick, same epoch → no re-apply.
    await h.driver.tick()
    assert.equal(h.applied.length, 1)
  })

  it("carries the correct stake for each selected member", async () => {
    const h = harness(opts(), SIX)
    await h.driver.tick()
    assert.equal(h.applied[0][0].stake, 100n) // aa
    assert.equal(h.applied[0][3].stake, 70n) // dd
  })

  it("shadow mode never applies", async () => {
    const h = harness(opts({ shadow: true }), SIX)
    await h.driver.tick()
    assert.equal(h.applied.length, 0)
  })

  it("acts again on a new epoch boundary", async () => {
    const h = harness(opts(), SIX)
    await h.driver.tick()
    assert.equal(h.applied.length, 1)
    h.setEpoch(11) // target 8 > lastHandled 7
    await h.driver.tick()
    assert.equal(h.applied.length, 2)
  })

  it("keeps the current set (no apply) when below the floor", async () => {
    const three = () => SIX().slice(0, 3)
    const h = harness(opts(), three)
    await h.driver.tick()
    assert.equal(h.applied.length, 0)
    // Epoch marked handled → no reprocessing churn on same epoch.
    await h.driver.tick()
    assert.equal(h.applied.length, 0)
  })

  it("does nothing when disabled", async () => {
    const h = harness(opts({ enabled: false }), SIX)
    await h.driver.tick()
    assert.equal(h.applied.length, 0)
  })

  it("does not act before the lagged epoch exists (target <= 0)", async () => {
    const h = harness(opts({ lagEpochs: 20 }), SIX) // epoch 10 - 20 < 0
    await h.driver.tick()
    assert.equal(h.applied.length, 0)
  })

  it("on-chain mode applies the canonical set and skips local compute", async () => {
    const applied: Array<Array<{ id: string; stake: bigint }>> = []
    let localComputeCalled = false
    const reader = {
      buildCandidates: async () => {
        localComputeCalled = true
        return SIX()
      },
    } as unknown as CoreSetReader
    const canonical = [
      { id: "0xaaaa", stake: 100n },
      { id: "0xbbbb", stake: 90n },
      { id: "0xcccc", stake: 80n },
      { id: "0xdddd", stake: 70n },
    ]
    const driver = new CoreSetDriver(
      {
        reader,
        applySet: (v) => applied.push(v),
        currentEpoch: () => 10,
        log: { info: () => {}, warn: () => {} },
        getCanonicalCoreSet: async () => canonical,
      },
      opts(),
    )
    await driver.tick()
    assert.equal(applied.length, 1)
    assert.deepEqual(applied[0], canonical)
    assert.equal(localComputeCalled, false, "must not recompute locally in on-chain mode")
    // idempotent per epoch
    await driver.tick()
    assert.equal(applied.length, 1)
  })

  it("on-chain mode keeps current set when epoch not finalized (null)", async () => {
    const applied: Array<Array<{ id: string; stake: bigint }>> = []
    const reader = { buildCandidates: async () => SIX() } as unknown as CoreSetReader
    const driver = new CoreSetDriver(
      {
        reader,
        applySet: (v) => applied.push(v),
        currentEpoch: () => 10,
        log: { info: () => {}, warn: () => {} },
        getCanonicalCoreSet: async () => null,
      },
      opts(),
    )
    await driver.tick()
    assert.equal(applied.length, 0)
  })

  it("on-chain mode respects shadow (no apply)", async () => {
    const applied: Array<Array<{ id: string; stake: bigint }>> = []
    const reader = { buildCandidates: async () => SIX() } as unknown as CoreSetReader
    const driver = new CoreSetDriver(
      {
        reader,
        applySet: (v) => applied.push(v),
        currentEpoch: () => 10,
        log: { info: () => {}, warn: () => {} },
        getCanonicalCoreSet: async () => [{ id: "0xaaaa", stake: 1n }],
      },
      opts({ shadow: true }),
    )
    await driver.tick()
    assert.equal(applied.length, 0)
  })

  it("keeps the current set when buildCandidates throws", async () => {
    const applied: Array<Array<{ id: string; stake: bigint }>> = []
    const reader = { buildCandidates: async () => { throw new Error("rpc down") } } as unknown as CoreSetReader
    const driver = new CoreSetDriver(
      { reader, applySet: (v) => applied.push(v), currentEpoch: () => 10, log: { info: () => {}, warn: () => {} } },
      opts(),
    )
    await driver.tick()
    assert.equal(applied.length, 0)
  })
})

describe("core-set-driver: restart safety (deferFirstApply)", () => {
  // 2026-08-31 B2 enforce incident: after an atomic restart every node's BFT
  // came up on the OLD static set and started round H (old-rotation proposer
  // proposed + prepared, vote-ledger persisted). ~10s later each driver
  // applied the NEW set → the proposer rotation changed → a SECOND legitimate
  // proposer proposed a different block at the same height. The #780 vote
  // ledger then pinned every node to whichever block it saw first
  // ("refusing self-equivocation") — quorum could never form and the chain
  // stalled until rollback. Deferring the first apply to the NEXT epoch
  // boundary keeps the set change away from the restart's in-flight round
  // and makes every node switch at the same on-chain instant.

  it("enforce: defers the first target epoch, applies from the next boundary on", async () => {
    const h = harness(opts({ deferFirstApply: true }), SIX)
    await h.driver.tick() // first target epoch (10-3=7): must NOT apply
    assert.equal(h.applied.length, 0, "first boundary after startup is observe-only")
    await h.driver.tick() // same epoch again: still nothing
    assert.equal(h.applied.length, 0)
    h.setEpoch(11) // next epoch boundary (target 8)
    await h.driver.tick()
    assert.equal(h.applied.length, 1, "applies at the next boundary")
    h.setEpoch(12)
    await h.driver.tick()
    assert.equal(h.applied.length, 2, "subsequent boundaries apply normally")
  })

  it("shadow: deferral does not change shadow behavior (never applies anyway)", async () => {
    const h = harness(opts({ shadow: true, deferFirstApply: true }), SIX)
    await h.driver.tick()
    h.setEpoch(11)
    await h.driver.tick()
    assert.equal(h.applied.length, 0)
  })

  it("defer also covers the Phase-2 on-chain canonical path", async () => {
    const applied: Array<Array<{ id: string; stake: bigint }>> = []
    let epoch = 10
    const deps: CoreSetDriverDeps = {
      reader: { buildCandidates: async () => SIX() } as unknown as CoreSetReader,
      applySet: (v) => applied.push(v),
      currentEpoch: () => epoch,
      log: { info: () => {}, warn: () => {} },
      getCanonicalCoreSet: async () => [
        { id: "0x" + "aa".repeat(20), stake: 100n },
        { id: "0x" + "bb".repeat(20), stake: 90n },
        { id: "0x" + "cc".repeat(20), stake: 80n },
        { id: "0x" + "dd".repeat(20), stake: 70n },
      ],
    }
    const driver = new CoreSetDriver(deps, opts({ deferFirstApply: true }))
    await driver.tick() // first target: deferred
    assert.equal(applied.length, 0, "on-chain path defers the first apply too")
    epoch = 11
    await driver.tick()
    assert.equal(applied.length, 1, "on-chain path applies from the next boundary")
  })
})
