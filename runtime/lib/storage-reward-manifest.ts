// Storage reward manifest: the $MESH storage-settlement analogue of
// reward-manifest.ts. Agent writes it, relayer reads it and submits to
// StorageRewardManager.submitStorageEpoch. Kept fully separate from the
// RewardManifest ($PALI uptime/relay) path so the live V2 pipeline is untouched.

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs"
import { verifyTypedData } from "ethers"
import { STORAGE_REWARD_MANIFEST_TYPES } from "../../node/src/crypto/eip712-types.ts"
import { stableStringifyForHash } from "./reward-manifest.ts"

export interface StorageRewardLeafEntry {
  nodeId: string
  amount: string // stringified bigint
}

export interface StorageRewardManifest {
  epochId: number
  rewardRoot: string
  totalReward: string // stringified bigint — the epoch's total $MESH
  leaves: StorageRewardLeafEntry[]
  proofs: Record<string, string[]> // key: "epochId:nodeId" → proof hashes
  scoringInputsHash: string
  generatedAtMs: number
  sourceNodeCount?: number
  scoredNodeCount?: number
  generatorSignature?: string
  generatorAddress?: string
}

export function storageManifestPath(dir: string, epochId: number): string {
  return `${dir}/storage-reward-epoch-${epochId}.json`
}

export function writeStorageRewardManifest(dir: string, manifest: StorageRewardManifest): string {
  mkdirSync(dir, { recursive: true })
  const path = storageManifestPath(dir, manifest.epochId)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(manifest, null, 2))
  renameSync(tmp, path)
  return path
}

export function readStorageRewardManifest(dir: string, epochId: number): StorageRewardManifest | null {
  const path = storageManifestPath(dir, epochId)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as StorageRewardManifest
  } catch {
    return null
  }
}

export interface StorageManifestSigningPayload {
  epochId: bigint
  rewardRoot: string
  totalReward: bigint
  scoringInputsHash: string
}

export function storageManifestSigningPayload(manifest: StorageRewardManifest): StorageManifestSigningPayload {
  return {
    epochId: BigInt(manifest.epochId),
    rewardRoot: manifest.rewardRoot,
    totalReward: BigInt(manifest.totalReward),
    scoringInputsHash: manifest.scoringInputsHash,
  }
}

export interface StorageManifestVerifyResult {
  valid: boolean
  recoveredAddress?: string
  error?: string
}

/**
 * Fail-closed EIP-712 verification, mirroring verifyManifestSignature but bound
 * to STORAGE_REWARD_MANIFEST_TYPES. Requires an authoritative signer (offline
 * `expectedSigner` overrides the self-claimed generatorAddress); a signature
 * with no address to cross-check against is rejected.
 */
export function verifyStorageManifestSignature(
  manifest: StorageRewardManifest,
  domain: { name: string; version: string; chainId: bigint | number; verifyingContract: string },
  opts: { expectedSigner?: string } = {},
): StorageManifestVerifyResult {
  if (!manifest.generatorSignature) {
    return { valid: false, error: "missing" }
  }
  const expectedFromOpts = opts.expectedSigner ? opts.expectedSigner.toLowerCase() : undefined
  const expectedFromManifest = manifest.generatorAddress ? manifest.generatorAddress.toLowerCase() : undefined
  if (!expectedFromOpts && !expectedFromManifest) {
    return { valid: false, error: "no_signer_to_verify_against" }
  }
  try {
    const payload = storageManifestSigningPayload(manifest)
    const recovered = verifyTypedData(domain, STORAGE_REWARD_MANIFEST_TYPES, payload, manifest.generatorSignature)
    const recoveredLower = recovered.toLowerCase()
    const required = expectedFromOpts ?? expectedFromManifest!
    if (recoveredLower !== required) {
      return { valid: false, recoveredAddress: recoveredLower, error: "address_mismatch" }
    }
    return { valid: true, recoveredAddress: recoveredLower }
  } catch (err) {
    return { valid: false, error: `verify_failed: ${String(err)}` }
  }
}

/** Hash of the scoring inputs, for the manifest's scoringInputsHash field. */
export { stableStringifyForHash }
