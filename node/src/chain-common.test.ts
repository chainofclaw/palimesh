import test from "node:test"
import assert from "node:assert/strict"
import { Common, Hardfork, Mainnet, createCustomCommon, getPresetChainConfig } from "@ethereumjs/common"
import { palimeshChainConfig, palimeshWorkerChainConfig } from "./chain-common.ts"

test("palimeshChainConfig drops the DAO fork", () => {
  const names = palimeshChainConfig().hardforks.map((hf) => hf.name)
  assert.equal(names.includes("dao"), false)
  assert.ok(names.includes("london"))
  assert.ok(names.includes("shanghai"))
})

test("palimeshChainConfig pins every block-scheduled fork to genesis", () => {
  for (const hf of palimeshChainConfig().hardforks) {
    assert.ok(hf.block === null || hf.block === 0, `${hf.name} block=${hf.block}`)
  }
})

test("palimeshChainConfig does not mutate the preset it derives from", () => {
  const base = getPresetChainConfig("mainnet")
  palimeshChainConfig(base)
  const dao = base.hardforks.find((hf) => hf.name === "dao")
  assert.equal(dao?.block, 1920000)
  assert.equal(Mainnet.hardforks.find((hf) => hf.name === "london")?.block, 12965000)
})

test("Common built from palimeshChainConfig reports DAO inactive at 1920000", () => {
  const common = createCustomCommon({ chainId: 88780 }, palimeshChainConfig(), { hardfork: Hardfork.Shanghai })
  assert.equal(common.hardforkIsActiveOnBlock(Hardfork.Dao, 1920000n), false)
  assert.equal(common.hardforkBlock(Hardfork.London), 0n)
})

test("palimeshWorkerChainConfig keeps the requested chainId and drops DAO", () => {
  const common = new Common({ chain: palimeshWorkerChainConfig(88780), hardfork: Hardfork.Cancun })
  assert.equal(common.chainId(), 88780n)
  assert.equal(common.hardforkIsActiveOnBlock(Hardfork.Dao, 1920005n), false)
})
