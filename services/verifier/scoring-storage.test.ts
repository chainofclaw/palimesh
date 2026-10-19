import test from "node:test"
import assert from "node:assert/strict"
import { computeStorageRewards, DEFAULT_SCORING_CONFIG, type EpochNodeStats } from "./scoring.ts"

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

function sumRewards(rewards: Record<string, bigint>): bigint {
  return Object.values(rewards).reduce((acc, n) => acc + n, 0n)
}

test("storage-only: whole pool goes to the storage bucket", () => {
  const stats: EpochNodeStats[] = [
    { nodeId: A, uptimeBps: 9000, storageBps: 8000, relayBps: 6000, storageGb: 100n },
    { nodeId: B, uptimeBps: 8500, storageBps: 8000, relayBps: 4000, storageGb: 100n },
  ]
  const r = computeStorageRewards(1_000_000n, stats)
  assert.equal(r.bucketRewards.storage, 1_000_000n)
  assert.equal(r.bucketRewards.uptime, 0n)
  assert.equal(r.bucketRewards.relay, 0n)
  // full pool distributed (equal GB + bps → equal split), conserved
  assert.equal(sumRewards(r.rewards) + r.treasuryOverflow, 1_000_000n)
  assert.equal(r.rewards[A], r.rewards[B])
})

test("storage-only: below storage threshold gets zero", () => {
  const stats: EpochNodeStats[] = [
    { nodeId: A, uptimeBps: 9000, storageBps: 8000, relayBps: 6000, storageGb: 100n },
    { nodeId: B, uptimeBps: 9000, storageBps: 6000, relayBps: 6000, storageGb: 100n }, // < 7000
  ]
  const r = computeStorageRewards(1_000_000n, stats)
  assert.equal(r.rewards[B], 0n)
  assert.equal(r.rewards[A], 1_000_000n)
})

test("storage-only: uptime/relay signals are ignored", () => {
  // A has great uptime/relay but sub-threshold storage → still zero
  const stats: EpochNodeStats[] = [
    { nodeId: A, uptimeBps: 10000, storageBps: 0, relayBps: 10000, storageGb: 0n },
    { nodeId: B, uptimeBps: 0, storageBps: 9000, relayBps: 0, storageGb: 100n },
  ]
  const r = computeStorageRewards(1_000_000n, stats)
  assert.equal(r.rewards[A], 0n)
  assert.equal(r.rewards[B], 1_000_000n)
})

test("storage-only: minSamples gates weight to zero", () => {
  const stats: EpochNodeStats[] = [
    { nodeId: A, uptimeBps: 9000, storageBps: 8000, relayBps: 6000, storageGb: 100n, storageSamples: 2 },
    { nodeId: B, uptimeBps: 9000, storageBps: 8000, relayBps: 6000, storageGb: 100n, storageSamples: 10 },
  ]
  const cfg = { ...DEFAULT_SCORING_CONFIG, minSamples: 5 }
  const r = computeStorageRewards(1_000_000n, stats, cfg)
  assert.equal(r.rewards[A], 0n)
  assert.equal(r.rewards[B], 1_000_000n)
})

test("storage-only: sqrt decay prevents linear domination by capacity", () => {
  const stats: EpochNodeStats[] = [
    { nodeId: A, uptimeBps: 9000, storageBps: 9000, relayBps: 5000, storageGb: 100n },
    { nodeId: B, uptimeBps: 9000, storageBps: 9000, relayBps: 5000, storageGb: 400n },
  ]
  const r = computeStorageRewards(1_000_000n, stats)
  assert.equal(r.rewards[B] > r.rewards[A], true)     // more storage → more reward
  assert.equal(r.rewards[B] < r.rewards[A] * 3n, true) // but 4x GB is well below 4x reward (sqrt decay)
})

test("storage-only: no qualifying node yields all-zero (skip empty epoch)", () => {
  const stats: EpochNodeStats[] = [
    { nodeId: A, uptimeBps: 9000, storageBps: 5000, relayBps: 6000, storageGb: 100n }, // < threshold
  ]
  const r = computeStorageRewards(1_000_000n, stats)
  assert.equal(sumRewards(r.rewards), 0n)
})

test("storage-only: negative pool throws", () => {
  assert.throws(() => computeStorageRewards(-1n, []), /non-negative/)
})
