/**
 * Regression: lost-vote livelock (88780, 2026-10-13 19:37 UTC, height 1934977).
 *
 * A ~13s network blip on two of four validators dropped the first (and only)
 * broadcast of their prepare votes. Every validator had prepared the SAME
 * block A, yet the round could never reach the 3-of-4 quorum because:
 *   - prepare votes were broadcast exactly once (only commits had a retry);
 *   - a round timeout discarded every collected vote and left the node idle
 *     (the proposer's block re-broadcast is dropped by peers' seenBlocks
 *     cache, so non-proposers never re-enter the round);
 *   - Phase R correctly refused every H15 fallback block at that height.
 * The chain stayed wedged until an external ledger-clear + atomic restart.
 *
 * This harness wires four in-process coordinators through a lossy network and
 * models production delivery: the proposed block reaches each peer once
 * (gossip dedup), the proposer keeps re-entering startRound(A) like
 * consensus.ts's re-broadcast path, and votes across a partitioned link are
 * silently dropped.
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { BftCoordinator } from "./bft-coordinator.ts"
import type { BftMessage } from "./bft.ts"
import type { ChainBlock, Hex } from "./blockchain-types.ts"

const IDS = ["v1", "v2", "v3", "v4"] as const
const DUMMY_SIG = ("0x" + "de".repeat(65)) as Hex
const ROUND_TIMEOUT_MS = 150 // prepare + commit timeout per round (each half)

function makeBlock(height: bigint): ChainBlock {
  return {
    number: height,
    hash: ("0x" + "a1".repeat(32)) as Hex,
    parentHash: ("0x" + "00".repeat(32)) as Hex,
    proposer: "v1",
    timestampMs: Date.now(),
    txs: [],
    finalized: false,
  }
}

interface Cluster {
  nodes: Map<string, BftCoordinator>
  finalized: Map<string, Hex>
  sent: Map<string, BftMessage[]>
  /** Gossip a block from `from` to every reachable peer that has not seen it. */
  gossip: (from: string, block: ChainBlock) => void
  isolate: (ids: string[]) => void
  heal: () => void
  stop: () => void
}

function makeCluster(
  chainTip: bigint,
  roundTimeoutMs = ROUND_TIMEOUT_MS,
  opts: { livenessTimeoutMs?: number } = {},
): Cluster {
  const isolated = new Set<string>()
  const nodes = new Map<string, BftCoordinator>()
  const finalized = new Map<string, Hex>()
  const sent = new Map<string, BftMessage[]>(IDS.map((id) => [id, []]))
  const linkUp = (a: string, b: string) => !isolated.has(a) && !isolated.has(b)
  // Per-node seenBlocks: a node only processes a block hash once, so a plain
  // re-gossip never reaches peers that already have it (prod p2p dedup).
  const seen = new Map<string, Set<Hex>>(IDS.map((id) => [id, new Set<Hex>()]))
  const gossip = (from: string, block: ChainBlock) => {
    seen.get(from)!.add(block.hash)
    for (const peer of IDS) {
      if (peer === from || !linkUp(from, peer) || seen.get(peer)!.has(block.hash)) continue
      seen.get(peer)!.add(block.hash)
      setImmediate(() => { void nodes.get(peer)!.handleReceivedBlock(block) })
    }
  }

  for (const id of IDS) {
    const coord = new BftCoordinator({
      localId: id,
      validators: IDS.map((v) => ({ id: v, stake: 100n })),
      prepareTimeoutMs: roundTimeoutMs / 2,
      commitTimeoutMs: roundTimeoutMs / 2,
      voteRetryIntervalMs: 40,
      livenessTimeoutMs: opts.livenessTimeoutMs,
      regossipBlock: (block) => gossip(id, block),
      getChainHeight: () => (finalized.has(id) ? chainTip + 1n : chainTip),
      broadcastMessage: async (msg: BftMessage) => {
        sent.get(id)!.push(msg)
        for (const peer of IDS) {
          if (peer === id || !linkUp(id, peer)) continue
          const copy: BftMessage = { ...msg, signature: msg.signature || DUMMY_SIG }
          setImmediate(() => { void nodes.get(peer)!.handleMessage(copy) })
        }
      },
      onFinalized: async (block) => { finalized.set(id, block.hash) },
    })
    nodes.set(id, coord)
  }

  return {
    nodes,
    finalized,
    sent,
    gossip,
    isolate: (ids) => { for (const i of ids) isolated.add(i) },
    heal: () => isolated.clear(),
    stop: () => { for (const n of nodes.values()) n.stop() },
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (cond()) return true
    await sleep(10)
  }
  return cond()
}

