import test from "node:test"
import assert from "node:assert/strict"
import { EvmChain } from "./evm.ts"

// 88780 halted at 1919999 (2026-09-08): the EthereumJS Common was built on the
// mainnet preset, which schedules the DAO fork at 1920000 and forces
// extraData='dao-hard-fork' for blocks 1920000..1920009. Palimesh blocks carry
// no such extraData, so every node rejected the finalized block 1920000.

const DAO_FORK_BLOCK = 1_920_000n
const MAINNET_LONDON_BLOCK = 12_965_000n

test("prepareBlock accepts the mainnet DAO fork window (1920000..1920009)", async () => {
  const evm = await EvmChain.create(88780)
  for (let n = DAO_FORK_BLOCK - 1n; n <= DAO_FORK_BLOCK + 10n; n++) {
    assert.doesNotThrow(() => evm.prepareBlock(n, { blockNumber: n, baseFeePerGas: 1n }), `block ${n}`)
  }
})

test("prepareBlock accepts the mainnet London fork height with a non-initial baseFee", async () => {
  const evm = await EvmChain.create(88780)
  assert.doesNotThrow(() => evm.prepareBlock(MAINNET_LONDON_BLOCK, { blockNumber: MAINNET_LONDON_BLOCK, baseFeePerGas: 7n }))
})

test("block 1920000 executes a tx without applying the DAO refund", async () => {
  const { Wallet } = await import("ethers")
  const wallet = new Wallet("0x" + "11".repeat(32))
  const evm = await EvmChain.create(88780)
  await evm.prefund([{ address: wallet.address, balanceWei: "1000000000000000000" }])
  const rawTx = await wallet.signTransaction({
    to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    value: 1n,
    gasLimit: 21000n,
    gasPrice: 1n,
    nonce: 0,
    chainId: 88780,
  })
  const result = await evm.executeRawTx(rawTx, DAO_FORK_BLOCK, 0, undefined, 0n)
  assert.equal(result.success, true)
  assert.equal(await evm.getBalance("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"), 1n)
})
