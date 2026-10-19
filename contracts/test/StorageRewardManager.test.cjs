/**
 * StorageRewardManager Test Suite — Phase 3 (settle "S" storage rewards in $MESH).
 *
 * Rates/amounts are realistic (thousands of MESH/epoch): the contract caps
 * emissionPerEpoch at MAX_EMISSION_PER_EPOCH (~22831e18, a 2-year floor on the
 * 400M pool), so the million-scale rates of an earlier draft are illegal.
 *
 * The reward Merkle tree is rebuilt here with the exact on-chain encoding
 * (keccak256(abi.encodePacked(uint64,bytes32,uint256)) + sorted-pair hashing,
 * matching MerkleProofLite / services/common/reward-tree.ts). Single-leaf trees
 * use root = hashPair(leaf,leaf) with proof [leaf] — what merkle.ts actually
 * emits — never the empty proof, which claim() now rejects.
 */

const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

const T = (n) => ethers.parseEther(String(n))       // token amounts
const M = (n) => ethers.parseEther(String(n * 1_000_000))
const EMISSION = T(20000)                            // per-epoch, < MAX (~22831)
const NODE1 = ethers.id("node-1")
const NODE2 = ethers.id("node-2")

function leafHash(epochId, nodeId, amount) {
  return ethers.solidityPackedKeccak256(["uint64", "bytes32", "uint256"], [epochId, nodeId, amount])
}
function hashPair(a, b) {
  const [lo, hi] = BigInt(a) <= BigInt(b) ? [a, b] : [b, a]
  return ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [lo, hi])
}
function twoLeafTree(l0, l1) {
  return { root: hashPair(l0, l1), proof0: [l1], proof1: [l0] }
}
function oneLeafTree(leaf) {
  return { root: hashPair(leaf, leaf), proof: [leaf] }
}
async function jumpEpochs(n) {
  await ethers.provider.send("evm_increaseTime", [3600 * n])
  await ethers.provider.send("evm_mine", [])
}

async function deploy(emissionPerEpoch = EMISSION) {
  const [deployer, ecosystem, liquidity, owner, relayer, treasury, op1, op2] =
    await ethers.getSigners()

  const Mesh = await ethers.getContractFactory("MeshToken")
  const mesh = await upgrades.deployProxy(
    Mesh,
    [ecosystem.address, deployer.address, liquidity.address, owner.address],
    { initializer: "initialize", kind: "uups" },
  )
  await mesh.waitForDeployment()

  const Registry = await ethers.getContractFactory("MockPoseRegistry")
  const registry = await Registry.deploy()
  await registry.waitForDeployment()

  const SRM = await ethers.getContractFactory("StorageRewardManager")
  const srm = await upgrades.deployProxy(
    SRM,
    [await mesh.getAddress(), await registry.getAddress(), treasury.address, emissionPerEpoch, owner.address],
    { initializer: "initialize", kind: "uups" },
  )
  await srm.waitForDeployment()

  await mesh.connect(owner).setMinter(await srm.getAddress())
  await srm.connect(owner).setRelayer(relayer.address, true)
  await registry.setOperator(NODE1, op1.address)
  await registry.setOperator(NODE2, op2.address)

  return { mesh, registry, srm, deployer, ecosystem, owner, relayer, treasury, op1, op2 }
}

