/**
 * $MESH storage-settlement end-to-end (on-chain).
 *
 * Deploys MockPoseRegistry + MeshToken + StorageRewardManager (UUPS), wires a
 * few storage nodes, then drives the full settlement the relayer performs:
 *   submitStorageEpoch(root, total) → per-node claim(proof) → assert $MESH minted
 *   to each node's operator → payForStorage 70/20/10 split.
 *
 * The Merkle tree is built with the exact sorted-pair encoding of
 * services/common/merkle.ts + reward-tree.ts, so a real agent manifest would
 * claim identically (proven separately in storage-reward-solidity-parity.test.ts).
 *
 * Run against the in-process hardhat network:
 *   cd contracts && npx hardhat run scripts/e2e-mesh-storage.js
 * or against a live devnet chain (start-devnet.sh):
 *   PALI_RPC_URL=http://127.0.0.1:28780 PALI_CHAIN_ID=18780 \
 *   DEPLOYER_PRIVATE_KEY=0xac0974... npx hardhat run scripts/e2e-mesh-storage.js --network coc
 */

const { ethers, upgrades } = require("hardhat")
const assert = require("node:assert/strict")

const T = (n) => ethers.parseEther(String(n))

function leafHash(epochId, nodeId, amount) {
  return ethers.solidityPackedKeccak256(["uint64", "bytes32", "uint256"], [epochId, nodeId, amount])
}
function hashPair(a, b) {
  const [lo, hi] = BigInt(a) <= BigInt(b) ? [a, b] : [b, a]
  return ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [lo, hi])
}
// mirrors services/common/merkle.ts (sorted-pair, single-leaf = hashPair(l,l))
function merkleLayers(leaves) {
  const layers = [leaves.slice()]
  while (layers.at(-1).length > 1) {
    const layer = layers.at(-1)
    const next = []
    for (let i = 0; i < layer.length; i += 2) next.push(hashPair(layer[i], layer[i + 1] ?? layer[i]))
    layers.push(next)
  }
  return layers
}
function merkleRoot(leaves) {
  if (leaves.length === 1) return hashPair(leaves[0], leaves[0])
  return merkleLayers(leaves).at(-1)[0]
}
function merkleProof(leaves, index) {
  if (leaves.length === 1) return [leaves[0]]
  const layers = merkleLayers(leaves)
  const proof = []
  let cursor = index
  for (let d = 0; d < layers.length - 1; d++) {
    const layer = layers[d]
    const sib = cursor % 2 === 0 ? cursor + 1 : cursor - 1
    proof.push(layer[sib] ?? layer[cursor])
    cursor = Math.floor(cursor / 2)
  }
  return proof
}

async function main() {
  const signers = await ethers.getSigners()
  const [deployer, treasury, opA, opB, opC] = signers
  console.log(`deployer=${deployer.address}`)

  // --- deploy ---
  const Registry = await ethers.getContractFactory("MockPoseRegistry")
  const registry = await Registry.deploy()
  await registry.waitForDeployment()

  const Mesh = await ethers.getContractFactory("MeshToken")
  const mesh = await upgrades.deployProxy(
    Mesh,
    [deployer.address /*ecosystem*/, deployer.address /*teamVesting*/, deployer.address /*liquidity*/, deployer.address /*owner*/],
    { initializer: "initialize", kind: "uups" },
  )
  await mesh.waitForDeployment()

  const SRM = await ethers.getContractFactory("StorageRewardManager")
  const srm = await upgrades.deployProxy(
    SRM,
    [await mesh.getAddress(), await registry.getAddress(), treasury.address, T(20000), deployer.address],
    { initializer: "initialize", kind: "uups" },
  )
  await srm.waitForDeployment()

  await (await mesh.setMinter(await srm.getAddress())).wait()
  await (await srm.setRelayer(deployer.address, true)).wait()
  console.log(`MeshToken=${await mesh.getAddress()}  StorageRewardManager=${await srm.getAddress()}`)

  // --- nodes (as a real relayer would resolve operators from PoSeManagerV2) ---
  const nodes = [
    { nodeId: ethers.id("node-A"), operator: opA, amount: T(1000) },
    { nodeId: ethers.id("node-B"), operator: opB, amount: T(2500) },
    { nodeId: ethers.id("node-C"), operator: opC, amount: T(1500) },
  ]
  for (const n of nodes) await (await registry.setOperator(n.nodeId, n.operator.address)).wait()

  // --- build the storage reward tree (sorted by nodeId, like reward-tree.ts) ---
  const epochId = await srm.currentEpoch()
  const sorted = [...nodes].sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0))
  const leaves = sorted.map((n) => leafHash(epochId, n.nodeId, n.amount))
  const root = merkleRoot(leaves)
  const total = nodes.reduce((s, n) => s + n.amount, 0n)

  // --- relayer: submitStorageEpoch ---
  await (await srm.connect(deployer).submitStorageEpoch(epochId, root, total)).wait()
  console.log(`\nsubmitStorageEpoch(epoch=${epochId}, total=${ethers.formatEther(total)} MESH) ✓`)

  // --- nodes claim; assert $MESH minted to operators ---
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]
    const proof = merkleProof(leaves, i)
    const before = await mesh.balanceOf(n.operator.address)
    await (await srm.claim(epochId, n.nodeId, n.amount, proof)).wait()
    const after = await mesh.balanceOf(n.operator.address)
    assert.equal(after - before, n.amount, `claim mint mismatch for ${n.nodeId}`)
    console.log(`  claim ${n.nodeId.slice(0, 10)}… → operator +${ethers.formatEther(n.amount)} MESH ✓`)
  }
  assert.equal(await srm.totalRewarded(), total)
  assert.equal(await mesh.totalMinted(), total)

  // --- double-claim is rejected ---
  await assert.rejects(
    srm.claim(epochId, sorted[0].nodeId, sorted[0].amount, merkleProof(leaves, 0)),
    /AlreadyClaimed/,
  )
  console.log("  double-claim rejected ✓")

  // --- payForStorage 70/20/10 ---
  const pay = T(100)
  await (await mesh.connect(deployer).approve(await srm.getAddress(), pay)).wait()
  const supplyBefore = await mesh.totalSupply()
  const opBefore = await mesh.balanceOf(opA.address)
  const treBefore = await mesh.balanceOf(treasury.address)
  await (await srm.connect(deployer).payForStorage(nodes[0].nodeId, pay)).wait()
  assert.equal((await mesh.balanceOf(opA.address)) - opBefore, T(70))
  assert.equal((await mesh.balanceOf(treasury.address)) - treBefore, T(20))
  assert.equal(supplyBefore - (await mesh.totalSupply()), T(10)) // 10% burned
  console.log(`\npayForStorage(${ethers.formatEther(pay)}): node +70 / treasury +20 / burn 10 ✓`)

  console.log(`\n=== $MESH storage settlement e2e OK — ${nodes.length} nodes, ${ethers.formatEther(total)} MESH minted ===`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