describe("BFT lost-vote livelock (2026-10-13 height 1934977)", () => {
  it("finalizes after a partition heals, without a restart, when every node prepared the same block", async () => {
    const tip = 1_934_976n
    const cluster = makeCluster(tip)
    const block = makeBlock(tip + 1n)
    try {
      // v3 + v4 lose connectivity right as block A goes out: they still
      // received the block, but every vote to/from them is dropped.
      cluster.isolate(["v3", "v4"])
      await cluster.nodes.get("v1")!.startRound(block)
      for (const id of ["v2", "v3", "v4"]) {
        await cluster.nodes.get(id)!.handleReceivedBlock(block)
      }

      // Partition outlasts several round timeouts (13s vs 10s in prod).
      await sleep(ROUND_TIMEOUT_MS * 3)
      assert.equal(cluster.finalized.size, 0, "no quorum is possible while 2 of 4 are cut off")
      cluster.heal()

      // consensus.ts keeps re-entering startRound on the proposer; peers'
      // seenBlocks cache drops the re-gossiped block, so they get nothing.
      const rebroadcast = setInterval(() => {
        void cluster.nodes.get("v1")!.startRound(block).catch(() => {})
      }, ROUND_TIMEOUT_MS)
      try {
        const ok = await waitFor(() => cluster.finalized.size === IDS.length, ROUND_TIMEOUT_MS * 12)
        assert.ok(ok, `expected all 4 to finalize after heal, got ${[...cluster.finalized.keys()].join(",") || "none"}`)
      } finally {
        clearInterval(rebroadcast)
      }
      for (const hash of cluster.finalized.values()) assert.equal(hash, block.hash)
    } finally {
      cluster.stop()
    }
  })

  it("never votes for a second block at the height while recovering (no self-equivocation)", async () => {
    const tip = 500n
    const cluster = makeCluster(tip)
    const block = makeBlock(tip + 1n)
    try {
      cluster.isolate(["v3", "v4"])
      const v3 = cluster.nodes.get("v3")!
      await cluster.nodes.get("v1")!.startRound(block)
      for (const id of ["v2", "v3", "v4"]) await cluster.nodes.get(id)!.handleReceivedBlock(block)

      // An H15 fallback proposer builds a different block B at the same height.
      const fallback: ChainBlock = { ...block, hash: ("0x" + "b2".repeat(32)) as Hex, proposer: "v3" }
      await sleep(ROUND_TIMEOUT_MS * 2)
      await v3.startRound(fallback)
      cluster.heal()
      const ok = await waitFor(() => cluster.finalized.size === IDS.length, ROUND_TIMEOUT_MS * 12)
      assert.ok(ok, "cluster should still finalize block A")

      for (const id of IDS) {
        const votedHashes = new Set(cluster.sent.get(id)!.map((m) => m.blockHash))
        assert.deepEqual([...votedHashes], [block.hash], `${id} must only ever vote for block A`)
        assert.equal(cluster.finalized.get(id), block.hash)
      }
    } finally {
      cluster.stop()
    }
  })

  it("recovers via prepare retransmission well before a long round timeout fires", async () => {
    // Production round timeouts reach 60s (v3 at 1934977); waiting for a
    // timeout-driven re-entry would stall the chain that long per blip.
    const tip = 900n
    const longTimeoutMs = 20_000
    const cluster = makeCluster(tip, longTimeoutMs)
    const block = makeBlock(tip + 1n)
    try {
      cluster.isolate(["v3", "v4"])
      await cluster.nodes.get("v1")!.startRound(block)
      for (const id of ["v2", "v3", "v4"]) await cluster.nodes.get(id)!.handleReceivedBlock(block)
      await sleep(100)
      assert.equal(cluster.finalized.size, 0)
      cluster.heal()
      const ok = await waitFor(() => cluster.finalized.size === IDS.length, 1_500)
      assert.ok(ok, `expected recovery inside 1.5s, got ${[...cluster.finalized.keys()].join(",") || "none"}`)
    } finally {
      cluster.stop()
    }
  })

  it("recovers when the partition swallowed the block itself, not just the votes", async () => {
    // v3 + v4 never receive block A. While rounds stay active consensus.ts
    // does not re-broadcast the proposal, so recovery depends on the
    // coordinator re-gossiping the block when it re-enters the round.
    const tip = 1_200n
    const cluster = makeCluster(tip)
    const block = makeBlock(tip + 1n)
    try {
      cluster.isolate(["v3", "v4"])
      await cluster.nodes.get("v1")!.startRound(block)
      cluster.gossip("v1", block)
      await sleep(ROUND_TIMEOUT_MS * 3)
      assert.equal(cluster.finalized.size, 0)
      cluster.heal()
      const ok = await waitFor(() => cluster.finalized.size === IDS.length, ROUND_TIMEOUT_MS * 12)
      assert.ok(ok, `expected all 4 to finalize, got ${[...cluster.finalized.keys()].join(",") || "none"}`)
    } finally {
      cluster.stop()
    }
  })

  it("survives a partition longer than the liveness watchdog window", async () => {
    // The 5-min watchdog force-clears rounds; it must re-enter the prepared
    // height rather than drop back to the idle state that caused the stall.
    const tip = 1_500n
    const cluster = makeCluster(tip, ROUND_TIMEOUT_MS, { livenessTimeoutMs: 200 })
    const block = makeBlock(tip + 1n)
    try {
      cluster.isolate(["v3", "v4"])
      await cluster.nodes.get("v1")!.startRound(block)
      cluster.gossip("v1", block)
      cluster.isolate(["v3", "v4"])
      for (const id of ["v3", "v4"]) await cluster.nodes.get(id)!.handleReceivedBlock(block)
      await sleep(900) // several watchdog windows
      assert.equal(cluster.finalized.size, 0)
      cluster.heal()
      const ok = await waitFor(() => cluster.finalized.size === IDS.length, ROUND_TIMEOUT_MS * 12)
      assert.ok(ok, `expected all 4 to finalize, got ${[...cluster.finalized.keys()].join(",") || "none"}`)
    } finally {
      cluster.stop()
    }
  })
})