describe("StorageRewardManager: init", () => {
  it("wires fields and anchors the linear schedule", async () => {
    const { srm, mesh, treasury } = await deploy()
    expect(await srm.treasury()).to.equal(treasury.address)
    expect(await srm.emissionPerEpoch()).to.equal(EMISSION)
    expect(await srm.STORAGE_REWARD_POOL()).to.equal(M(400))
    const startEpoch = await srm.startEpoch()
    expect(startEpoch).to.equal(await srm.currentEpoch())
    expect(await srm.rateAnchorEpoch()).to.equal(startEpoch)
    expect(await srm.unlockedBaseline()).to.equal(0n)
    expect(await mesh.minter()).to.equal(await srm.getAddress())
    expect(await srm.emissionPerEpoch()).to.be.lessThanOrEqual(await srm.MAX_EMISSION_PER_EPOCH())
  })

  it("rejects zero addresses, zero rate, and over-max rate", async () => {
    const [d, eco, liq, owner, , treasury] = await ethers.getSigners()
    const Mesh = await ethers.getContractFactory("MeshToken")
    const mesh = await upgrades.deployProxy(
      Mesh, [eco.address, d.address, liq.address, owner.address], { initializer: "initialize", kind: "uups" },
    )
    const Registry = await ethers.getContractFactory("MockPoseRegistry")
    const registry = await Registry.deploy()
    const SRM = await ethers.getContractFactory("StorageRewardManager")
    const good = [await mesh.getAddress(), await registry.getAddress(), treasury.address, EMISSION, owner.address]

    for (const idx of [0, 1, 2, 4]) {
      const args = [...good]; args[idx] = ethers.ZeroAddress
      await expect(upgrades.deployProxy(SRM, args, { initializer: "initialize", kind: "uups" }))
        .to.be.revertedWithCustomError(SRM, "ZeroAddress")
    }
    const zeroRate = [...good]; zeroRate[3] = 0
    await expect(upgrades.deployProxy(SRM, zeroRate, { initializer: "initialize", kind: "uups" }))
      .to.be.revertedWithCustomError(SRM, "ZeroAmount")
    const overMax = [...good]; overMax[3] = T(30000) // > MAX ~22831
    await expect(upgrades.deployProxy(SRM, overMax, { initializer: "initialize", kind: "uups" }))
      .to.be.revertedWithCustomError(SRM, "EmissionAboveMax")
  })
})

describe("StorageRewardManager: admin", () => {
  it("onlyOwner guards + events + rate bounds", async () => {
    const { srm, owner, relayer, treasury, op1 } = await deploy()

    await expect(srm.connect(relayer).setTreasury(op1.address))
      .to.be.revertedWithCustomError(srm, "NotOwner")
    await expect(srm.connect(owner).setTreasury(op1.address))
      .to.emit(srm, "TreasuryUpdated").withArgs(treasury.address, op1.address)

    await expect(srm.connect(owner).setEmissionPerEpoch(T(15000)))
      .to.emit(srm, "EmissionRateUpdated").withArgs(EMISSION, T(15000))
    await expect(srm.connect(owner).setEmissionPerEpoch(0))
      .to.be.revertedWithCustomError(srm, "ZeroAmount")
    await expect(srm.connect(owner).setEmissionPerEpoch(T(30000)))
      .to.be.revertedWithCustomError(srm, "EmissionAboveMax")

    await expect(srm.connect(owner).setRelayer(op1.address, true))
      .to.emit(srm, "RelayerUpdated").withArgs(op1.address, true)
    await expect(srm.connect(owner).transferOwnership(op1.address))
      .to.emit(srm, "OwnerUpdated").withArgs(owner.address, op1.address)
    expect(await srm.owner()).to.equal(op1.address)
  })
})

describe("StorageRewardManager: linear release", () => {
  it("grows per epoch and caps at 400M", async () => {
    const { srm } = await deploy()
    expect(await srm.unlockedToDate()).to.equal(EMISSION)         // epoch 0
    await jumpEpochs(1)
    expect(await srm.unlockedToDate()).to.equal(EMISSION * 2n)    // epoch 1
    await jumpEpochs(30000)                                        // far past the pool
    expect(await srm.unlockedToDate()).to.equal(M(400))          // capped
  })

  it("rate change does NOT retroactively unlock past epochs (H1)", async () => {
    const { srm, owner } = await deploy(T(10000))
    await jumpEpochs(2)
    expect(await srm.unlockedToDate()).to.equal(T(30000)) // 3 epochs * 10000

    // hike rate: baseline frozen at 30000, new rate applies from next epoch
    await srm.connect(owner).setEmissionPerEpoch(T(20000))
    expect(await srm.unlockedToDate()).to.equal(T(30000)) // same epoch: unchanged

    await jumpEpochs(1)
    // 30000 + 1*20000 = 50000 — NOT a from-scratch 4*20000 = 80000
    expect(await srm.unlockedToDate()).to.equal(T(50000))
  })
})

