import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildFinalizeArgs, submitFinalizeCoreSet } from "./core-set-submitter.ts"
import { buildRewardTree, hashRewardLeaf } from "../../services/common/reward-tree.ts"
import { keccak256Hex } from "../../services/relayer/keccak256.ts"
import type { RewardManifest } from "./reward-manifest.ts"
import type { Hex32 } from "../../services/common/pose-types.ts"

const EPOCH = 100
const nid = (b: string) => `0x${b.repeat(32)}` as Hex32

function makeManifest(entries: Array<{ nodeId: Hex32; amount: bigint }>): RewardManifest {
  const leaves = entries.map((e) => ({ epochId: BigInt(EPOCH), nodeId: e.nodeId, amount: e.amount }))
  const root = buildRewardTree(leaves).root
  return {
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
}

// Mirror MerkleProofLite.verify (sorted-pair keccak) to confirm proofs verify.
function foldProof(leaf: string, proof: string[]): string {
  let c = leaf.toLowerCase()
  for (const p of proof) {
    const pe = p.toLowerCase()
    const [a, b] = c <= pe ? [c, pe] : [pe, c]
    c = "0x" + keccak256Hex(Buffer.concat([Buffer.from(a.slice(2), "hex"), Buffer.from(b.slice(2), "hex")]))
  }
  return c
}

describe("core-set-submitter / buildFinalizeArgs", () => {
  const entries = [
    { nodeId: nid("a1"), amount: 300n },
    { nodeId: nid("b2"), amount: 100n },
  ]

  it("maps reward amounts per candidate (0 when absent from manifest)", () => {
    const manifest = makeManifest(entries)
    const candidates = [nid("a1"), nid("b2"), nid("c3")] // c3 has no reward leaf
    const args = buildFinalizeArgs(EPOCH, candidates, manifest)
    assert.deepEqual(args.rewardAmounts, [300n, 100n, 0n])
    assert.equal(args.candidateNodeIds.length, 3)
  })

  it("emits an empty proof for zero-reward candidates and a real proof otherwise", () => {
    const manifest = makeManifest(entries)
    const args = buildFinalizeArgs(EPOCH, [nid("a1"), nid("c3")], manifest)
    assert.ok(args.rewardProofs[0].length > 0, "a1 has a non-empty proof")
    assert.deepEqual(args.rewardProofs[1], []) // c3 zero reward → empty proof
  })

  it("generated proofs verify against the manifest root (correct proof key)", () => {
    const manifest = makeManifest(entries)
    const root = manifest.rewardRoot.toLowerCase()
    const args = buildFinalizeArgs(EPOCH, [nid("a1"), nid("b2")], manifest)
    for (let i = 0; i < 2; i++) {
      const leaf = hashRewardLeaf({ epochId: BigInt(EPOCH), nodeId: entries[i].nodeId, amount: entries[i].amount })
      assert.equal(foldProof(leaf, args.rewardProofs[i]), root, `proof ${i} must fold to root`)
    }
  })

  it("handles a null/empty manifest (all rewards 0, empty proofs)", () => {
    const args = buildFinalizeArgs(EPOCH, [nid("a1"), nid("b2")], null)
    assert.deepEqual(args.rewardAmounts, [0n, 0n])
    assert.deepEqual(args.rewardProofs, [[], []])
  })
})

describe("core-set-submitter / submitFinalizeCoreSet", () => {
  it("submits when not finalized and skips when already finalized", async () => {
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
    const args = buildFinalizeArgs(EPOCH, [nid("a1")], null)
    const sent1 = await submitFinalizeCoreSet(contract, args)
    assert.equal(sent1, true)
    assert.equal(calls.length, 1)
    const sent2 = await submitFinalizeCoreSet(contract, args)
    assert.equal(sent2, false) // already finalized → no second tx
    assert.equal(calls.length, 1)
  })
})
