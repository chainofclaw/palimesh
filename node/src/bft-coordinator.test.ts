import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { BftCoordinator } from "./bft-coordinator.ts"
import { BftVoteLedger } from "./bft-vote-ledger.ts"
import type { BftMessage } from "./bft.ts"
import type { ChainBlock, Hex } from "./blockchain-types.ts"

const validators = [
  { id: "v1", stake: 100n },
  { id: "v2", stake: 100n },
  { id: "v3", stake: 100n },
]

const DUMMY_SIG = ("0x" + "de".repeat(65)) as Hex

function makeBlock(height: bigint, proposer = "v1"): ChainBlock {
  return {
    number: height,
    hash: ("0x" + "ab".repeat(32)) as Hex,
    parentHash: ("0x" + "00".repeat(32)) as Hex,
    proposer,
    timestampMs: Date.now(),
    txs: [],
    finalized: false,
  }
}

function bftMsg(type: "prepare" | "commit", height: bigint, blockHash: Hex, senderId: string): BftMessage {
  return { type, height, blockHash, senderId, signature: DUMMY_SIG }
}

describe("BftCoordinator", () => {
  it("starts a round and broadcasts prepare", async () => {
    const broadcasted: BftMessage[] = []

    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
    })

    const block = makeBlock(1n, "v1")
    await coord.startRound(block)

    // v1 should have broadcasted a prepare message
    assert.equal(broadcasted.length, 1)
    assert.equal(broadcasted[0].type, "prepare")
    assert.equal(broadcasted[0].senderId, "v1")

    const state = coord.getRoundState()
    assert.equal(state.active, true)
    assert.equal(state.height, 1n)
    assert.equal(state.phase, "prepare")
  })

  it("transitions through full BFT lifecycle", async () => {
    const broadcasted: BftMessage[] = []
    let finalizedBlock: ChainBlock | null = null

    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async (block) => { finalizedBlock = block },
    })

    const block = makeBlock(1n, "v1")
    await coord.startRound(block)
    assert.equal(broadcasted.length, 1) // prepare from v1

    // v2 sends prepare
    await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v2"))

    // v3 sends prepare -> quorum, should transition to commit
    await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))

    // v1 should have broadcasted commit
    const commitMsgs = broadcasted.filter((m) => m.type === "commit")
    assert.equal(commitMsgs.length, 1)

    // v2 commits
    await coord.handleMessage(bftMsg("commit", 1n, block.hash, "v2"))

    // v3 commits -> finalized
    await coord.handleMessage(bftMsg("commit", 1n, block.hash, "v3"))

    assert.ok(finalizedBlock)
    assert.equal(finalizedBlock.number, 1n)

    // Round should be cleared
    const state = coord.getRoundState()
    assert.equal(state.active, false)
  })

  it("ignores messages for wrong height", async () => {
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
    })

    await coord.startRound(makeBlock(5n))

    // Message for height 3 should be ignored
    await coord.handleMessage(bftMsg("prepare", 3n, ("0x" + "ff".repeat(32)) as Hex, "v2"))

    const state = coord.getRoundState()
    assert.equal(state.prepareVotes, 1) // only v1's own vote
  })

  it("ignores messages when no active round", async () => {
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
    })

    // Should not throw
    await coord.handleMessage(bftMsg("prepare", 1n, ("0x" + "ff".repeat(32)) as Hex, "v2"))

    assert.equal(coord.getRoundState().active, false)
  })

  it("new round defers if active round has progress", async () => {
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
    })

    await coord.startRound(makeBlock(1n))
    assert.equal(coord.getRoundState().height, 1n)

    // Second startRound is deferred because round 1 has votes (local prepare)
    await coord.startRound(makeBlock(2n))
    assert.equal(coord.getRoundState().height, 1n) // Still at height 1
  })

  it("updateValidators changes the set", async () => {
    const coord = new BftCoordinator({
      localId: "v1",
      validators: [{ id: "v1", stake: 100n }],
      broadcastMessage: async () => {},
      onFinalized: async () => {},
    })

    coord.updateValidators(validators)
    // Next round will use updated validators
    await coord.startRound(makeBlock(1n))
    assert.equal(coord.getRoundState().active, true)
  })

  it("non-validator coordinator observes but does not vote", async () => {
    const broadcasted: BftMessage[] = []

    const coord = new BftCoordinator({
      localId: "observer",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
    })

    await coord.startRound(makeBlock(1n))
    assert.equal(broadcasted.length, 0) // observer doesn't vote
  })

  // --- Phase B integration: computeLocalStateRoot wired through to prepare vote.
  // See plans/palimesh-phase-b-stateroot-vote.md §B2.7. Covers the end-to-end BFT
  // contract that (a) prepare votes carry the stateRoot from the hook, and
  // (b) validators whose hook returns a different value form a separate
  // quorum group — the (blockHash, stateRoot) pair fails to reach 2/3 when
  // a proposer claims a stateRoot we can't reproduce.

  it("computeLocalStateRoot output is attached to the outgoing prepare vote", async () => {
    const broadcasted: BftMessage[] = []
    const fakeRoot = ("0x" + "be".repeat(32)) as Hex
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
      computeLocalStateRoot: async () => fakeRoot,
    })

    await coord.startRound(makeBlock(1n))
    const prep = broadcasted.find((m) => m.type === "prepare")
    assert.ok(prep, "prepare vote must be broadcast")
    assert.strictEqual(prep!.stateRoot, fakeRoot, "prepare carries the stateRoot the hook returned")
  })

  it("quorum does NOT finalize when proposer's claimed stateRoot diverges from our hook", async () => {
    let finalized = false
    const broadcasted: BftMessage[] = []
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex   // what we (v1) compute
    const theirRoot = ("0x" + "bb".repeat(32)) as Hex // what v2/v3 (on a fork) compute

    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 100, // short so the test doesn't hang
      commitTimeoutMs: 100,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => { finalized = true },
      computeLocalStateRoot: async () => ourRoot,
    })

    const block = makeBlock(1n)
    await coord.startRound(block)

    // v2 and v3 vote with a different stateRoot — their speculative would
    // have computed a different post-state (simulating a proposer whose
    // claimed block can't be reproduced by 2/3 of the set).
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v2"), stateRoot: theirRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v3"), stateRoot: theirRoot })

    // Wait past the prepare timeout so the coordinator clears the round.
    await new Promise((r) => setTimeout(r, 200))

    assert.equal(finalized, false, "quorum on (blockHash, ourRoot) must NOT form — our vote is alone")
    const commit = broadcasted.find((m) => m.type === "commit")
    assert.equal(commit, undefined, "no commit should be emitted without prepare quorum")
  })

  it("on prepare-phase timeout with divergent stateRoots, dump diagnostic with all votes + proposed block", async () => {
    // Pins the diagnostic added 2026-04-30 for the recurring testnet
    // pair-quorum stalls. Simulates 3 validators voting for the same
    // blockHash but 3 different stateRoots → no 2/3 quorum on any pair
    // → round times out → diagnostic must surface the full vote table
    // + proposed-block context.
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex
    const v2Root = ("0x" + "bb".repeat(32)) as Hex
    const v3Root = ("0x" + "cc".repeat(32)) as Hex

    // Capture log calls — we can't easily intercept the module-level log
    // without monkey-patching, so we just rely on the diagnostic running
    // without throwing (smoke). The detailed log content is exercised
    // implicitly by the existing "quorum does NOT finalize" test above
    // plus this one's coverage of the dump path.
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 50,
      commitTimeoutMs: 50,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => ourRoot,
    })

    const block = makeBlock(1n)
    await coord.startRound(block)

    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v2"), stateRoot: v2Root })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v3"), stateRoot: v3Root })

    // Wait past timeout so dumpDivergenceDiagnostics fires from the
    // setTimeout handler. If the dump throws, this test would fail with
    // an unhandled rejection.
    await new Promise((r) => setTimeout(r, 200))

    // After timeout the timed-out round is torn down and, because we already
    // prepared this block, re-entered fresh (lost-vote livelock fix). The
    // dump must NOT corrupt state: the coordinator is back in a clean
    // prepare round for the same height.
    const state = coord.getRoundState()
    assert.equal(state.active, true, "round re-entered after timeout")
    assert.equal(state.height, 1n)
    assert.equal(state.phase, "prepare")
  })

  it("Phase H4: fires onPeerQuorumDiverged when ≥2/3 of OTHER validators converge on a stateRoot we can't reproduce", async () => {
    // Pins the 2026-04-30 testnet stall: relaxedQuorum lets node-2/3
    // finalize on (hash, peerRoot) using their 2-of-3 stake while node-1
    // votes alone with localRoot. Without H4 the lagging node sits silent
    // until the next syncIntervalMs tick (30-60s); the chain has already
    // deadlocked by then because the proposer round-robin returned to it.
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex

    let divergence: { height: bigint; peerBlockHash: Hex; peerStateRoot: Hex; localStateRoot?: Hex } | null = null
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 50,
      commitTimeoutMs: 50,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => ourRoot,
      onPeerQuorumDiverged: (info) => { divergence = info },
    })

    const block = makeBlock(1n)
    await coord.startRound(block)

    // v2 + v3 prepare with a stateRoot v1 (us) can't reproduce. Together
    // they hold 200/300 stake = 2/3 → relaxedQuorum quorum threshold.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v3"), stateRoot: peerRoot })

    // Wait past timeout so the H4 detection runs.
    await new Promise((r) => setTimeout(r, 200))

    assert.ok(divergence, "onPeerQuorumDiverged must fire")
    assert.equal(divergence!.height, 1n)
    assert.equal(divergence!.peerBlockHash, block.hash)
    assert.equal(divergence!.peerStateRoot, peerRoot)
    assert.equal(divergence!.localStateRoot, ourRoot)
  })

  it("Phase H4: does NOT fire onPeerQuorumDiverged when local matches peer quorum", async () => {
    // When all three nodes agree on the same stateRoot, the round
    // finalizes via early-commits — no divergence to surface. The
    // callback must NOT fire spuriously even if the timeout path hits
    // for an unrelated reason (e.g. commit-phase timeout).
    const agreed = ("0x" + "cc".repeat(32)) as Hex
    let divergenceFiredCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 50,
      commitTimeoutMs: 50,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => agreed,
      onPeerQuorumDiverged: () => { divergenceFiredCount++ },
    })

    const block = makeBlock(1n)
    await coord.startRound(block)

    // All three agree — but no commits, so the commit phase will time out.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v2"), stateRoot: agreed })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v3"), stateRoot: agreed })

    await new Promise((r) => setTimeout(r, 200))

    assert.equal(divergenceFiredCount, 0, "no peer divergence to report when local matches quorum")
  })

  it("Phase H5: fires onPersistentDivergence after N consecutive divergences", async () => {
    // After 3 consecutive prepare-phase timeouts where peers reached 2/3
    // quorum on a stateRoot we couldn't reproduce, the persistent-
    // divergence callback fires. This is the testnet "leveldb is
    // corrupted at-rest, incremental sync loops forever" path — we
    // escalate to a full state-snapshot import.
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex

    const persistentEvents: Array<{ height: bigint; consecutiveCount: number }> = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 30,
      commitTimeoutMs: 30,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => ourRoot,
      persistentDivergenceThreshold: 3,
      onPersistentDivergence: (info) => persistentEvents.push({
        height: info.height,
        consecutiveCount: info.consecutiveCount,
      }),
    })

    // Drive 3 divergent rounds back-to-back. Each uses a fresh height
    // because the coordinator advances height after each round.
    for (let height = 1n; height <= 3n; height++) {
      await coord.startRound(makeBlock(height))
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v3"), stateRoot: peerRoot })
      await new Promise((r) => setTimeout(r, 100))
    }

    assert.equal(persistentEvents.length, 1, "fires once when threshold crossed")
    assert.equal(persistentEvents[0].height, 3n)
    assert.equal(persistentEvents[0].consecutiveCount, 3)
  })

  it("Phase H5: does NOT fire below threshold (only 2 consecutive divergences)", async () => {
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex

    let persistentFired = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 30,
      commitTimeoutMs: 30,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => ourRoot,
      persistentDivergenceThreshold: 3,
      onPersistentDivergence: () => persistentFired++,
    })

    for (let height = 1n; height <= 2n; height++) {
      await coord.startRound(makeBlock(height))
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v3"), stateRoot: peerRoot })
      await new Promise((r) => setTimeout(r, 100))
    }

    assert.equal(persistentFired, 0, "below threshold — must not escalate")
  })

  it("Phase H5: counter resets on successful finalize — transient divergence doesn't escalate", async () => {
    // Divergence × 2, then a clean finalize, then 2 more divergences.
    // Counter should reset after the clean finalize so the second pair
    // doesn't escalate (5 cumulative ≠ 3 consecutive).
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex

    let persistentFired = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 30,
      commitTimeoutMs: 30,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => ourRoot,
      persistentDivergenceThreshold: 3,
      onPersistentDivergence: () => persistentFired++,
    })

    // Two divergent rounds.
    for (let height = 1n; height <= 2n; height++) {
      await coord.startRound(makeBlock(height))
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v3"), stateRoot: peerRoot })
      await new Promise((r) => setTimeout(r, 100))
    }
    // Successful finalize — all 3 agree on ourRoot.
    const block3 = makeBlock(3n)
    await coord.startRound(block3)
    await coord.handleMessage({ ...bftMsg("prepare", 3n, block3.hash, "v2"), stateRoot: ourRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 3n, block3.hash, "v3"), stateRoot: ourRoot })
    // The early-commits path needs commits too — send them so the finalize
    // path runs and the counter resets.
    await coord.handleMessage({ ...bftMsg("commit", 3n, block3.hash, "v2"), stateRoot: ourRoot })
    await coord.handleMessage({ ...bftMsg("commit", 3n, block3.hash, "v3"), stateRoot: ourRoot })

    // Two more divergent rounds.
    for (let height = 4n; height <= 5n; height++) {
      await coord.startRound(makeBlock(height))
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", height, makeBlock(height).hash, "v3"), stateRoot: peerRoot })
      await new Promise((r) => setTimeout(r, 100))
    }

    assert.equal(persistentFired, 0, "reset after finalize — only 2 consecutive divergences post-reset")
  })

  it("Phase H4: does NOT fire when only 1 of 2 other validators votes — peer quorum not reached", async () => {
    // 1/3 stake from v2 with a different root is NOT 2/3 quorum, so peers
    // CAN'T finalize without us. We're not "lagging behind" yet — the
    // round just timed out for normal reasons (e.g. unresponsive v3).
    // Triggering catch-up here would cause a sync storm whenever a
    // single validator is offline.
    const ourRoot = ("0x" + "aa".repeat(32)) as Hex
    const v2Root = ("0x" + "bb".repeat(32)) as Hex

    let divergenceFiredCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 50,
      commitTimeoutMs: 50,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => ourRoot,
      onPeerQuorumDiverged: () => { divergenceFiredCount++ },
    })

    const block = makeBlock(1n)
    await coord.startRound(block)

    // Only v2 votes — v3 is silent. peer pair (hash, v2Root) has only
    // 100/300 = 1/3 stake. Below 2/3 threshold.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v2"), stateRoot: v2Root })

    await new Promise((r) => setTimeout(r, 200))

    assert.equal(divergenceFiredCount, 0, "single peer with different root is below 2/3 quorum")
  })

  it("quorum DOES finalize when all three validators' hooks agree on the stateRoot", async () => {
    let finalized = false
    const broadcasted: BftMessage[] = []
    const agreedRoot = ("0x" + "cc".repeat(32)) as Hex

    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 1000,
      commitTimeoutMs: 1000,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => { finalized = true },
      computeLocalStateRoot: async () => agreedRoot,
    })

    const block = makeBlock(1n)
    await coord.startRound(block)

    // v2 and v3 vote the SAME stateRoot — prepare quorum forms.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v2"), stateRoot: agreedRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, block.hash, "v3"), stateRoot: agreedRoot })
    // Commit quorum.
    await coord.handleMessage({ ...bftMsg("commit", 1n, block.hash, "v2"), stateRoot: agreedRoot })
    await coord.handleMessage({ ...bftMsg("commit", 1n, block.hash, "v3"), stateRoot: agreedRoot })

    assert.equal(finalized, true, "quorum on matching (blockHash, stateRoot) must finalize")
  })

  // -- Phase J1.1: early divergence detection from buffered prepare messages --

  it("Phase J1.1: fires onPeerQuorumDiverged early when prepares arrive without an active round", async () => {
    // Today's deadzone (2026-05-05 testnet stall): node-1's chain engine
    // rejected the parent block, so startRound was never invoked. Peers'
    // prepare messages still arrive carrying their (blockHash, peerRoot)
    // and pile up in pendingMessages. Without J1.1, no detect path runs
    // until startRound + timeout, which never happens. With J1.1, every
    // buffered prepare triggers tryEarlyDivergenceDetect.
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex

    let fired: { height: bigint; peerStateRoot: Hex; localStateRoot?: Hex } | null = null
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: (info) => {
        fired = { height: info.height, peerStateRoot: info.peerStateRoot, localStateRoot: info.localStateRoot }
      },
    })

    // Note: we never call startRound — there is no activeRound.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })

    assert.ok(fired, "early divergence should fire from buffered prepares without an active round")
    assert.equal(fired!.height, 1n)
    assert.equal(fired!.peerStateRoot, peerRoot)
    assert.equal(fired!.localStateRoot, undefined, "no local round → no local stateRoot")
  })

  it("Phase J1.1: dedups by height — fires at most once per height", async () => {
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
    })

    // Three prepare messages from the same peers (one duplicate, two unique)
    // at the same height — only one fire expected.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })

    assert.equal(fireCount, 1, "per-height dedup should suppress repeated fires")
  })

  it("Phase J1.1 corner-case fix: rolls back per-height dedup when callback returns false", async () => {
    // Scenario captured in docs/phase-j-stall-2026-05-06-corner-case.md:
    // when the parent's downstream recovery (forceSnapSync) is rejected
    // because of cooldown OR sync-already-in-flight, the J1.1 dedup must
    // NOT advance, so the next prepare arriving at the same height re-fires
    // the gate. Without this, J1.1 fires once, the parent rejects the
    // attempt for a transient reason, and the dedup permanently silences
    // J1.1 for that height — leaving the chain stuck.
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex
    let fireCount = 0
    let acceptThisFire = false
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => {
        fireCount++
        // First fire: parent says "rejected" (e.g. forceSnapSync skipped
        // because already in flight). Subsequent fires: accept.
        return acceptThisFire
      },
    })

    // Drive the gate with two distinct peer prepares — enough OTHER votes
    // to clear the 2/3 quorum threshold inside computePeerQuorumDivergence.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })
    assert.equal(fireCount, 1, "first quorum of peer prepares fires the gate exactly once")

    // Wait past the 1s coordinator-internal throttle so the next prepare
    // is allowed to re-evaluate. Also clears any height dedup the fix
    // chose to keep — except the rejected first fire should have rolled it
    // back, so the next prepare must re-fire.
    await new Promise((resolve) => setTimeout(resolve, 1100))

    // A subsequent prepare arrives (e.g. retransmit) at the same height.
    // Without the fix, dedup-by-height would suppress this fire entirely.
    // With the fix, the rejected first fire rolled back the dedup, so
    // this fires again.
    acceptThisFire = true
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    assert.equal(fireCount, 2, "rejected fire must roll back dedup so the next prepare re-fires")

    // Another duplicate prepare — accepted fire holds the dedup, so this
    // should NOT fire (the throttle window has passed but per-height dedup
    // is now committed).
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })
    assert.equal(fireCount, 2, "accepted fire must hold the dedup against further re-fires")
  })

  it("Phase J1.1 follower fix: suppresses fire when the local chain already holds the exact peer-quorum block", async () => {
    // 2026-08-30 v3 incident: a caught-up follower (applying blocks via BFT
    // onFinalized without casting prepare votes) has no localVote, so
    // localStateRoot is <unset> and J1.1 fired forceSnapSync in a loop —
    // repeatedly re-importing state that was ALREADY byte-identical to the
    // peer quorum (leveldb-state ballooned 30G). When the local chain holds
    // the exact (blockHash, stateRoot) the peers agreed on, there is no
    // divergence to cure — suppress the fire.
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async (height) => ({ ...makeBlock(height), hash: peerHash, stateRoot: peerRoot }),
    })

    // No active round (follower mode) — prepares buffer, J1.1 evaluates.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })

    assert.equal(fireCount, 0, "local chain already has the peer-quorum block+state — must not fire")
  })

  it("Phase J1.1 follower fix: still fires when the local block's stateRoot truly diverges", async () => {
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex
    const divergedRoot = ("0x" + "dd".repeat(32)) as Hex
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async (height) => ({ ...makeBlock(height), hash: peerHash, stateRoot: divergedRoot }),
    })

    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })

    assert.equal(fireCount, 1, "a real stateRoot divergence must still fire")
  })

  it("Phase J1.1 follower fix: still fires when the local chain has no block at that height (truly stuck)", async () => {
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
    })

    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })

    assert.equal(fireCount, 1, "no local block at the diverged height — genuinely behind, must fire")
  })

  it("Phase J1.1 follower fix: fails open (fires) when getLocalBlock throws", async () => {
    const peerRoot = ("0x" + "bb".repeat(32)) as Hex
    const peerHash = ("0x" + "ab".repeat(32)) as Hex
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => { throw new Error("leveldb closed") },
    })

    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })

    assert.equal(fireCount, 1, "confirm-lookup failure must not mask a potential divergence (fail open)")
  })

  it("Phase J1.1: does NOT fire when local stateRoot matches peer quorum", async () => {
    const agreedRoot = ("0x" + "cc".repeat(32)) as Hex
    const blockHashHex = ("0x" + "ab".repeat(32)) as Hex
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 1000,
      commitTimeoutMs: 1000,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      computeLocalStateRoot: async () => agreedRoot,
      onPeerQuorumDiverged: () => { fireCount++ },
    })

    const block = makeBlock(1n)
    await coord.startRound(block)
    // Local ourselves voted with agreedRoot via startRound's
    // computeLocalStateRoot path. Peers vote the same.
    await coord.handleMessage({ ...bftMsg("prepare", 1n, blockHashHex, "v2"), stateRoot: agreedRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, blockHashHex, "v3"), stateRoot: agreedRoot })

    assert.equal(fireCount, 0, "matching stateRoot should not trigger early divergence")
  })

  // -- Phase R (2026-05-06): BFT no-double-vote invariant --
  // After a round timeout where mempool drift produces a new candidate
  // block at the same height, BftCoordinator must NOT broadcast a second
  // prepare — self-equivocation would have peers drop both our votes via
  // EquivocationDetector and the chain stalls. The validator must replay
  // its original prepare, not invent a new one.

  it("Phase R: refuses to broadcast a second prepare for a different block at the same height", async () => {
    const broadcasted: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 100,
      commitTimeoutMs: 100,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
    })

    // First propose at height 1 with block X.
    const blockX = makeBlock(1n, "v1")
    blockX.hash = ("0x" + "aa".repeat(32)) as Hex
    await coord.startRound(blockX)
    const initialPrepares = broadcasted.filter((m) => m.type === "prepare").length
    assert.equal(initialPrepares, 1, "first startRound broadcasts our prepare")

    // Force-clear to simulate the round timing out and being recycled.
    coord.forceClearRound("test-timeout")

    // Mempool drifted; new candidate block Y for the same height.
    const blockY = makeBlock(1n, "v1")
    blockY.hash = ("0x" + "bb".repeat(32)) as Hex
    await coord.startRound(blockY)

    const totalPrepares = broadcasted.filter((m) => m.type === "prepare").length
    assert.equal(
      totalPrepares,
      1,
      "second startRound at same height with different blockHash must NOT broadcast",
    )
  })

  it("Phase R: idempotent — second startRound with the SAME block at the same height is allowed", async () => {
    const broadcasted: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 100,
      commitTimeoutMs: 100,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
    })

    const block = makeBlock(1n, "v1")
    block.hash = ("0x" + "cc".repeat(32)) as Hex
    await coord.startRound(block)
    coord.forceClearRound("test-timeout")
    // Re-broadcast path in consensus.ts uses the SAME cached block — must
    // succeed (idempotent retry, not a new vote).
    await coord.startRound(block)

    const prepares = broadcasted.filter((m) => m.type === "prepare")
    // Both startRound invocations broadcast the same block hash, which is
    // idempotent from the BFT-safety standpoint (no second distinct vote).
    // We allow re-broadcast for liveness so peers can collect quorum.
    assert.ok(prepares.length >= 1, "at least one prepare broadcast")
    const distinct = new Set(prepares.map((p) => p.blockHash))
    assert.equal(distinct.size, 1, "all broadcast prepares must be for the same blockHash")
  })

  // -- Phase J2.1: forceClearRound public entrypoint --

  it("Phase J2.1: forceClearRound clears active round and is idempotent", async () => {
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 1000,
      commitTimeoutMs: 1000,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
    })

    const block = makeBlock(1n, "v1")
    await coord.startRound(block)
    assert.equal(coord.getRoundState().active, true, "round started")

    coord.forceClearRound("test-self-stuck")
    assert.equal(coord.getRoundState().active, false, "round cleared")

    // Idempotent — second call must not throw or change state.
    coord.forceClearRound("test-second-call")
    assert.equal(coord.getRoundState().active, false, "still cleared (idempotent)")
  })

  it("Phase J2.1: after forceClearRound, a new startRound at the same height succeeds", async () => {
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      prepareTimeoutMs: 1000,
      commitTimeoutMs: 1000,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
    })

    const block = makeBlock(1n, "v1")
    await coord.startRound(block)
    coord.forceClearRound("self-stuck")

    // Restart at same height — must work, not throw.
    await coord.startRound(block)
    const state = coord.getRoundState()
    assert.equal(state.active, true)
    assert.equal(state.height, 1n)
  })

  // Issue #73 regression: startRound must refuse stale heights when the
  // chain has already finalized them out-of-band (e.g. via gossip-block
  // after a restart). Without the getChainHeight guard, lastFinalizedHeight
  // stays pinned at the pre-restart value, the stale block slips past
  // the legacy guard, and the coordinator burns cycles on a phantom
  // round that can never quorum.
  it("refuses startRound for height ≤ chain tip (#73)", async () => {
    const broadcasted: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
      // Chain has advanced to height 10 via gossip-block; lastFinalizedHeight
      // (BFT-internal) is still 0 because no local round has finalized.
      getChainHeight: () => 10n,
    })

    const stale = makeBlock(5n, "v1")
    await coord.startRound(stale)

    // No prepare message should have been broadcast — the round was rejected.
    assert.equal(broadcasted.length, 0, "stale startRound must not broadcast")
    const state = coord.getRoundState()
    assert.equal(state.active, false, "no active round after stale startRound")
  })

  it("accepts startRound for height > chain tip (#73)", async () => {
    const broadcasted: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
      getChainHeight: () => 10n,
    })

    const fresh = makeBlock(11n, "v1")
    await coord.startRound(fresh)

    assert.equal(broadcasted.length, 1, "fresh startRound broadcasts prepare")
    const state = coord.getRoundState()
    assert.equal(state.active, true)
    assert.equal(state.height, 11n)
  })

  it("getChainHeight failure falls back to lastFinalizedHeight (#73)", async () => {
    // Failure path: getChainHeight throws. Should not cascade — startRound
    // proceeds using lastFinalizedHeight (which is 0 here, so any positive
    // height is accepted).
    const broadcasted: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async (msg) => { broadcasted.push(msg) },
      onFinalized: async () => {},
      getChainHeight: () => { throw new Error("simulated chain unreachable") },
    })

    const block = makeBlock(7n, "v1")
    await coord.startRound(block)
    assert.equal(broadcasted.length, 1, "fallback path still broadcasts prepare")
  })

  it("PR-1F: onProposerStuck fires only on prepare-phase timeout with NO peer prepares", async () => {
    // 88780 Day 1 drill fingerprint: a force-proposer's round reaches commit
    // phase with 4-of-5 prepares but only 3-of-5 commits → round times out.
    // Old PR-1A marked the proposer as unreachable, leading to a different
    // fallback re-proposing a fresh block hash, which Phase R then refused
    // as self-equivocation → chain deadlock.
    //
    // PR-1F: only signal proposer-stuck when round timed out in PREPARE
    // phase AND no peer prepare votes arrived (only our self-vote).
    const stuckCalls: Array<{ proposerId: string; height: bigint }> = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      prepareTimeoutMs: 50, // short so test doesn't hang
      commitTimeoutMs: 50,
      onProposerStuck: (proposerId, height) => stuckCalls.push({ proposerId, height }),
    })

    // Round proposed by v2 (peer). Local v1 broadcasts its own prepare.
    const block = makeBlock(1n, "v2")
    await coord.startRound(block)

    // Drive the round to commit phase: receive prepares from v2 + v3 →
    // quorum-of-prepares reached. Local v1 then broadcasts commit.
    await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v2"))
    await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))

    // Confirm we're in commit phase (round didn't finalize yet — need a peer commit).
    assert.equal(coord.getRoundState().phase, "commit", "round transitioned to commit")

    // Now let the round time out without further commit votes.
    await new Promise<void>((resolve) => setTimeout(resolve, 120))

    // PR-1F: should NOT have marked v2 unreachable — the round was in commit
    // phase, meaning v2 successfully proposed and collected peer prepares.
    assert.equal(stuckCalls.length, 0, "no onProposerStuck on commit-phase timeout")
    // The commit-phase round was torn down and re-entered fresh at the
    // same height (we prepared it), so we keep voting instead of going idle.
    const st = coord.getRoundState()
    assert.equal(st.height, 1n, "round re-entered at the same height")
    assert.equal(st.phase, "prepare")
  })

  it("PR-1F: onProposerStuck DOES fire on prepare-phase timeout with no peer prepares (regression)", async () => {
    // The "proposer is silent" case: local node received the proposed block
    // (likely via gossip relay) and broadcast its own prepare, but no peer
    // prepares arrived → round times out in prepare phase with only the
    // self-vote. This is the original PR-1A signal we DO want to preserve.
    const stuckCalls: Array<{ proposerId: string; height: bigint }> = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      prepareTimeoutMs: 50,
      commitTimeoutMs: 50,
      onProposerStuck: (proposerId, height) => stuckCalls.push({ proposerId, height }),
    })

    const block = makeBlock(1n, "v2")
    await coord.startRound(block)

    // No peer prepares — let the round time out in prepare phase.
    await new Promise<void>((resolve) => setTimeout(resolve, 120))

    assert.equal(stuckCalls.length, 1, "onProposerStuck fired for silent proposer")
    assert.equal(stuckCalls[0].proposerId, "v2")
    assert.equal(stuckCalls[0].height, 1n)
  })

  it("PR-1F: prepare-phase timeout with PEER prepare (but quorum miss) does NOT mark stuck", async () => {
    // Adjacent case: 1 peer prepare arrived (so the proposer IS talking to
    // someone), but quorum wasn't reached before timeout. Proposer is alive
    // and broadcasting — should not be marked unreachable.
    const stuckCalls: Array<{ proposerId: string; height: bigint }> = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators: [
        { id: "v1", stake: 100n },
        { id: "v2", stake: 100n },
        { id: "v3", stake: 100n },
        { id: "v4", stake: 100n },
        { id: "v5", stake: 100n },
      ],
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      prepareTimeoutMs: 50,
      commitTimeoutMs: 50,
      onProposerStuck: (proposerId, height) => stuckCalls.push({ proposerId, height }),
    })

    const block = makeBlock(1n, "v2")
    await coord.startRound(block)

    // 1 peer prepare from v3 (proposer's reach is partial) — total 2-of-5,
    // below quorum (needs 4 with N=5, strict 2/3+1).
    await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))
    assert.equal(coord.getRoundState().phase, "prepare", "still in prepare phase")

    // Time out.
    await new Promise<void>((resolve) => setTimeout(resolve, 120))

    assert.equal(stuckCalls.length, 0, "proposer with at least 1 peer prepare is NOT stuck")
  })
})

