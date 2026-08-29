/**
 * Core-set submitter — builds the CoreSetManager.finalizeCoreSet() call args
 * (candidate pubkeys + reward amounts + Merkle proofs) for an epoch, and submits
 * them. The relayer runs this after the epoch reward root is finalized on-chain;
 * the contract derives both nodeIds from each pubkey, verifies every proof
 * against PoSeManagerV2.epochRewardRoots, and computes the ranking itself — the
 * submitter only supplies DATA + PROOFS.
 *
 * Candidates are supplied as 65-byte uncompressed pubkeys, NOT nodeIds, because
 * ValidatorRegistry (keccak256(pubkey[1:])) and PoSeManagerV2 (keccak256(pubkey))
 * derive DIFFERENT nodeIds from the same key. The reward manifest + on-chain
 * reward root are keyed by the PoSe nodeId, so proofs here are built and looked
 * up by keccak256(pubkey). Candidates with no reward leaf submit amount 0 with an
 * empty proof (perf component 0 for them).
 */

import { keccak256 } from "ethers"
import { buildRewardTree } from "../../services/common/reward-tree.ts"
import type { RewardLeaf } from "../../services/common/pose-types-v2.ts"
import type { Hex32 } from "../../services/common/pose-types.ts"
import type { RewardManifest } from "./reward-manifest.ts"

export interface FinalizeCoreSetArgs {
  epochId: number
  pubkeys: string[]
  rewardAmounts: bigint[]
  rewardProofs: string[][]
}

/** PoSe nodeId = keccak256(65-byte uncompressed pubkey). */
export function poseNodeIdFromPubkey(pubkey: string): string {
  return keccak256(pubkey)
}

/**
 * Build finalizeCoreSet args. Pure. `candidatePubkeys` are the candidate pool's
 * 65-byte pubkeys (active ValidatorRegistry members); `manifest` supplies the
 * PoSe reward leaves for the epoch (its root must equal epochRewardRoots[epochId]).
 * Reward amounts + proofs are keyed by the PoSe nodeId derived from each pubkey.
 */
export function buildFinalizeArgs(
  epochId: number,
  candidatePubkeys: string[],
  manifest: RewardManifest | null,
): FinalizeCoreSetArgs {
  const amountByPoseNode = new Map<string, bigint>()
  let tree: ReturnType<typeof buildRewardTree> | null = null

  if (manifest && Array.isArray(manifest.leaves) && manifest.leaves.length > 0) {
    const leaves: RewardLeaf[] = manifest.leaves.map((l) => ({
      epochId: BigInt(epochId),
      nodeId: l.nodeId as Hex32, // manifest nodeId = PoSe nodeId
      amount: BigInt(l.amount),
    }))
    tree = buildRewardTree(leaves)
    for (const l of leaves) amountByPoseNode.set(l.nodeId.toLowerCase(), l.amount)
  }

  const rewardAmounts: bigint[] = []
  const rewardProofs: string[][] = []
  for (const pubkey of candidatePubkeys) {
    const poseNodeId = poseNodeIdFromPubkey(pubkey).toLowerCase()
    const amount = amountByPoseNode.get(poseNodeId) ?? 0n
    rewardAmounts.push(amount)
    if (amount > 0n && tree) {
      const proof = tree.proofs.get(`${epochId}:${poseNodeId}`) ?? []
      rewardProofs.push([...proof])
    } else {
      rewardProofs.push([])
    }
  }

  return { epochId, pubkeys: [...candidatePubkeys], rewardAmounts, rewardProofs }
}

/** Minimal contract surface needed to submit (ethers.Contract satisfies this). */
export interface CoreSetManagerContract {
  isCoreSetFinalized(epochId: bigint): Promise<boolean>
  finalizeCoreSet(
    epochId: bigint,
    pubkeys: string[],
    rewardAmounts: bigint[],
    rewardProofs: string[][],
  ): Promise<{ wait: () => Promise<unknown> }>
}

/**
 * Submit finalizeCoreSet unless the epoch is already finalized on-chain
 * (idempotent). Returns true when a tx was sent.
 */
export async function submitFinalizeCoreSet(
  contract: CoreSetManagerContract,
  args: FinalizeCoreSetArgs,
): Promise<boolean> {
  const already = await contract.isCoreSetFinalized(BigInt(args.epochId))
  if (already) return false
  const tx = await contract.finalizeCoreSet(
    BigInt(args.epochId),
    args.pubkeys,
    args.rewardAmounts,
    args.rewardProofs,
  )
  await tx.wait()
  return true
}
