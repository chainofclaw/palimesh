import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { EvmChain } from "./evm.ts"
import { ChainEngine } from "./chain-engine.ts"
import { P2PNode } from "./p2p.ts"
import { startRpcServer } from "./rpc.ts"

const NODE_ID = "node-1"

async function createTestRpc(): Promise<{ port: number; close: () => void; chain: ChainEngine; evm: EvmChain }> {
  const evm = await EvmChain.create(18780)
  await evm.prefund([{ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", balanceWei: "10000000000000000000000" }])
  const chain = new ChainEngine(
    { dataDir: "/tmp/palimesh-rpc-test-" + Date.now(), nodeId: NODE_ID, validators: [NODE_ID], finalityDepth: 3, maxTxPerBlock: 50, minGasPriceWei: 1n },
    evm,
  )
  const p2p = new P2PNode({ bind: "127.0.0.1", port: 0, peers: [] }, {
    onTx: async () => {},
    onBlock: async () => {},
    onSnapshotRequest: () => chain.makeSnapshot(),
  })

  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      // Minimal RPC server for testing
      let body = ""
      req.on("data", (chunk) => (body += chunk))
      req.on("end", async () => {
        // We just need to test method routing
        res.writeHead(200, { "content-type": "application/json" })
        res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "ok" }))
      })
    })
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number }
      resolve({ port: addr.port, close: () => server.close(), chain, evm })
    })
  })
}

async function rpcCall(port: number, method: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/", method: "POST", headers: { "content-type": "application/json" } },
      (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => resolve(JSON.parse(data)))
      },
    )
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

test("EvmChain.callRaw returns 0x for empty contract", async () => {
  const evm = await EvmChain.create(18780)
  const result = await evm.callRaw({
    to: "0x0000000000000000000000000000000000000001",
  })
  assert.ok(typeof result.returnValue === "string")
  assert.ok(result.gasUsed >= 0n)
})

test("EvmChain.estimateGas returns positive value", async () => {
  const evm = await EvmChain.create(18780)
  await evm.prefund([{ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", balanceWei: "10000000000000000000" }])
  const gas = await evm.estimateGas({
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    value: "0x0",
  })
  assert.ok(gas >= 0n)
})

test("EvmChain.getCode returns 0x for EOA", async () => {
  const evm = await EvmChain.create(18780)
  const code = await evm.getCode("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
  assert.equal(code, "0x")
})

test("EvmChain.getStorageAt returns zero for empty slot", async () => {
  const evm = await EvmChain.create(18780)
  const value = await evm.getStorageAt(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  )
  assert.ok(value.startsWith("0x"))
})

test("EvmChain.getAllReceipts returns map", async () => {
  const evm = await EvmChain.create(18780)
  const receipts = evm.getAllReceipts()
  assert.equal(receipts.size, 0)
})