describe("StorageRewardManager: submitStorageEpoch", () => {
  it("relayer submits; guards dup / zero / over-unlocked", async () => {
    const { srm, relayer, owner } = await deploy()
    const epochId = await srm.currentEpoch()
    const { root } = twoLeafTree(leafHash(epochId, NODE1, T(5000)), leafHash(epochId, NODE2, T(8000)))

    await expect(srm.connect(owner).submitStorageEpoch(epochId, root, T(13000)))
      .to.be.revertedWithCustomError(srm, "NotRelayer")
    await expect(srm.connect(relayer).submitStorageEpoch(epochId, root, T(13000)))
      .to.emit(srm, "StorageEpochSubmitted").withArgs(epochId, root, T(13000))
    expect(await srm.totalScheduled()).to.equal(T(13000))
    expect(await srm.epochTotalMesh(epochId)).to.equal(T(13000))

    await expect(srm.connect(relayer).submitStorageEpoch(epochId, root, T(1)))
      .to.be.revertedWithCustomError(srm, "EpochAlreadySubmitted")
    await expect(srm.connect(relayer).submitStorageEpoch(epochId + 1n, ethers.ZeroHash, T(1)))
      .to.be.revertedWithCustomError(srm, "ZeroAmount")
  })

  it("rejects totalMesh above the linear unlock ceiling", async () => {
    const { srm, relayer } = await deploy(T(10000)) // 10000 unlocked in epoch 0
    const epochId = await srm.currentEpoch()
    const { root } = twoLeafTree(leafHash(epochId, NODE1, T(6000)), leafHash(epochId, NODE2, T(5000)))
    await expect(srm.connect(relayer).submitStorageEpoch(epochId, root, T(11000)))
      .to.be.revertedWithCustomError(srm, "ExceedsUnlocked")
    await expect(srm.connect(relayer).submitStorageEpoch(epochId, root, T(10000))).to.not.be.reverted
  })
})

describe("StorageRewardManager: claim", () => {
  async function submitted() {
    const ctx = await deploy()
    const epochId = await ctx.srm.currentEpoch()
    const l1 = leafHash(epochId, NODE1, T(5000))
    const l2 = leafHash(epochId, NODE2, T(8000))
    const { root, proof0, proof1 } = twoLeafTree(l1, l2)
    await ctx.srm.connect(ctx.relayer).submitStorageEpoch(epochId, root, T(13000))
    return { ...ctx, epochId, proof1: proof0, proof2: proof1 }
  }

  it("mints $MESH to the node operator on valid proof", async () => {
    const { srm, mesh, epochId, op1, op2, proof1, proof2 } = await submitted()
    await expect(srm.claim(epochId, NODE1, T(5000), proof1))
      .to.emit(srm, "RewardClaimed").withArgs(epochId, NODE1, op1.address, T(5000))
    expect(await mesh.balanceOf(op1.address)).to.equal(T(5000))

    await srm.claim(epochId, NODE2, T(8000), proof2)
    expect(await mesh.balanceOf(op2.address)).to.equal(T(8000))
    expect(await srm.totalRewarded()).to.equal(T(13000))
    expect(await srm.epochClaimedMesh(epochId)).to.equal(T(13000))
    expect(await mesh.totalMinted()).to.equal(T(13000))
  })

  it("rejects double claim, empty proof, bad proof, unsubmitted epoch", async () => {
    const { srm, epochId, proof1 } = await submitted()
    await srm.claim(epochId, NODE1, T(5000), proof1)
    await expect(srm.claim(epochId, NODE1, T(5000), proof1))
      .to.be.revertedWithCustomError(srm, "AlreadyClaimed")
    await expect(srm.claim(epochId, NODE2, T(8000), []))
      .to.be.revertedWithCustomError(srm, "InvalidMerkleProof")
    await expect(srm.claim(epochId, NODE2, T(9999), proof1))
      .to.be.revertedWithCustomError(srm, "InvalidMerkleProof")
    await expect(srm.claim(epochId + 99n, NODE1, T(5000), proof1))
      .to.be.revertedWithCustomError(srm, "EpochNotSubmitted")
  })

  it("rejects claim for an unregistered node", async () => {
    const { srm, relayer } = await deploy()
    const epochId = await srm.currentEpoch()
    const ghost = ethers.id("ghost")
    const { root, proof } = oneLeafTree(leafHash(epochId, ghost, T(5000)))
    await srm.connect(relayer).submitStorageEpoch(epochId, root, T(5000))
    await expect(srm.claim(epochId, ghost, T(5000), proof))
      .to.be.revertedWithCustomError(srm, "NodeNotRegistered")
  })

  it("rejects a claim that would exceed the epoch budget", async () => {
    const { srm, relayer } = await deploy()
    const epochId = await srm.currentEpoch()
    const { root, proof } = oneLeafTree(leafHash(epochId, NODE1, T(10000)))
    await srm.connect(relayer).submitStorageEpoch(epochId, root, T(5000)) // budget < leaf
    await expect(srm.claim(epochId, NODE1, T(10000), proof))
      .to.be.revertedWithCustomError(srm, "ClaimExceedsEpochBudget")
  })

  it("rejects claim after the claim window", async () => {
    const { srm, epochId, proof1 } = await submitted()
    await jumpEpochs(Number(await srm.CLAIM_WINDOW_EPOCHS()) + 1)
    await expect(srm.claim(epochId, NODE1, T(5000), proof1))
      .to.be.revertedWithCustomError(srm, "ClaimWindowClosed")
  })
})

