import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  extractVerifiedRewards,
  nodeIdToAddress,
  CoreSetReader,
  type CoreSetReaderDeps,
} from "./core-set-reader.ts"
import { buildRewardTree } from "../../services/common/reward-tree.ts"
import type { RewardManifest } from "./reward-manifest.ts"
import type { Hex32 } from "../../services/common/pose-types.ts"
import { SigningKey, keccak256 } from "ethers"

const EPOCH = 100
const nid = (b: string) => `0x${b.repeat(32)}` as Hex32
// Candidate with a real pubkey → registry nodeId (keccak(pubkey[1:])) + PoSe
// nodeId (keccak(pubkey)); mirrors how the two contracts derive ids.
const candKey = (tag: string) => {
  const pubkey = SigningKey.computePublicKey("0x" + tag.padStart(64, "0"), false)
  const regNodeId = keccak256("0x" + pubkey.slice(4)) as Hex32
  const poseNodeId = keccak256(pubkey) as Hex32
  return { pubkey, regNodeId, poseNodeId, address: ("0x" + regNodeId.slice(-40)).toLowerCase() }
}
const ZERO_ROOT = `0x${"0".repeat(64)}`

// Build a manifest whose leaves reproduce a real Merkle root for EPOCH.
function makeManifest(entries: Array<{ nodeId: Hex32; amount: bigint }>): {
  manifest: RewardManifest
  root: string
} {
  const leaves = entries.map((e) => ({ epochId: BigInt(EPOCH), nodeId: e.nodeId, amount: e.amount }))
  const root = buildRewardTree(leaves).root
  const manifest: RewardManifest = {
    epochId: EPOCH,
    rewardRoot: root,
    totalReward: "0",
    slashTotal: "0",
    treasuryDelta: "0",
    leaves: entries.map((e) => ({ nodeId: e.nodeId, amount: e.amount.toString() })),
    proofs: {},
    scoringInputsHash: "0x",
    generatedAtMs: 0,
  }
  return { manifest, root }
}

describe("core-set-reader / extractVerifiedRewards", () => {
  const entries = [
    { nodeId: nid("aa"), amount: 100n },
    { nodeId: nid("bb"), amount: 200n },
    { nodeId: nid("cc"), amount: 50n },
  ]

  it("returns per-node rewards when the manifest reproduces the on-chain root", () => {
    const { manifest, root } = makeManifest(entries)
    const rewards = extractVerifiedRewards(manifest, root, EPOCH)
    assert.equal(rewards.get(nid("aa").toLowerCase()), 100n)
    assert.equal(rewards.get(nid("bb").toLowerCase()), 200n)
    assert.equal(rewards.get(nid("cc").toLowerCase()), 50n)
  })

  it("drops rewards (empty) when the manifest does NOT match the on-chain root", () => {
    const { manifest } = makeManifest(entries)
    const wrongRoot = `0x${"12".repeat(32)}`
    const rewards = extractVerifiedRewards(manifest, wrongRoot, EPOCH)
    assert.equal(rewards.size, 0)
  })

  it("drops rewards when the on-chain root is zero (epoch unfinalized)", () => {
    const { manifest } = makeManifest(entries)
    assert.equal(extractVerifiedRewards(manifest, ZERO_ROOT, EPOCH).size, 0)
  })

  it("drops rewards when the manifest is missing", () => {
    assert.equal(extractVerifiedRewards(null, `0x${"aa".repeat(32)}`, EPOCH).size, 0)
  })

  it("drops rewards when a tampered leaf breaks the root", () => {
    const { manifest, root } = makeManifest(entries)
    // Tamper one amount → rebuilt root no longer matches the (untampered) on-chain root.
    const tampered: RewardManifest = {
      ...manifest,
      leaves: manifest.leaves.map((l, i) => (i === 0 ? { ...l, amount: "999999" } : l)),
    }
    assert.equal(extractVerifiedRewards(tampered, root, EPOCH).size, 0)
  })
})

describe("core-set-reader / nodeIdToAddress", () => {
  it("derives the lowercase trailing-20-byte address", () => {
    assert.equal(nodeIdToAddress(nid("Ab")), `0x${"ab".repeat(20)}`)
  })
})

describe("core-set-reader / CoreSetReader.buildCandidates", () => {
  const A = candKey("a1")
  const B = candKey("b2")
  const active = [
    { nodeId: A.regNodeId, address: A.address, stake: 32n, pubkey: A.pubkey },
    { nodeId: B.regNodeId, address: B.address, stake: 40n, pubkey: B.pubkey },
  ]

  function makeDeps(over: Partial<CoreSetReaderDeps> = {}): CoreSetReaderDeps {
    return {
      getActiveValidators: () => active,
      // bond keyed by PoSe nodeId (proves the reader looks it up correctly)
      getBond: async (poseNid) => (poseNid.toLowerCase() === A.poseNodeId.toLowerCase() ? 5n : 7n),
      getEpochRewardRoot: async () => ZERO_ROOT,
      loadRewardManifest: () => null,
      ...over,
    }
  }

  it("assembles candidates with stake + bond (by PoSe nodeId), reward 0 when unverifiable", async () => {
    const reader = new CoreSetReader(makeDeps())
    const c = await reader.buildCandidates(EPOCH)
    assert.equal(c.length, 2)
    const aa = c.find((x) => x.nodeId === A.regNodeId)!
    assert.equal(aa.stake, 32n)
    assert.equal(aa.bond, 5n)
    assert.equal(aa.rewardAmount, 0n)
    assert.equal(aa.address, A.address)
  })

  it("includes verified reward amounts (keyed by PoSe nodeId) when the manifest matches", async () => {
    const { manifest, root } = makeManifest([
      { nodeId: A.poseNodeId, amount: 111n },
      { nodeId: B.poseNodeId, amount: 222n },
    ])
    const reader = new CoreSetReader(
      makeDeps({ getEpochRewardRoot: async () => root, loadRewardManifest: () => manifest }),
    )
    const c = await reader.buildCandidates(EPOCH)
    assert.equal(c.find((x) => x.nodeId === A.regNodeId)!.rewardAmount, 111n)
    assert.equal(c.find((x) => x.nodeId === B.regNodeId)!.rewardAmount, 222n)
  })

  it("returns empty when there are no active validators", async () => {
    const reader = new CoreSetReader(makeDeps({ getActiveValidators: () => [] }))
    assert.deepEqual(await reader.buildCandidates(EPOCH), [])
  })
})
