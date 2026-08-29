const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

// bytes32 nodeId from a short hex tag.
const nid = (tag) => "0x" + tag.padEnd(64, "0")
const EPOCH = 100n

// Composite-score reference — mirrors runtime/lib/core-set-selector.ts exactly.
function expectedRanking(cands, cfg) {
  const S = cands.reduce((a, c) => a + (c.stake > 0n ? c.stake : 0n), 0n)
  const B = cands.reduce((a, c) => a + (c.bond > 0n ? c.bond : 0n), 0n)
  const R = cands.reduce((a, c) => a + (c.reward > 0n ? c.reward : 0n), 0n)
  const norm = (v, t) => (t > 0n && v > 0n ? (v * cfg.denom) / t : 0n)
  const scored = cands.map((c) => ({
    id: c.id.toLowerCase(),
    score: cfg.wStake * norm(c.stake, S) + cfg.wBond * norm(c.bond, B) + cfg.wPerf * norm(c.reward, R),
  }))
  scored.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return scored
}

function expectedCore(cands, cfg) {
  const ranked = expectedRanking(cands, cfg)
  if (cands.length < cfg.minCore) return null // fallback
  const upper = cfg.maxCore < cfg.minCore ? cfg.minCore : cfg.maxCore
  const target = cfg.topN < cfg.minCore ? cfg.minCore : cfg.topN > upper ? upper : cfg.topN
  const k = Math.min(target, cands.length)
  return ranked.slice(0, k).map((x) => x.id)
}

const CFG = { wStake: 5000n, wBond: 2000n, wPerf: 3000n, denom: 1_000_000_000n, minCore: 4, maxCore: 4, topN: 4 }

