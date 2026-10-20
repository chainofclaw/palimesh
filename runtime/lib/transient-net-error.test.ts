import test from "node:test"
import assert from "node:assert/strict"
import { isTransientNetError } from "./transient-net-error.ts"

function codedError(message: string, code: string): Error {
  const err = new Error(message) as Error & { code: string }
  err.code = code
  return err
}

test("recognizes node socket error codes", () => {
  assert.equal(isTransientNetError(codedError("read ECONNRESET", "ECONNRESET")), true)
  assert.equal(isTransientNetError(codedError("connect ECONNREFUSED", "ECONNREFUSED")), true)
  assert.equal(isTransientNetError(codedError("connect ENETUNREACH", "ENETUNREACH")), true)
  assert.equal(isTransientNetError(codedError("timed out", "ETIMEDOUT")), true)
})

test("recognizes ethers v6 network-layer codes", () => {
  assert.equal(isTransientNetError(codedError("request timeout", "TIMEOUT")), true)
  assert.equal(isTransientNetError(codedError("network error", "NETWORK_ERROR")), true)
})

test("recognizes 'socket hang up' by message (the 2026-09-06 crash shape)", () => {
  // node:_http_client ConnResetException — code ECONNRESET + this message
  const err = codedError("socket hang up", "ECONNRESET")
  assert.equal(isTransientNetError(err), true)
  // message alone is enough (some wrappers drop the code)
  assert.equal(isTransientNetError(new Error("socket hang up")), true)
})

test("walks nested cause/error chains", () => {
  const inner = codedError("read ECONNRESET", "ECONNRESET")
  assert.equal(isTransientNetError(new Error("wrapper", { cause: inner })), true)
  const ethersStyle = new Error("could not coalesce error") as Error & { error: unknown }
  ethersStyle.error = inner
  assert.equal(isTransientNetError(ethersStyle), true)
})

test("stops walking beyond max depth", () => {
  let err: Error = codedError("read ECONNRESET", "ECONNRESET")
  for (let i = 0; i < 6; i++) err = new Error(`layer ${i}`, { cause: err })
  assert.equal(isTransientNetError(err), false)
})

test("rejects non-transient values", () => {
  assert.equal(isTransientNetError(new Error("Cannot read properties of undefined")), false)
  assert.equal(isTransientNetError(new TypeError("x is not a function")), false)
  assert.equal(isTransientNetError(codedError("execution reverted", "CALL_EXCEPTION")), false)
  assert.equal(isTransientNetError(null), false)
  assert.equal(isTransientNetError(undefined), false)
  assert.equal(isTransientNetError("socket hang up"), false)
  assert.equal(isTransientNetError(42), false)
})
