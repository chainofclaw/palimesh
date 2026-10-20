import test from "node:test"
import assert from "node:assert/strict"
import { Wallet } from "ethers"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildDomain, STORAGE_REWARD_MANIFEST_TYPES } from "../../node/src/crypto/eip712-types.ts"
import {
  writeStorageRewardManifest,
  readStorageRewardManifest,
  storageManifestSigningPayload,
  verifyStorageManifestSignature,
  type StorageRewardManifest,
} from "./storage-reward-manifest.ts"

const wallet = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d")
const domain = buildDomain(88780n, "0x0000000000000000000000000000000000000001")
const NODE = `0x${"aa".repeat(32)}`

function baseManifest(): StorageRewardManifest {
  return {
    epochId: 42,
    rewardRoot: `0x${"11".repeat(32)}`,
    totalReward: "1000",
    leaves: [{ nodeId: NODE, amount: "1000" }],
    proofs: { [`42:${NODE}`]: [`0x${"bb".repeat(32)}`] },
    scoringInputsHash: `0x${"cc".repeat(32)}`,
    generatedAtMs: 123,
  }
}

test("storage manifest: write/read roundtrip", () => {
  const dir = mkdtempSync(join(tmpdir(), "srm-"))
  const m = baseManifest()
  writeStorageRewardManifest(dir, m)
  const read = readStorageRewardManifest(dir, 42)
  assert.deepEqual(read, m)
  assert.equal(readStorageRewardManifest(dir, 99), null) // missing epoch
})

test("storage manifest: sign + verify valid", async () => {
  const m = baseManifest()
  const payload = storageManifestSigningPayload(m)
  m.generatorSignature = await wallet.signTypedData(domain, STORAGE_REWARD_MANIFEST_TYPES, payload)
  m.generatorAddress = wallet.address.toLowerCase()

  const r = verifyStorageManifestSignature(m, domain)
  assert.equal(r.valid, true)
  assert.equal(r.recoveredAddress, wallet.address.toLowerCase())

  // expectedSigner override also passes for the right signer
  const r2 = verifyStorageManifestSignature(m, domain, { expectedSigner: wallet.address })
  assert.equal(r2.valid, true)
})

test("storage manifest: tampered field → invalid", async () => {
  const m = baseManifest()
  const payload = storageManifestSigningPayload(m)
  m.generatorSignature = await wallet.signTypedData(domain, STORAGE_REWARD_MANIFEST_TYPES, payload)
  m.generatorAddress = wallet.address.toLowerCase()
  m.totalReward = "999999" // tamper after signing
  const r = verifyStorageManifestSignature(m, domain)
  assert.equal(r.valid, false)
  assert.equal(r.error, "address_mismatch")
})

test("storage manifest: missing signature → invalid", () => {
  const r = verifyStorageManifestSignature(baseManifest(), domain)
  assert.equal(r.valid, false)
  assert.equal(r.error, "missing")
})

test("storage manifest: signature with no authoritative address → rejected", async () => {
  const m = baseManifest()
  const payload = storageManifestSigningPayload(m)
  m.generatorSignature = await wallet.signTypedData(domain, STORAGE_REWARD_MANIFEST_TYPES, payload)
  // no generatorAddress, no expectedSigner → fail-closed
  const r = verifyStorageManifestSignature(m, domain)
  assert.equal(r.valid, false)
  assert.equal(r.error, "no_signer_to_verify_against")
})

test("storage manifest: expectedSigner mismatch → invalid", async () => {
  const m = baseManifest()
  const payload = storageManifestSigningPayload(m)
  m.generatorSignature = await wallet.signTypedData(domain, STORAGE_REWARD_MANIFEST_TYPES, payload)
  m.generatorAddress = wallet.address.toLowerCase()
  const r = verifyStorageManifestSignature(m, domain, {
    expectedSigner: "0x000000000000000000000000000000000000dEaD",
  })
  assert.equal(r.valid, false)
  assert.equal(r.error, "address_mismatch")
})
