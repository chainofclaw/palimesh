const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

// Deterministic candidate from a small private key. Derives BOTH nodeIds the way
// the two contracts do: registry = keccak256(pubkey[1:]), PoSe = keccak256(pubkey).
function candFromPriv(privTag) {
  const priv = "0x" + privTag.padStart(64, "0")
  const pubkey = ethers.SigningKey.computePublicKey(priv, false) // 0x04||X||Y (65 bytes)
  const regNodeId = ethers.keccak256("0x" + pubkey.slice(4)) // keccak(pubkey[1:])
  const poseNodeId = ethers.keccak256(pubkey) // keccak(full pubkey)
  const address = "0x" + regNodeId.slice(-40)
  return { pubkey, regNodeId, poseNodeId, address }
}

const EPOCH = 100n

// Reference composite score — mirrors runtime/lib/core-set-selector.ts.
function expectedRanking(cands, cfg) {
  const S = cands.reduce((a, c) => a + (c.stake > 0n ? c.stake : 0n), 0n)
  const B = cands.reduce((a, c) => a + (c.bond > 0n ? c.bond : 0n), 0n)
  const R = cands.reduce((a, c) => a + (c.reward > 0n ? c.reward : 0n), 0n)
  const norm = (v, t) => (t > 0n && v > 0n ? (v * cfg.denom) / t : 0n)
  const scored = cands.map((c) => ({
    id: c.regNodeId.toLowerCase(),
    score: cfg.wStake * norm(c.stake, S) + cfg.wBond * norm(c.bond, B) + cfg.wPerf * norm(c.reward, R),
  }))
  scored.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return scored
}
function expectedCore(cands, cfg) {
  const ranked = expectedRanking(cands, cfg)
  if (cands.length < cfg.minCore) return null
  const upper = cfg.maxCore < cfg.minCore ? cfg.minCore : cfg.maxCore
  const target = cfg.topN < cfg.minCore ? cfg.minCore : cfg.topN > upper ? upper : cfg.topN
  const k = Math.min(target, cands.length)
  return ranked.slice(0, k).map((x) => x.id)
}

const CFG = { wStake: 5000n, wBond: 2000n, wPerf: 3000n, denom: 1_000_000_000n, minCore: 4, maxCore: 4, topN: 4 }

async function deploy(cfg = CFG) {
  const [owner, relayer] = await ethers.getSigners()
  const reg = await (await ethers.getContractFactory("MockValidatorRegistry")).deploy()
  const pose = await (await ethers.getContractFactory("MockPoSeManager")).deploy()
  const CSM = await ethers.getContractFactory("CoreSetManager")
  const csm = await upgrades.deployProxy(
    CSM,
    [owner.address, relayer.address, await reg.getAddress(), await pose.getAddress()],
    { initializer: "initialize", kind: "uups" },
  )
  await csm.setSizes(cfg.minCore, cfg.maxCore, cfg.topN)
  await csm.setWeights(cfg.wStake, cfg.wBond, cfg.wPerf, cfg.denom)
  return { owner, relayer, reg, pose, csm }
}

// Seed a candidate: registry keyed by regNodeId, PoSe bond keyed by poseNodeId.
async function seed(reg, pose, entries) {
  const cands = []
  for (const e of entries) {
    const k = candFromPriv(e.priv)
    await reg.setValidator(k.regNodeId, e.stake, true)
    await pose.setBond(k.poseNodeId, e.bond ?? 0n)
    cands.push({ ...k, stake: e.stake, bond: e.bond ?? 0n, reward: e.reward ?? 0n })
  }
  return cands
}

// Build a sorted-pair Merkle tree over PoSe-nodeId reward leaves; returns root + proofs.
function buildRewardTree(entries) {
  const leaf = (poseNodeId, amt) =>
    ethers.keccak256(ethers.solidityPacked(["uint64", "bytes32", "uint256"], [EPOCH, poseNodeId, amt]))
  const parent = (x, y) =>
    x.toLowerCase() <= y.toLowerCase() ? ethers.keccak256(ethers.concat([x, y])) : ethers.keccak256(ethers.concat([y, x]))
  const leaves = entries.map((e) => leaf(e.poseNodeId, e.reward))
  // Only supports 1-2 leaves for these tests.
  if (leaves.length === 1) return { root: leaves[0], proofs: [[]] }
  const root = parent(leaves[0], leaves[1])
  return { root, proofs: [[leaves[1]], [leaves[0]]] }
}

async function finalizeStakeOnly(csm, relayer, cands, epoch = EPOCH) {
  const pubkeys = cands.map((c) => c.pubkey)
  const rewards = cands.map(() => 0n)
  const proofs = cands.map(() => [])
  await csm.connect(relayer).finalizeCoreSet(epoch, pubkeys, rewards, proofs)
}