async function deploy(cfg = CFG) {
  const [owner, relayer] = await ethers.getSigners()
  const Reg = await ethers.getContractFactory("MockValidatorRegistry")
  const reg = await Reg.deploy()
  const Pose = await ethers.getContractFactory("MockPoSeManager")
  const pose = await Pose.deploy()
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

// Set candidates on the mocks (stake, bond); returns candidate structs.
async function seed(reg, pose, entries) {
  const cands = []
  for (const e of entries) {
    await reg.setValidator(e.id, e.stake, true)
    await pose.setBond(e.id, e.bond ?? 0n)
    cands.push({ id: e.id, stake: e.stake, bond: e.bond ?? 0n, reward: e.reward ?? 0n })
  }
  return cands
}

async function finalize(csm, relayer, cands, epoch = EPOCH) {
  const ids = cands.map((c) => c.id)
  const rewards = cands.map((c) => c.reward ?? 0n)
  const proofs = cands.map(() => []) // all-zero reward path uses empty proofs
  await csm.connect(relayer).finalizeCoreSet(epoch, ids, rewards, proofs)
}

describe("CoreSetManager", () => {
  it("ranks by stake and selects top-N, demoting the lowest (matches TS selector)", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { id: nid("a1"), stake: 100n },
      { id: nid("b2"), stake: 90n },
      { id: nid("c3"), stake: 80n },
      { id: nid("d4"), stake: 70n },
      { id: nid("e5"), stake: 10n }, // lowest → demoted by top-4
    ])
    await finalize(csm, relayer, cands)

    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    const expected = expectedCore(cands, CFG)
    expect(onchain).to.deep.equal(expected)
    expect(onchain).to.have.lengthOf(4)
    expect(onchain).to.not.include(nid("e5").toLowerCase())
    expect(await csm.isCoreSetFinalized(EPOCH)).to.equal(true)
    expect(await csm.wasFallback(EPOCH)).to.equal(false)
  })

  it("blends stake + bond into the composite score", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    // e5 has the lowest stake but a huge bond — bond weight can lift it out of last.
    const cands = await seed(reg, pose, [
      { id: nid("a1"), stake: 100n, bond: 0n },
      { id: nid("b2"), stake: 90n, bond: 0n },
      { id: nid("c3"), stake: 80n, bond: 0n },
      { id: nid("d4"), stake: 70n, bond: 0n },
      { id: nid("e5"), stake: 10n, bond: 1000n },
    ])
    await finalize(csm, relayer, cands)
    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    expect(onchain).to.deep.equal(expectedCore(cands, CFG))
  })

  it("breaks score ties by nodeId ascending", async () => {
    const cfg = { ...CFG, minCore: 4, maxCore: 4, topN: 4 }
    const { relayer, reg, pose, csm } = await deploy(cfg)
    const cands = await seed(reg, pose, [
      { id: nid("ff"), stake: 100n },
      { id: nid("11"), stake: 100n },
      { id: nid("aa"), stake: 100n },
      { id: nid("55"), stake: 100n },
    ])
    await finalize(csm, relayer, cands)
    const onchain = (await csm.getCoreSet(EPOCH)).map((x) => x.toLowerCase())
    // Equal scores → pure nodeId ascending.
    expect(onchain).to.deep.equal([nid("11"), nid("55"), nid("aa"), nid("ff")].map((x) => x.toLowerCase()))
  })

  it("falls back to the full registry set when below the floor", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { id: nid("a1"), stake: 100n },
      { id: nid("b2"), stake: 90n },
      { id: nid("c3"), stake: 80n }, // only 3 < minCore 4
    ])
    await finalize(csm, relayer, cands)
    expect(await csm.wasFallback(EPOCH)).to.equal(true)
    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    // Registry active set = all 3 (order = insertion order in the mock).
    expect(onchain).to.have.members([nid("a1"), nid("b2"), nid("c3")].map((x) => x.toLowerCase()))
  })

  it("verifies a real reward Merkle proof and includes the perf component", async () => {
    const cfg = { ...CFG, wStake: 0n, wBond: 0n, wPerf: 10000n } // pure perf so reward drives rank
    const { relayer, reg, pose, csm } = await deploy(cfg)
    const ids = [nid("a1"), nid("b2"), nid("c3"), nid("d4")]
    for (const id of ids) await reg.setValidator(id, 50n, true)

    // Two nodes earn rewards; build a 2-leaf sorted-pair Merkle tree (matches
    // MerkleProofLite + services/common/merkle.ts).
    const leaf = (id, amt) =>
      ethers.keccak256(ethers.solidityPacked(["uint64", "bytes32", "uint256"], [EPOCH, id, amt]))
    const parent = (x, y) => (x.toLowerCase() <= y.toLowerCase() ? ethers.keccak256(ethers.concat([x, y])) : ethers.keccak256(ethers.concat([y, x])))
    const la = leaf(ids[0], 300n) // a1 biggest reward
    const lb = leaf(ids[1], 100n)
    const root = parent(la, lb)
    await pose.setRewardRoot(EPOCH, root)

    const rewards = [300n, 100n, 0n, 0n]
    const proofs = [[lb], [la], [], []]
    await csm.connect(relayer).finalizeCoreSet(EPOCH, ids, rewards, proofs)

    const onchain = (await csm.getActiveCoreSet()).map((x) => x.toLowerCase())
    // a1 (reward 300) ranks first; c3/d4 (reward 0) tie → nodeId asc.
    expect(onchain[0]).to.equal(ids[0].toLowerCase())
    expect(onchain).to.have.lengthOf(4)
  })

  it("rejects a tampered reward proof", async () => {
    const cfg = { ...CFG, wStake: 0n, wBond: 0n, wPerf: 10000n }
    const { relayer, reg, pose, csm } = await deploy(cfg)
    const ids = [nid("a1"), nid("b2"), nid("c3"), nid("d4")]
    for (const id of ids) await reg.setValidator(id, 50n, true)
    const leaf = (id, amt) => ethers.keccak256(ethers.solidityPacked(["uint64", "bytes32", "uint256"], [EPOCH, id, amt]))
    const la = leaf(ids[0], 300n)
    const lb = leaf(ids[1], 100n)
    const root = la.toLowerCase() <= lb.toLowerCase() ? ethers.keccak256(ethers.concat([la, lb])) : ethers.keccak256(ethers.concat([lb, la]))
    await pose.setRewardRoot(EPOCH, root)
    // Claim a1 earned 999 (not 300) with a proof for the real tree → must revert.
    const rewards = [999n, 100n, 0n, 0n]
    const proofs = [[lb], [la], [], []]
    await expect(csm.connect(relayer).finalizeCoreSet(EPOCH, ids, rewards, proofs)).to.be.revertedWithCustomError(
      csm,
      "BadRewardProof",
    )
  })

  it("rejects a candidate that is not an active validator", async () => {
    const { relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { id: nid("a1"), stake: 100n },
      { id: nid("b2"), stake: 90n },
      { id: nid("c3"), stake: 80n },
      { id: nid("d4"), stake: 70n },
    ])
    cands.push({ id: nid("ff"), stake: 0n, bond: 0n, reward: 0n }) // never registered
    await expect(finalize(csm, relayer, cands)).to.be.revertedWithCustomError(csm, "CandidateNotActive")
  })

  it("enforces onlyRelayer and rejects double finalization", async () => {
    const { owner, relayer, reg, pose, csm } = await deploy()
    const cands = await seed(reg, pose, [
      { id: nid("a1"), stake: 100n },
      { id: nid("b2"), stake: 90n },
      { id: nid("c3"), stake: 80n },
      { id: nid("d4"), stake: 70n },
    ])
    const [, , outsider] = await ethers.getSigners()
    const ids = cands.map((c) => c.id)
    const zeros = cands.map(() => 0n)
    const proofs = cands.map(() => [])
    await expect(csm.connect(outsider).finalizeCoreSet(EPOCH, ids, zeros, proofs)).to.be.revertedWithCustomError(
      csm,
      "NotRelayer",
    )
    // owner is also allowed
    await csm.connect(owner).finalizeCoreSet(EPOCH, ids, zeros, proofs)
    await expect(csm.connect(relayer).finalizeCoreSet(EPOCH, ids, zeros, proofs)).to.be.revertedWithCustomError(
      csm,
      "AlreadyFinalized",
    )
  })

  it("clamps topN into [minCore, maxCore]", async () => {
    const cfg = { ...CFG, minCore: 4, maxCore: 5, topN: 99 }
    const { relayer, reg, pose, csm } = await deploy(cfg)
    const cands = await seed(reg, pose, [
      { id: nid("a1"), stake: 100n },
      { id: nid("b2"), stake: 90n },
      { id: nid("c3"), stake: 80n },
      { id: nid("d4"), stake: 70n },
      { id: nid("e5"), stake: 60n },
      { id: nid("f6"), stake: 50n },
    ])
    await finalize(csm, relayer, cands)
    const onchain = await csm.getActiveCoreSet()
    expect(onchain).to.have.lengthOf(5) // clamped to maxCore
  })
})
