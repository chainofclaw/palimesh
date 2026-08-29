/**
 * Core-set submitter — builds the CoreSetManager.finalizeCoreSet() call args
 * (candidate ids + reward amounts + Merkle proofs) for an epoch, and submits
 * them. The relayer runs this after the epoch reward root is finalized on-chain;
 * the contract verifies every proof against PoSeManagerV2.epochRewardRoots and
 * computes the ranking itself, so the submitter only supplies DATA + PROOFS.
 *
 * The proofs are generated with the SAME reward-tree construction the on-chain
 * root was built from (services/common/reward-tree.ts), so a candidate's leaf
 * verifies against the finalized root. Candidates with no reward leaf submit
 * amount 0 with an empty proof (perf component 0 for them).
 */

import { buildRewardTree } from "../../services/common/reward-tree.ts"
import type { RewardLeaf } from "../../services/common/pose-types-v2.ts"
import type { Hex32 } from "../../services/common/pose-types.ts"
import type { RewardManifest } from "./reward-manifest.ts"

export interface FinalizeCoreSetArgs {
  epochId: number
  candidateNodeIds: string[]
  rewardAmounts: bigint[]
  rewardProofs: string[][]
}

/**
 * Build finalizeCoreSet args. Pure. `candidateNodeIds` is the candidate pool
 * (active ValidatorRegistry members); `manifest` supplies the reward leaves for
 * the epoch (its root must equal the on-chain epochRewardRoots[epochId]).
 */
export function buildFinalizeArgs(
  epochId: number,
  candidateNodeIds: string[],
  manifest: RewardManifest | null,
): FinalizeCoreSetArgs {
  const amountByNode = new Map<string, bigint>()
  let tree: ReturnType<typeof buildRewardTree> | null = null

  if (manifest && Array.isArray(manifest.leaves) && manifest.leaves.length > 0) {
    const leaves: RewardLeaf[] = manifest.leaves.map((l) => ({
      epochId: BigInt(epochId),
      nodeId: l.nodeId as Hex32,
      amount: BigInt(l.amount),
    }))
    tree = buildRewardTree(leaves)
    for (const l of leaves) amountByNode.set(l.nodeId.toLowerCase(), l.amount)
  }

  const rewardAmounts: bigint[] = []
  const rewardProofs: string[][] = []
  for (const nid of candidateNodeIds) {
    const amount = amountByNode.get(nid.toLowerCase()) ?? 0n
    rewardAmounts.push(amount)
    if (amount > 0n && tree) {
      const proof = tree.proofs.get(`${epochId}:${nid.toLowerCase()}`) ?? []
      rewardProofs.push([...proof])
    } else {
      rewardProofs.push([])
    }
  }

  return { epochId, candidateNodeIds: [...candidateNodeIds], rewardAmounts, rewardProofs }
}

/** Minimal contract surface needed to submit (ethers.Contract satisfies this). */
export interface CoreSetManagerContract {
  isCoreSetFinalized(epochId: bigint): Promise<boolean>
  finalizeCoreSet(
    epochId: bigint,
    candidateNodeIds: string[],
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
    args.candidateNodeIds,
    args.rewardAmounts,
    args.rewardProofs,
  )
  await tx.wait()
  return true
}