describe("CoreSetManager (pubkey-based nodeId derivation)", () => {
  it("derives both nodeIds from pubkey; ranks by stake; matches TS selector", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 100n },
      { priv: "b2", stake: 90n },
      { priv: "c3", stake: 80n },
      { priv: "d4", stake: 70n },
      { priv: "e5", stake: 10n }, // lowest → demoted
    ])
    await finalizeStakeOnly(csm, relayer, cands)
    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    expect(onchain).to.deep.equal(expectedCore(cands, CFG))
    expect(onchain).to.have.lengthOf(4)
    const e5 = cands.find((c) => c.stake === 10n)
    expect(onchain).to.not.include(e5.regNodeId.toLowerCase())
  })

  it("reads bond via the PoSe nodeId (not the registry nodeId)", async () => {
    // e5 has lowest stake but a huge bond keyed under its PoSe nodeId — the fix
    // makes the contract read that bond, lifting it out of last place.
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 100n, bond: 0n },
      { priv: "b2", stake: 90n, bond: 0n },
      { priv: "c3", stake: 80n, bond: 0n },
      { priv: "d4", stake: 70n, bond: 0n },
      { priv: "e5", stake: 10n, bond: 100000n },
    ])
    await finalizeStakeOnly(csm, relayer, cands)
    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    // If bond were read under the wrong nodeId it would be 0 and e5 would be demoted.
    // With the fix, e5's large bond keeps it in the core set.
    expect(onchain).to.deep.equal(expectedCore(cands, CFG))
  })

  it("verifies reward Merkle proof keyed by the PoSe nodeId", async () => {
    const cfg = { ...CFG, wStake: 0n, wBond: 0n, wPerf: 10000n }
    const { relayer, reg, pose, csm } = await deploy(cfg)
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 50n, reward: 300n },
      { priv: "b2", stake: 50n, reward: 100n },
      { priv: "c3", stake: 50n, reward: 0n },
      { priv: "d4", stake: 50n, reward: 0n },
    ])
    const tree = buildRewardTree([cands[0], cands[1]])
    await pose.setRewardRoot(EPOCH, tree.root)
    const pubkeys = cands.map((c) => c.pubkey)
    const rewards = [300n, 100n, 0n, 0n]
    const proofs = [tree.proofs[0], tree.proofs[1], [], []]
    await csm.connect(relayer).finalizeCoreSet(EPOCH, pubkeys, rewards, proofs)
    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    expect(onchain[0]).to.equal(cands[0].regNodeId.toLowerCase()) // a1 top reward
    expect(onchain).to.have.lengthOf(4)
  })

  it("rejects a tampered reward proof", async () => {
    const cfg = { ...CFG, wStake: 0n, wBond: 0n, wPerf: 10000n }
    const { relayer, reg, pose, csm } = await deploy(cfg)
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 50n, reward: 300n },
      { priv: "b2", stake: 50n, reward: 100n },
      { priv: "c3", stake: 50n, reward: 0n },
      { priv: "d4", stake: 50n, reward: 0n },
    ])
    const tree = buildRewardTree([cands[0], cands[1]])
    await pose.setRewardRoot(EPOCH, tree.root)
    const pubkeys = cands.map((c) => c.pubkey)
    const rewards = [999n, 100n, 0n, 0n] // a1 claims 999 (not 300)
    const proofs = [tree.proofs[0], tree.proofs[1], [], []]
    await expect(csm.connect(relayer).finalizeCoreSet(EPOCH, pubkeys, rewards, proofs)).to.be.revertedWithCustomError(
      csm,
      "BadRewardProof",
    )
  })

  it("rejects a malformed pubkey", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 50n },
      { priv: "b2", stake: 50n },
      { priv: "c3", stake: 50n },
      { priv: "d4", stake: 50n },
    ])
    const pubkeys = cands.map((c) => c.pubkey)
    pubkeys[0] = "0x1234" // malformed (not 65 bytes / no 0x04)
    await expect(
      csm.connect(relayer).finalizeCoreSet(EPOCH, pubkeys, cands.map(() => 0n), cands.map(() => [])),
    ).to.be.revertedWithCustomError(csm, "BadPubkey")
  })

  it("rejects a candidate not active in the registry", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 50n },
      { priv: "b2", stake: 50n },
      { priv: "c3", stake: 50n },
      { priv: "d4", stake: 50n },
    ])
    const unreg = candFromPriv("ff") // never registered
    const pubkeys = [...cands.map((c) => c.pubkey), unreg.pubkey]
    await expect(
      csm.connect(relayer).finalizeCoreSet(EPOCH, pubkeys, pubkeys.map(() => 0n), pubkeys.map(() => [])),
    ).to.be.revertedWithCustomError(csm, "CandidateNotActive")
  })

  it("falls back to the full registry set below the floor", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 100n },
      { priv: "b2", stake: 90n },
      { priv: "c3", stake: 80n }, // only 3 < minCore 4
    ])
    await finalizeStakeOnly(csm, relayer, cands)
    expect(await csm.wasFallback(EPOCH)).to.equal(true)
    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    expect(onchain).to.have.members(cands.map((c) => c.regNodeId.toLowerCase()))
  })

  it("enforces onlyRelayer and rejects double finalization", async () => {
    const { owner, relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { priv: "a1", stake: 50n },
      { priv: "b2", stake: 50n },
      { priv: "c3", stake: 50n },
      { priv: "d4", stake: 50n },
    ])
    const [, , outsider] = await ethers.getSigners()
    const pubkeys = cands.map((c) => c.pubkey)
    const zeros = cands.map(() => 0n)
    const proofs = cands.map(() => [])
    await expect(csm.connect(outsider).finalizeCoreSet(EPOCH, pubkeys, zeros, proofs)).to.be.revertedWithCustomError(
      csm,
      "NotRelayer",
    )
    await csm.connect(owner).finalizeCoreSet(EPOCH, pubkeys, zeros, proofs)
    await expect(csm.connect(relayer).finalizeCoreSet(EPOCH, pubkeys, zeros, proofs)).to.be.revertedWithCustomError(
      csm,
      "AlreadyFinalized",
    )
  })
})
