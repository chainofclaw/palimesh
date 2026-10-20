import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ValidatorSetSchedule } from "./validator-set-schedule.ts"

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const C = "0xcccccccccccccccccccccccccccccccccccccccc"
const D = "0xdddddddddddddddddddddddddddddddddddddddd"

test("empty schedule: allowedAt returns null (unknown era)", () => {
  const s = new ValidatorSetSchedule()
  assert.equal(s.allowedAt(100n), null)
})

test("heights below the first era are unknown; at/after are covered", () => {
  const s = new ValidatorSetSchedule()
  s.record(50n, [A, B])
  assert.equal(s.allowedAt(49n), null)
  assert.deepEqual(s.allowedAt(50n), new Set([A, B]))
  assert.deepEqual(s.allowedAt(1_000_000n), new Set([A, B]))
})

test("era lookup picks the segment covering the height", () => {
  const s = new ValidatorSetSchedule()
  s.record(1n, [A, B])
  s.record(100n, [A, C])
  s.record(200n, [C, D])
  // height 150 → era [100,200) = {A,C}, neighbours add {B} and {D}
  assert.deepEqual(s.allowedAt(150n), new Set([A, B, C, D]))
})

test("boundary tolerance unions immediate neighbour eras only", () => {
  const s = new ValidatorSetSchedule()
  s.record(1n, [A])
  s.record(100n, [B])
  s.record(200n, [C])
  s.record(300n, [D])
  // height 250 → era {C}, neighbours {B} and {D} — but never {A}
  const allowed = s.allowedAt(250n)!
  assert.equal(allowed.has(A), false)
  assert.deepEqual(allowed, new Set([B, C, D]))
})

test("same-membership record is a no-op (restart seeding must not spam)", () => {
  const s = new ValidatorSetSchedule()
  assert.equal(s.record(1n, [A, B]), true)
  assert.equal(s.record(500n, [B, A]), false) // order-insensitive
  assert.equal(s.record(600n, ["0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", B]), false) // case-insensitive
  assert.equal(s.size(), 1)
})

test("recording at an existing fromHeight replaces that era", () => {
  const s = new ValidatorSetSchedule()
  s.record(1n, [A])
  s.record(100n, [B])
  s.record(100n, [C])
  assert.equal(s.size(), 2)
  assert.deepEqual(s.allowedAt(150n), new Set([A, C]))
})

test("empty validator list is rejected", () => {
  const s = new ValidatorSetSchedule()
  assert.equal(s.record(1n, []), false)
  assert.equal(s.size(), 0)
})

test("persists and reloads across instances", () => {
  const dir = mkdtempSync(join(tmpdir(), "vss-"))
  const file = join(dir, "validator-set-schedule.json")
  const s1 = new ValidatorSetSchedule(file)
  s1.record(10n, [A, B])
  s1.record(20n, [B, C])
  const s2 = ValidatorSetSchedule.load(file)
  assert.equal(s2.size(), 2)
  assert.equal(s2.allowedAt(5n), null)
  assert.deepEqual(s2.allowedAt(25n), new Set([A, B, C]))
  // file is valid JSON with string heights (BigInt-safe)
  const raw = JSON.parse(readFileSync(file, "utf8"))
  assert.equal(raw.version, 1)
  assert.equal(raw.entries[0].fromHeight, "10")
})

test("missing or corrupt file loads as an empty schedule", () => {
  const dir = mkdtempSync(join(tmpdir(), "vss-"))
  const missing = ValidatorSetSchedule.load(join(dir, "nope.json"))
  assert.equal(missing.size(), 0)
  const corruptPath = join(dir, "corrupt.json")
  writeFileSync(corruptPath, "{not json")
  const corrupt = ValidatorSetSchedule.load(corruptPath)
  assert.equal(corrupt.size(), 0)
  assert.equal(corrupt.allowedAt(1n), null)
})

test("load sorts entries and lowercases validators", () => {
  const dir = mkdtempSync(join(tmpdir(), "vss-"))
  const file = join(dir, "s.json")
  writeFileSync(file, JSON.stringify({
    version: 1,
    entries: [
      { fromHeight: "200", validators: [C.toUpperCase().replace("0X", "0x")] },
      { fromHeight: "100", validators: [A] },
    ],
  }))
  const s = ValidatorSetSchedule.load(file)
  assert.deepEqual(s.eras().map((e) => e.fromHeight), [100n, 200n])
  assert.deepEqual(s.allowedAt(100n), new Set([A, C]))
})