describe("BftCoordinator.replayUnfinalizedVotes (restart liveness, 2026-08-05)", () => {
  const mkPath = () => join(mkdtempSync(join(tmpdir(), "bft-replay-")), "vote-ledger.json")
  const HASH_A = ("0x" + "aa".repeat(32)) as Hex
  const HASH_B = ("0x" + "bb".repeat(32)) as Hex
  const HASH_C = ("0x" + "cc".repeat(32)) as Hex

  it("re-broadcasts a committed vote after a simulated restart (the 88780 deadlock)", async () => {
    const path = mkPath()
    // Before the crash: we prepared AND committed block A at height 100, but it
    // was never finalized (peers were one commit short — exactly v4/v1 on 08-05).
    const pre = new BftVoteLedger(path)
    pre.recordPrepared(100n, HASH_A)
    pre.recordCommitted(100n, HASH_A)

    // Restart: a fresh coordinator rehydrates from the same ledger path.
    const sent: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      voteLedgerPath: path,
      getChainHeight: () => 99n, // chain tip below 100 → height 100 still unfinalized
      broadcastMessage: async (m) => { sent.push(m) },
      onFinalized: async () => {},
    })

    const res = await coord.replayUnfinalizedVotes()
    assert.equal(res.commits, 1, "one commit replayed")
    assert.equal(res.prepares, 0, "commit supersedes the prepare — no separate prepare replay")
    const commit = sent.find((m) => m.type === "commit")
    assert.ok(commit, "a commit message was broadcast")
    assert.equal(commit!.height, 100n)
    assert.equal(commit!.blockHash, HASH_A, "replays the SAME blockHash (idempotent, no equivocation)")
    assert.equal(commit!.senderId, "v1")
  })

  it("does NOT replay heights at or below the chain tip (already finalized)", async () => {
    const path = mkPath()
    const pre = new BftVoteLedger(path)
    pre.recordCommitted(100n, HASH_A)
    pre.recordCommitted(101n, HASH_B)

    const sent: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      voteLedgerPath: path,
      getChainHeight: () => 100n, // 100 finalized, 101 not
      broadcastMessage: async (m) => { sent.push(m) },
      onFinalized: async () => {},
    })

    const res = await coord.replayUnfinalizedVotes()
    assert.equal(res.commits, 1, "only the above-tip height replays")
    assert.equal(sent.length, 1)
    assert.equal(sent[0].height, 101n)
  })

  it("replays a prepare when we prepared but never committed", async () => {
    const path = mkPath()
    const pre = new BftVoteLedger(path)
    pre.recordPrepared(100n, HASH_C) // prepared only, no commit

    const sent: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      voteLedgerPath: path,
      getChainHeight: () => 99n,
      broadcastMessage: async (m) => { sent.push(m) },
      onFinalized: async () => {},
    })

    const res = await coord.replayUnfinalizedVotes()
    assert.equal(res.commits, 0)
    assert.equal(res.prepares, 1, "the uncommitted prepare is replayed")
    assert.equal(sent[0].type, "prepare")
    assert.equal(sent[0].height, 100n)
    assert.equal(sent[0].blockHash, HASH_C)
  })

  it("is a no-op when the ledger holds nothing unfinalized", async () => {
    const path = mkPath()
    const sent: BftMessage[] = []
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      voteLedgerPath: path,
      getChainHeight: () => 100n,
      broadcastMessage: async (m) => { sent.push(m) },
      onFinalized: async () => {},
    })
    const res = await coord.replayUnfinalizedVotes()
    assert.equal(res.commits, 0)
    assert.equal(res.prepares, 0)
    assert.equal(sent.length, 0)
  })

  // --- Lost-vote livelock fix (88780, 2026-10-13 height 1934977) ---
  describe("prepare retransmission + timeout re-entry", () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    it("re-broadcasts the identical prepare (with stateRoot) while the round is unfinalized", async () => {
      const sent: BftMessage[] = []
      const root = ("0x" + "c7".repeat(32)) as Hex
      const coord = new BftCoordinator({
        localId: "v1",
        validators,
        voteRetryIntervalMs: 20,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
        computeLocalStateRoot: async () => root,
      })
      try {
        const block = makeBlock(1n)
        await coord.startRound(block)
        await sleep(90)
        const prepares = sent.filter((m) => m.type === "prepare")
        assert.ok(prepares.length >= 3, `expected retransmits, got ${prepares.length}`)
        for (const m of prepares) {
          assert.equal(m.blockHash, block.hash)
          assert.equal(m.height, 1n)
          assert.equal(m.stateRoot, root)
        }
      } finally {
        coord.stop()
      }
    })

    it("keeps re-broadcasting prepare in commit phase and stops once finalized", async () => {
      const sent: BftMessage[] = []
      const coord = new BftCoordinator({
        localId: "v1",
        validators,
        voteRetryIntervalMs: 20,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      try {
        const block = makeBlock(1n)
        await coord.startRound(block)
        await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v2"))
        await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))
        assert.equal(coord.getRoundState().phase, "commit")
        const before = sent.filter((m) => m.type === "prepare").length
        await sleep(70)
        assert.ok(sent.filter((m) => m.type === "prepare").length > before, "prepare retried in commit phase")

        await coord.handleMessage(bftMsg("commit", 1n, block.hash, "v2"))
        await coord.handleMessage(bftMsg("commit", 1n, block.hash, "v3"))
        assert.equal(coord.getRoundState().active, false)
        await sleep(3_200) // let the 3s linger window drain
        const settled = sent.length
        await sleep(80)
        assert.equal(sent.length, settled, "no retransmits after finalize + linger")
      } finally {
        coord.stop()
      }
    })

    it("a non-validator observer never retransmits", async () => {
      const sent: BftMessage[] = []
      const coord = new BftCoordinator({
        localId: "observer",
        validators,
        voteRetryIntervalMs: 10,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      try {
        await coord.startRound(makeBlock(1n))
        await sleep(50)
        assert.equal(sent.length, 0)
      } finally {
        coord.stop()
      }
    })

    it("re-enters the round for the locally-prepared block after a timeout", async () => {
      const sent: BftMessage[] = []
      const coord = new BftCoordinator({
        localId: "v2",
        validators,
        prepareTimeoutMs: 15,
        commitTimeoutMs: 15,
        voteRetryIntervalMs: 1_000_000,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      try {
        const block = makeBlock(1n, "v1")
        await coord.handleReceivedBlock(block)
        assert.equal(sent.filter((m) => m.type === "prepare").length, 1)
        await sleep(100)
        // Each timeout re-enters on the same block → a fresh prepare each time.
        const prepares = sent.filter((m) => m.type === "prepare")
        assert.ok(prepares.length >= 2, `expected re-entry prepares, got ${prepares.length}`)
        assert.ok(prepares.every((m) => m.blockHash === block.hash))
        const st = coord.getRoundState()
        assert.equal(st.active, true)
        assert.equal(st.height, 1n)
      } finally {
        coord.stop()
      }
    })

    it("a re-entered round never holds back a block for a higher height", async () => {
      const sent: BftMessage[] = []
      const coord = new BftCoordinator({
        localId: "v2",
        validators,
        prepareTimeoutMs: 15,
        commitTimeoutMs: 15,
        voteRetryIntervalMs: 1_000_000,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      try {
        await coord.handleReceivedBlock(makeBlock(1n, "v1"))
        await sleep(45) // timed out at least once → re-entered height 1
        assert.equal(coord.getRoundState().height, 1n)
        const next: ChainBlock = { ...makeBlock(2n, "v3"), hash: ("0x" + "cd".repeat(32)) as Hex }
        await coord.startRound(next)
        const st = coord.getRoundState()
        assert.equal(st.height, 2n, "height 2 starts immediately instead of being deferred")
        assert.ok(sent.some((m) => m.type === "prepare" && m.height === 2n))
      } finally {
        coord.stop()
      }
    })

    it("a re-entered round keeps re-sending a commit we already cast", async () => {
      const sent: BftMessage[] = []
      const coord = new BftCoordinator({
        localId: "v1",
        validators,
        prepareTimeoutMs: 25,
        commitTimeoutMs: 25,
        voteRetryIntervalMs: 15,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      try {
        const block = makeBlock(1n)
        await coord.startRound(block)
        await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v2"))
        await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))
        assert.equal(coord.getRoundState().phase, "commit")
        await sleep(80) // commit round times out → re-entered in prepare phase
        const st = coord.getRoundState()
        assert.equal(st.height, 1n)
        assert.equal(st.phase, "prepare")
        const mark = sent.length
        await sleep(60)
        const later = sent.slice(mark)
        assert.ok(later.some((m) => m.type === "commit" && m.blockHash === block.hash), "commit re-sent from prepare phase")
        assert.ok(later.every((m) => m.blockHash === block.hash))
      } finally {
        coord.stop()
      }
    })

    it("stop() halts re-entry and every retransmit timer", async () => {
      const sent: BftMessage[] = []
      const coord = new BftCoordinator({
        localId: "v2",
        validators,
        prepareTimeoutMs: 10,
        commitTimeoutMs: 10,
        voteRetryIntervalMs: 10,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      await coord.handleReceivedBlock(makeBlock(1n, "v1"))
      await sleep(25) // timeout fires → re-entry may be in flight
      coord.stop()
      await sleep(10)
      const settled = sent.length
      await sleep(80)
      assert.equal(sent.length, settled, "nothing broadcast after stop()")
      assert.equal(coord.getRoundState().active, false)
      await coord.startRound(makeBlock(2n, "v1"))
      assert.equal(coord.getRoundState().active, false, "startRound is a no-op after stop()")
    })

    it("does not re-enter once the height is at or below the chain tip", async () => {
      const sent: BftMessage[] = []
      let tip = 0n
      const coord = new BftCoordinator({
        localId: "v2",
        validators,
        prepareTimeoutMs: 15,
        commitTimeoutMs: 15,
        voteRetryIntervalMs: 1_000_000,
        getChainHeight: () => tip,
        broadcastMessage: async (msg) => { sent.push(msg) },
        onFinalized: async () => {},
      })
      try {
        await coord.handleReceivedBlock(makeBlock(1n, "v1"))
        tip = 1n // height 1 got applied via sync while our round was open
        await sleep(100)
        assert.equal(sent.filter((m) => m.type === "prepare").length, 1, "no re-entry at a stale height")
        assert.equal(coord.getRoundState().active, false)
      } finally {
        coord.stop()
      }
    })
  })
})

describe("Phase J1.1 follower fix: in-flight round is not a stall", () => {
  // 2026-09-05 v3 recurrence: for the height currently UNDER consensus
  // (tip+1) the local chain never has a block yet, so getLocalBlock()
  // returns null and the earlier fix fell through to the "truly stuck"
  // fire path. A slow-but-caught-up validator (v3, shared host) that
  // misses casting its prepare before the peer quorum forms then fired
  // forceSnapSync every cooldown window and ballooned leveldb-state
  // again (64G). Being one in-flight round behind on VOTES is not a
  // stall: only fire when the local TIP is genuinely behind the peer
  // quorum height. A real J1.1 dead-zone (tip frozen while peers
  // advance) still fires as soon as peers move one block ahead.
  const peerRoot = ("0x" + "bb".repeat(32)) as Hex
  const peerHash = ("0x" + "ab".repeat(32)) as Hex
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  it("suppresses fire when height is the in-flight round (tip+1)", async () => {
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
      getChainHeight: () => 0n, // tip=0 → height 1 is the in-flight round
    })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })
    assert.equal(fireCount, 0, "one in-flight round behind on votes is not a stall")
  })

  it("still fires when the local tip is genuinely behind (height > tip+1)", async () => {
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
      getChainHeight: () => 0n, // tip=0, peers at height 3 → genuinely behind
    })
    await coord.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v3"), stateRoot: peerRoot })
    assert.equal(fireCount, 1, "tip frozen while peers advanced — must fire")
  })

  it("fires when getChainHeight is not provided (no silent behavior change)", async () => {
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
    })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v2"), stateRoot: peerRoot })
    await coord.handleMessage({ ...bftMsg("prepare", 1n, peerHash, "v3"), stateRoot: peerRoot })
    assert.equal(fireCount, 1, "without a tip source, keep the fail-open fire")
  })

  // 2026-10-21 v3 (719 fires/day, each followed by a ~36s forceSnapSync and
  // a chain-wide pause when v3 was due to propose): we finalized H-1 and
  // onFinalized (applyBlock) is still running, so the chain tip is H-2.
  // Peers' prepares for H arrive in that window → H > tip+1 → false fire.
  // A height we already finalized must count as our tip.
  it("suppresses fire while the just-finalized block is still being applied", async () => {
    let fireCount = 0
    let releaseApply: () => void = () => {}
    const applying = new Promise<void>((r) => { releaseApply = r })
    let applyStarted = false
    const block = makeBlock(1n, "v2")
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => { applyStarted = true; await applying },
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
      getChainHeight: () => 0n, // applyBlock(1) not done → tip still 0
    })
    try {
      await coord.handleReceivedBlock(block)
      await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v2"))
      await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))
      await coord.handleMessage(bftMsg("commit", 1n, block.hash, "v2"))
      const finalizing = coord.handleMessage(bftMsg("commit", 1n, block.hash, "v3"))
      await sleep(5)
      assert.equal(applyStarted, true, "height 1 finalized; applyBlock in flight")
      await coord.handleMessage({ ...bftMsg("prepare", 2n, peerHash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", 2n, peerHash, "v3"), stateRoot: peerRoot })
      assert.equal(fireCount, 0, "height 2 is the next round after finalized height 1, not a stall")
      releaseApply()
      await finalizing
    } finally {
      releaseApply()
      coord.stop()
    }
  })

  // Same incident, other shape (03:58:03 @2113082): our round for H-1 is
  // still collecting votes while peers already prepare H. We hold block
  // H-1 and will finalize it within milliseconds — not a stall.
  it("suppresses fire while our own round for the previous height is active", async () => {
    let fireCount = 0
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
      getChainHeight: () => 0n,
    })
    try {
      await coord.handleReceivedBlock(makeBlock(1n, "v2"))
      assert.equal(coord.getRoundState().height, 1n)
      await coord.handleMessage({ ...bftMsg("prepare", 2n, peerHash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", 2n, peerHash, "v3"), stateRoot: peerRoot })
      assert.equal(fireCount, 0, "one round behind with H-1 in hand is not a stall")
      await coord.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v3"), stateRoot: peerRoot })
      assert.equal(fireCount, 1, "peers two heights past our active round → fire")
    } finally {
      coord.stop()
    }
  })

  // Review finding: a node whose chain tip is frozen (applyBlock failing)
  // still opens and finalizes LIVE rounds, so lastFinalizedHeight and the
  // active round track the network, not the tip. The one-block allowance
  // must not hide that dead-zone.
  it("still fires for a frozen tip even while finalizing live rounds", async () => {
    let fireCount = 0
    const hashAt = (n: bigint) => ("0x" + n.toString(16).padStart(64, "a")) as Hex
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => { throw new Error("parent missing") },
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
      getChainHeight: () => 10n,
    })
    try {
      for (let n = 20n; n < 25n; n++) {
        await coord.handleReceivedBlock({ ...makeBlock(n, n % 2n === 0n ? "v2" : "v3"), hash: hashAt(n) })
        for (const s of ["v2", "v3"]) await coord.handleMessage({ ...bftMsg("prepare", n, hashAt(n), s), stateRoot: peerRoot })
        for (const s of ["v2", "v3"]) await coord.handleMessage({ ...bftMsg("commit", n, hashAt(n), s), stateRoot: peerRoot })
      }
      assert.ok(fireCount > 0, `peers are 10+ blocks past our chain tip, fires=${fireCount}`)
    } finally {
      coord.stop()
    }
  })

  it("reports noLocalBlock only when we hold no block at the height", async () => {
    const infos: Array<{ noLocalBlock?: boolean }> = []
    const make = (localBlock: ChainBlock | null) => new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => {},
      onPeerQuorumDiverged: (info) => { infos.push(info) },
      getLocalBlock: async () => localBlock,
      getChainHeight: () => 0n,
    })
    const behind = make(null)
    await behind.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v2"), stateRoot: peerRoot })
    await behind.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v3"), stateRoot: peerRoot })
    // A different local block at the height is fork evidence: the H11
    // import must not be skipped just because our tip looks caught up.
    const forked = make({ ...makeBlock(3n), hash: ("0x" + "cd".repeat(32)) as Hex, stateRoot: peerRoot })
    await forked.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v2"), stateRoot: peerRoot })
    await forked.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v3"), stateRoot: peerRoot })
    assert.deepEqual(infos.map((i) => i.noLocalBlock), [true, false])
  })

  it("still fires when peers are two heights past the last finalized block", async () => {
    let fireCount = 0
    let releaseApply: () => void = () => {}
    const applying = new Promise<void>((r) => { releaseApply = r })
    let applyStarted = false
    const block = makeBlock(1n, "v2")
    const coord = new BftCoordinator({
      localId: "v1",
      validators,
      broadcastMessage: async () => {},
      onFinalized: async () => { applyStarted = true; await applying },
      onPeerQuorumDiverged: () => { fireCount++ },
      getLocalBlock: async () => null,
      getChainHeight: () => 0n,
    })
    try {
      await coord.handleReceivedBlock(block)
      await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v2"))
      await coord.handleMessage(bftMsg("prepare", 1n, block.hash, "v3"))
      await coord.handleMessage(bftMsg("commit", 1n, block.hash, "v2"))
      const finalizing = coord.handleMessage(bftMsg("commit", 1n, block.hash, "v3"))
      await sleep(5)
      assert.equal(applyStarted, true, "height 1 finalized; applyBlock in flight")
      await coord.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v2"), stateRoot: peerRoot })
      await coord.handleMessage({ ...bftMsg("prepare", 3n, peerHash, "v3"), stateRoot: peerRoot })
      assert.equal(fireCount, 1, "finalized 1, peers at 3 → genuinely behind")
      releaseApply()
      await finalizing
    } finally {
      releaseApply()
      coord.stop()
    }
  })
})
