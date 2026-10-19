// End-to-end cross-language parity: proves that a storage reward tree built by
// the real agent path (computeStorageRewards → buildRewardRoot, via merkle.ts)
// is claimable by StorageRewardManager on-chain — i.e. the TS Merkle root/proofs
// verify under the Solidity MerkleProofLite algorithm with the exact leaf
// encoding the contract recomputes. This closes the TS↔Solidity gap that a
// pure hardhat test (which hand-builds the tree) cannot.

import test from "node:test"
import assert from "node:assert/strict"
import { solidityPackedKeccak256 } from "ethers"
import { computeStorageRewards, type EpochNodeStats } from "../verifier/scoring.ts"
import { buildRewardRoot } from "./reward-tree.ts"

// Faithful JS mirror of contracts MerkleProofLite.verify: sorted-pair by numeric
// (bytes32) value, keccak256(abi.encodePacked(a,b)).
function solidityVerify(proof: string[], root: string, leaf: string): boolean {
  let computed = leaf
  for (const el of proof) {
    computed = BigInt(computed) <= BigInt(el)
      ? solidityPackedKeccak256(["bytes32", "bytes32"], [computed, el])
      : solidityPackedKeccak256(["bytes32", "bytes32"], [el, computed])
  }
  return computed.toLowerCase() === root.toLowerCase()
}

// The leaf hash the contract recomputes in claim():
// keccak256(abi.encodePacked(uint64 epochId, bytes32 nodeId, uint256 amount)).
function solidityLeaf(epochId: bigint, nodeId: string, amount: bigint): string {
  return solidityPackedKeccak256(["uint64", "bytes32", "uint256"], [epochId, nodeId, amount])
}

function nodeId(n: number): `0x${string}` {
  return `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`
}

test("storage reward proofs verify under Solidity MerkleProofLite for varied node counts", () => {
  const epochId = 496_777n
  const pool = 1_000_000_000_000_000_000n // 1 MESH (1e18)

  for (const N of [1, 2, 3, 4, 5, 8, 13]) {
    const stats: EpochNodeStats[] = Array.from({ length: N }, (_, i) => ({
      nodeId: nodeId(i + 1),
      uptimeBps: 9000,
      storageBps: 9000, // > threshold so every node earns a storage reward
      relayBps: 5000,
      storageGb: BigInt(50 + i * 37),
    }))

    const result = computeStorageRewards(pool, stats)
    const { root, leaves, proofs } = buildRewardRoot(epochId, result)
    assert.ok(leaves.length > 0, `N=${N}: expected non-empty reward tree`)

    let claimedSum = 0n
    for (const leaf of leaves) {
      // 1) leaf encoding matches what the contract recomputes
      const contractLeaf = solidityLeaf(epochId, leaf.nodeId, leaf.amount)
      // 2) the TS-built proof verifies under the Solidity algorithm
      const key = `${epochId}:${leaf.nodeId.toLowerCase()}`
      const proof = proofs.get(key)
      assert.ok(proof, `N=${N}: missing proof for ${key}`)
      assert.equal(
        solidityVerify(proof!, root, contractLeaf),
        true,
        `N=${N}: proof for node ${leaf.nodeId} must verify against root`,
      )
      claimedSum += leaf.amount
    }

    // Sum of claimable leaves is what the relayer submits as totalReward and is
    // never more than the pool (soft cap only ever trims).
    assert.ok(claimedSum <= pool, `N=${N}: claimable sum ${claimedSum} exceeds pool ${pool}`)
  }
})

test("a tampered amount no longer verifies (proof binds the exact leaf)", () => {
  const epochId = 1n
  const stats: EpochNodeStats[] = [
    { nodeId: nodeId(1), uptimeBps: 9000, storageBps: 9000, relayBps: 5000, storageGb: 100n },
    { nodeId: nodeId(2), uptimeBps: 9000, storageBps: 9000, relayBps: 5000, storageGb: 200n },
  ]
  const { root, leaves, proofs } = buildRewardRoot(epochId, computeStorageRewards(1_000_000n, stats))
  const leaf = leaves[0]
  const proof = proofs.get(`${epochId}:${leaf.nodeId.toLowerCase()}`)!
  // correct amount verifies, tampered amount does not
  assert.equal(solidityVerify(proof, root, solidityLeaf(epochId, leaf.nodeId, leaf.amount)), true)
  assert.equal(solidityVerify(proof, root, solidityLeaf(epochId, leaf.nodeId, leaf.amount + 1n)), false)
})