describe("StorageRewardManager: sweepUnclaimed (H2)", () => {
  it("reclaims unclaimed budget into the pool after the window", async () => {
    const { srm, relayer, op1 } = await deploy()
    const epochId = await srm.currentEpoch()
    const l1 = leafHash(epochId, NODE1, T(5000))
    const l2 = leafHash(epochId, NODE2, T(8000))
    const { root, proof0 } = twoLeafTree(l1, l2)
    await srm.connect(relayer).submitStorageEpoch(epochId, root, T(13000))
    await srm.claim(epochId, NODE1, T(5000), proof0) // only NODE1 claims
    expect(await srm.totalScheduled()).to.equal(T(13000))

    await expect(srm.sweepUnclaimed(epochId))
      .to.be.revertedWithCustomError(srm, "SweepWindowNotElapsed")

    await jumpEpochs(Number(await srm.CLAIM_WINDOW_EPOCHS()) + 1)
    await expect(srm.sweepUnclaimed(epochId))
      .to.emit(srm, "UnclaimedSwept").withArgs(epochId, T(8000)) // 13000 - 5000
    expect(await srm.totalScheduled()).to.equal(T(5000))         // reclaimed
    expect(await srm.remainingPool()).to.equal(M(400) - T(5000))

    await expect(srm.sweepUnclaimed(epochId))
      .to.be.revertedWithCustomError(srm, "AlreadySwept")
  })
})

describe("StorageRewardManager: payForStorage", () => {
  it("splits 70/20/10 to node / treasury / burn", async () => {
    const { srm, mesh, ecosystem, treasury, op1 } = await deploy()
    const amount = T(1000)
    await mesh.connect(ecosystem).approve(await srm.getAddress(), amount)

    const supplyBefore = await mesh.totalSupply()
    await expect(srm.connect(ecosystem).payForStorage(NODE1, amount))
      .to.emit(srm, "StoragePaid").withArgs(ecosystem.address, NODE1, op1.address, T(700), T(200), T(100))

    expect(await mesh.balanceOf(op1.address)).to.equal(T(700))
    expect(await mesh.balanceOf(treasury.address)).to.equal(T(200))
    expect(await mesh.totalSupply()).to.equal(supplyBefore - T(100)) // 10% burned
    expect(await srm.totalPaidToNodes()).to.equal(T(700))
    expect(await srm.totalToTreasury()).to.equal(T(200))
    expect(await srm.totalBurned()).to.equal(T(100))
  })

  it("reverts on zero amount and unregistered node", async () => {
    const { srm, mesh, ecosystem } = await deploy()
    await expect(srm.connect(ecosystem).payForStorage(NODE1, 0))
      .to.be.revertedWithCustomError(srm, "ZeroAmount")
    await mesh.connect(ecosystem).approve(await srm.getAddress(), T(1))
    await expect(srm.connect(ecosystem).payForStorage(ethers.id("ghost"), T(1)))
      .to.be.revertedWithCustomError(srm, "NodeNotRegistered")
  })
})
