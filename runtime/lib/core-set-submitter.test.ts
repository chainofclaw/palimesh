import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { SigningKey, keccak256 } from "ethers"
import { buildFinalizeArgs, submitFinalizeCoreSet, poseNodeIdFromPubkey } from "./core-set-submitter.ts"
import { buildRewardTree, hashRewardLeaf } from "../../services/common/reward-tree.ts"
import { keccak256Hex } from "../../services/relayer/keccak256.ts"
import type { RewardManifest } from "./reward-manifest.ts"
import type { Hex32 } from "../../services/common/pose-types.ts"

const EPOCH = 100

// Deterministic candidate: pubkey + PoSe nodeId (keccak of full pubkey).
function cand(privTag: string) {
  const pub = SigningKey.computePublicKey("0x" + privTag.padStart(64, "0"), false)
  return { pubkey: pub, poseNodeId: keccak256(pub) as Hex32 }
}

function makeManifest(entries: Array<{ poseNodeId: Hex32; amount: bigint }>): RewardManifest {
  const leaves = entries.map((e) => ({ epochId: BigInt(EPOCH), nodeId: e.poseNodeId, amount: e.amount }))
  const root = buildRewardTree(leaves).root
  return {
    epochId: EPOCH,
    rewardRoot: root,
    totalReward: "0",
    slashTotal: "0",
    treasuryDelta: "0",
    leaves: entries.map((e) => ({ nodeId: e.poseNodeId, amount: e.amount.toString() })),
    proofs: {},
    scoringInputsHash: "0x",
    generatedAtMs: 0,
  }
}

// Mirror MerkleProofLite.verify (sorted-pair keccak).
function foldProof(leaf: string, proof: string[]): string {
  let c = leaf.toLowerCase()
  for (const p of proof) {
    const pe = p.toLowerCase()
    const [a, b] = c <= pe ? [c, pe] : [pe, c]
    c = "0x" + keccak256Hex(Buffer.concat([Buffer.from(a.slice(2), "hex"), Buffer.from(b.slice(2), "hex")]))
  }
  return c
}

describe("core-set-submitter (pubkey-based)", () => {
  const a1 = cand("a1")
  const b2 = cand("b2")
  const c3 = cand("c3")
  const entries = [
    { poseNodeId: a1.poseNodeId, amount: 300n },
    { poseNodeId: b2.poseNodeId, amount: 100n },
  ]

  it("keys reward amounts by PoSe nodeId (derived from pubkey); 0 when absent", () => {
    const manifest = makeManifest(entries)
    const args = buildFinalizeArgs(EPOCH, [a1.pubkey, b2.pubkey, c3.pubkey], manifest)
    assert.deepEqual(args.rewardAmounts, [300n, 100n, 0n])
    assert.deepEqual(args.pubkeys, [a1.pubkey, b2.pubkey, c3.pubkey])
  })

  it("emits a real proof for rewarded candidates, empty for zero-reward", () => {
    const manifest = makeManifest(entries)
    const args = buildFinalizeArgs(EPOCH, [a1.pubkey, c3.pubkey], manifest)
    assert.ok(args.rewardProofs[0].length > 0)
    assert.deepEqual(args.rewardProofs[1], [])
  })

  it("proofs (keyed by PoSe nodeId) fold to the manifest root", () => {
    const manifest = makeManifest(entries)
    const root = manifest.rewardRoot.toLowerCase()
    const args = buildFinalizeArgs(EPOCH, [a1.pubkey, b2.pubkey], manifest)
    const leafFor = (e: { poseNodeId: Hex32; amount: bigint }) =>
      hashRewardLeaf({ epochId: BigInt(EPOCH), nodeId: e.poseNodeId, amount: e.amount })
    assert.equal(foldProof(leafFor(entries[0]), args.rewardProofs[0]), root)
    assert.equal(foldProof(leafFor(entries[1]), args.rewardProofs[1]), root)
  })

  it("poseNodeIdFromPubkey = keccak256(pubkey)", () => {
    assert.equal(poseNodeIdFromPubkey(a1.pubkey), keccak256(a1.pubkey))
  })

  it("null manifest → all rewards 0, empty proofs", () => {
    const args = buildFinalizeArgs(EPOCH, [a1.pubkey, b2.pubkey], null)
    assert.deepEqual(args.rewardAmounts, [0n, 0n])
    assert.deepEqual(args.rewardProofs, [[], []])
  })

  it("submitFinalizeCoreSet submits once, skips when already finalized", async () => {
    const calls: unknown[] = []
    let finalized = false
    const contract = {
      isCoreSetFinalized: async () => finalized,
      finalizeCoreSet: async (...a: unknown[]) => {
        calls.push(a)
        finalized = true
        return { wait: async () => undefined }
      },
    }
    const args = buildFinalizeArgs(EPOCH, [a1.pubkey], null)
    assert.equal(await submitFinalizeCoreSet(contract, args), true)
    assert.equal(calls.length, 1)
    assert.equal(await submitFinalizeCoreSet(contract, args), false)
    assert.equal(calls.length, 1)
  })
})
