/**
 * Core-set reader — assembles the ranking candidate list for a target epoch
 * from canonical on-chain data, so every node feeds byte-identical inputs into
 * the deterministic selector (runtime/lib/core-set-selector.ts).
 *
 * Three composite-score inputs, each anchored to on-chain state:
 *   - stake: ValidatorRegistry active set (only staked nodes are core-eligible).
 *   - bond:  PoSeManagerV2 node bond.
 *   - reward: the per-epoch PoSe reward amount (performance proxy), taken from
 *     the reward manifest but ONLY after the manifest is Merkle-verified against
 *     the on-chain finalized root PoSeManagerV2.epochRewardRoots[epochId].
 *
 * Determinism guard: if the manifest is missing, the on-chain root is
 * zero/unfinalized, or the manifest does not reproduce the on-chain root, the
 * reward component is dropped UNIFORMLY (all rewardAmount = 0) so the score
 * falls back to stake+bond identically on every node — no node ever ranks on
 * unverified data, and no two nodes rank on different data.
 *
 * On-chain access is injected (CoreSetReaderDeps) so the pure verification and
 * assembly logic is unit-testable without a live chain; the driver wires the
 * real ethers contract calls.
 */

import { keccak256 } from "ethers"
import type { CoreCandidate } from "./core-set-selector.ts"
import type { RewardManifest } from "./reward-manifest.ts"
import { buildRewardTree } from "../../services/common/reward-tree.ts"
import type { RewardLeaf } from "../../services/common/pose-types-v2.ts"
import type { Hex32 } from "../../services/common/pose-types.ts"

const ZERO_ROOT = `0x${"0".repeat(64)}`

/** Lowercased BFT id from a bytes32 nodeId: 0x + trailing 20 bytes (40 hex). */
export function nodeIdToAddress(nodeId: string): string {
  return ("0x" + nodeId.slice(-40)).toLowerCase()
}

/**
 * PoSe nodeId = keccak256(65-byte uncompressed pubkey). Differs from the
 * ValidatorRegistry nodeId (keccak256(pubkey[1:])), so bond/reward lookups must
 * use THIS id, not the registry id. Returns "" when the pubkey is unavailable.
 */
export function poseNodeIdFromPubkey(pubkey: string | undefined): string {
  if (!pubkey || pubkey.length < 4) return ""
  try {
    return keccak256(pubkey).toLowerCase()
  } catch {
    return ""
  }
}

/**
 * Verify a reward manifest against the on-chain finalized root and return the
 * per-node reward amounts (keyed by lowercase nodeId). Returns an EMPTY map —
 * meaning "drop the perf component this epoch" — when the manifest is missing,
 * the on-chain root is zero, or the manifest's leaves do not reproduce the
 * on-chain root. Pure and side-effect free.
 */
export function extractVerifiedRewards(
  manifest: RewardManifest | null,
  onchainRoot: string,
  epochId: number,
): Map<string, bigint> {
  const empty = new Map<string, bigint>()
  if (!manifest) return empty
  if (!onchainRoot || onchainRoot.toLowerCase() === ZERO_ROOT) return empty
  if (!Array.isArray(manifest.leaves) || manifest.leaves.length === 0) return empty

  let leaves: RewardLeaf[]
  try {
    leaves = manifest.leaves.map((l) => ({
      epochId: BigInt(epochId),
      nodeId: l.nodeId as Hex32,
      amount: BigInt(l.amount),
    }))
  } catch {
    // Malformed amount/nodeId → treat as unverifiable, drop perf uniformly.
    return empty
  }

  const rebuilt = buildRewardTree(leaves).root
  if (rebuilt.toLowerCase() !== onchainRoot.toLowerCase()) {
    return empty
  }

  const out = new Map<string, bigint>()
  for (const l of leaves) {
    out.set(l.nodeId.toLowerCase(), l.amount)
  }
  return out
}

/**
 * One entry from the candidate pool. `address` is the BFT id used by consensus:
 * for the registry path it is nodeIdToAddress(nodeId); for the static-config
 * path it is the config validator id verbatim. Carried explicitly so the two
 * id conventions never get mixed up by deriving inside the reader.
 */
export interface ActiveValidator {
  nodeId: string
  address: string
  stake: bigint
  /** 65-byte uncompressed pubkey; used to derive the PoSe nodeId for bond/reward. */
  pubkey?: string
}

/** Injected on-chain accessors (wired to ethers by the driver). */
export interface CoreSetReaderDeps {
  /** Candidate pool + stake — only staked ValidatorRegistry members are eligible. */
  getActiveValidators: () => ActiveValidator[]
  /** PoSeManagerV2 bond for a PoSe nodeId; 0 when the node has no PoSe bond. */
  getBond: (poseNodeId: string) => Promise<bigint>
  /** On-chain PoSeManagerV2.epochRewardRoots[epochId] (finalized reward root). */
  getEpochRewardRoot: (epochId: number) => Promise<string>
  /** Load the local reward manifest for an epoch (expanded, Merkle-verified below). */
  loadRewardManifest: (epochId: number) => RewardManifest | null
}

export class CoreSetReader {
  private readonly deps: CoreSetReaderDeps

  constructor(deps: CoreSetReaderDeps) {
    this.deps = deps
  }

  /**
   * Build the candidate list for `targetEpoch`. Reward amounts are included only
   * when the manifest verifies against the on-chain root; otherwise all rewards
   * are 0 (perf component dropped uniformly).
   */
  async buildCandidates(targetEpoch: number): Promise<CoreCandidate[]> {
    const active = this.deps.getActiveValidators()
    if (active.length === 0) return []

    const [onchainRoot, manifest] = await Promise.all([
      this.deps.getEpochRewardRoot(targetEpoch).catch(() => ZERO_ROOT),
      Promise.resolve(this.deps.loadRewardManifest(targetEpoch)),
    ])
    const rewards = extractVerifiedRewards(manifest, onchainRoot, targetEpoch)

    const candidates: CoreCandidate[] = []
    for (const v of active) {
      // Bond + reward are keyed by the PoSe nodeId (keccak256(pubkey)), NOT the
      // registry nodeId. Without a pubkey we cannot derive it → bond/reward drop
      // to 0 for that candidate (score falls back to stake).
      const poseNodeId = poseNodeIdFromPubkey(v.pubkey)
      const bond = poseNodeId ? await this.deps.getBond(poseNodeId).catch(() => 0n) : 0n
      candidates.push({
        nodeId: v.nodeId,
        address: v.address,
        stake: v.stake,
        bond,
        rewardAmount: poseNodeId ? rewards.get(poseNodeId) ?? 0n : 0n,
      })
    }
    return candidates
  }
}
