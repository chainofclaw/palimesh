/**
 * MeshToken Test Suite — Phase 3 ($MESH storage token).
 *
 * Covers:
 *   - genesis 60% mint to three buckets + totalSupply + bucket-sum invariant
 *   - initialize zero-address rejection
 *   - owner / minter management (onlyOwner, events, zero-address)
 *   - storage-reward mint (onlyMinter, reward-pool cap, supply accounting)
 *   - burn / burnFrom (balance, allowance, supply reduction)
 *   - standard ERC-20 transfer / approve / transferFrom + revert paths
 *   - view helpers (remainingRewardPool, circulatingSupply)
 */

const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

const E = (n) => ethers.parseEther(String(n))
const M = (n) => ethers.parseEther(String(n * 1_000_000))

async function deployMesh() {
  const [deployer, ecosystem, teamVesting, liquidity, owner] = await ethers.getSigners()
  const Factory = await ethers.getContractFactory("MeshToken")
  const mesh = await upgrades.deployProxy(
    Factory,
    [ecosystem.address, teamVesting.address, liquidity.address, owner.address],
    { initializer: "initialize", kind: "uups" },
  )
  await mesh.waitForDeployment()
  return { mesh, deployer, ecosystem, teamVesting, liquidity, owner }
}

describe("MeshToken: metadata & constants", () => {
  it("exposes MESH metadata and a consistent 1B allocation", async () => {
    const { mesh } = await deployMesh()
    expect(await mesh.name()).to.equal("PaliMesh Storage")
    expect(await mesh.symbol()).to.equal("MESH")
    expect(await mesh.decimals()).to.equal(18)

    const cap = await mesh.TOTAL_SUPPLY_CAP()
    const pool = await mesh.STORAGE_REWARD_POOL()
    const eco = await mesh.ECOSYSTEM_SUPPLY()
    const team = await mesh.TEAM_SUPPLY()
    const liq = await mesh.LIQUIDITY_SUPPLY()
    expect(cap).to.equal(M(1000))
    expect(pool).to.equal(M(400))
    expect(pool + eco + team + liq).to.equal(cap)
    expect(await mesh.GENESIS_SUPPLY()).to.equal(eco + team + liq)
  })
})

describe("MeshToken: genesis", () => {
  it("mints 60% across the three genesis buckets and sets owner", async () => {
    const { mesh, ecosystem, teamVesting, liquidity, owner } = await deployMesh()
    expect(await mesh.balanceOf(ecosystem.address)).to.equal(M(200))
    expect(await mesh.balanceOf(teamVesting.address)).to.equal(M(200))
    expect(await mesh.balanceOf(liquidity.address)).to.equal(M(200))
    expect(await mesh.totalSupply()).to.equal(M(600))
    expect(await mesh.totalMinted()).to.equal(0n)
    expect(await mesh.owner()).to.equal(owner.address)
    expect(await mesh.remainingRewardPool()).to.equal(M(400))
  })

  it("rejects zero-address recipients / owner", async () => {
    const [deployer, a, b, c] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("MeshToken")
    for (const args of [
      [ethers.ZeroAddress, b.address, c.address, a.address],
      [a.address, ethers.ZeroAddress, c.address, a.address],
      [a.address, b.address, ethers.ZeroAddress, a.address],
      [a.address, b.address, c.address, ethers.ZeroAddress],
    ]) {
      await expect(
        upgrades.deployProxy(Factory, args, { initializer: "initialize", kind: "uups" }),
      ).to.be.revertedWithCustomError(Factory, "ZeroAddress")
    }
  })
})

describe("MeshToken: minter management", () => {
  it("owner sets minter and emits", async () => {
    const { mesh, owner, deployer } = await deployMesh()
    await expect(mesh.connect(owner).setMinter(deployer.address))
      .to.emit(mesh, "MinterUpdated")
      .withArgs(ethers.ZeroAddress, deployer.address)
    expect(await mesh.minter()).to.equal(deployer.address)
  })

  it("non-owner cannot set minter", async () => {
    const { mesh, deployer } = await deployMesh()
    await expect(mesh.connect(deployer).setMinter(deployer.address))
      .to.be.revertedWithCustomError(mesh, "NotOwner")
  })

  it("rejects zero-address minter", async () => {
    const { mesh, owner } = await deployMesh()
    await expect(mesh.connect(owner).setMinter(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(mesh, "ZeroAddress")
  })

  it("transferOwnership moves the role", async () => {
    const { mesh, owner, deployer } = await deployMesh()
    await expect(mesh.connect(owner).transferOwnership(deployer.address))
      .to.emit(mesh, "OwnerUpdated").withArgs(owner.address, deployer.address)
    expect(await mesh.owner()).to.equal(deployer.address)
    await expect(mesh.connect(owner).setMinter(deployer.address))
      .to.be.revertedWithCustomError(mesh, "NotOwner")
  })
})

describe("MeshToken: storage-reward mint", () => {
  it("minter mints from the reward pool and tracks supply", async () => {
    const { mesh, owner, deployer, ecosystem } = await deployMesh()
    await mesh.connect(owner).setMinter(deployer.address)
    await expect(mesh.connect(deployer).mint(ecosystem.address, M(10)))
      .to.emit(mesh, "Mint").withArgs(ecosystem.address, M(10))
    expect(await mesh.balanceOf(ecosystem.address)).to.equal(M(210))
    expect(await mesh.totalMinted()).to.equal(M(10))
    expect(await mesh.totalSupply()).to.equal(M(610))
    expect(await mesh.remainingRewardPool()).to.equal(M(390))
  })

  it("non-minter cannot mint", async () => {
    const { mesh, deployer, ecosystem } = await deployMesh()
    await expect(mesh.connect(deployer).mint(ecosystem.address, M(1)))
      .to.be.revertedWithCustomError(mesh, "NotMinter")
  })

  it("mint cannot exceed the 400M reward pool", async () => {
    const { mesh, owner, deployer, ecosystem } = await deployMesh()
    await mesh.connect(owner).setMinter(deployer.address)
    await mesh.connect(deployer).mint(ecosystem.address, M(400))
    expect(await mesh.remainingRewardPool()).to.equal(0n)
    await expect(mesh.connect(deployer).mint(ecosystem.address, 1n))
      .to.be.revertedWithCustomError(mesh, "ExceedsRewardPool")
  })

  it("rejects mint to zero address", async () => {
    const { mesh, owner, deployer } = await deployMesh()
    await mesh.connect(owner).setMinter(deployer.address)
    await expect(mesh.connect(deployer).mint(ethers.ZeroAddress, M(1)))
      .to.be.revertedWithCustomError(mesh, "ZeroAddress")
  })
})

describe("MeshToken: burn", () => {
  it("burn reduces balance and supply and records totalBurned", async () => {
    const { mesh, ecosystem } = await deployMesh()
    await expect(mesh.connect(ecosystem).burn(M(50)))
      .to.emit(mesh, "Burn").withArgs(ecosystem.address, M(50))
    expect(await mesh.balanceOf(ecosystem.address)).to.equal(M(150))
    expect(await mesh.totalSupply()).to.equal(M(550))
    expect(await mesh.totalBurned()).to.equal(M(50))
  })

  it("burn above balance reverts", async () => {
    const { mesh, ecosystem } = await deployMesh()
    await expect(mesh.connect(ecosystem).burn(M(201)))
      .to.be.revertedWithCustomError(mesh, "InsufficientBalance")
  })

  it("burnFrom respects allowance", async () => {
    const { mesh, ecosystem, liquidity } = await deployMesh()
    await mesh.connect(ecosystem).approve(liquidity.address, M(30))
    await mesh.connect(liquidity).burnFrom(ecosystem.address, M(30))
    expect(await mesh.balanceOf(ecosystem.address)).to.equal(M(170))
    expect(await mesh.totalBurned()).to.equal(M(30))
    await expect(mesh.connect(liquidity).burnFrom(ecosystem.address, 1n))
      .to.be.revertedWithCustomError(mesh, "InsufficientAllowance")
  })
})

describe("MeshToken: ERC-20", () => {
  it("transfer moves balance and emits", async () => {
    const { mesh, ecosystem, deployer } = await deployMesh()
    await expect(mesh.connect(ecosystem).transfer(deployer.address, M(5)))
      .to.emit(mesh, "Transfer").withArgs(ecosystem.address, deployer.address, M(5))
    expect(await mesh.balanceOf(deployer.address)).to.equal(M(5))
  })

  it("transfer reverts on zero address and insufficient balance", async () => {
    const { mesh, ecosystem, deployer } = await deployMesh()
    await expect(mesh.connect(ecosystem).transfer(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(mesh, "ZeroAddress")
    await expect(mesh.connect(deployer).transfer(ecosystem.address, 1n))
      .to.be.revertedWithCustomError(mesh, "InsufficientBalance")
  })

  it("approve + transferFrom with allowance accounting", async () => {
    const { mesh, ecosystem, liquidity, deployer } = await deployMesh()
    await expect(mesh.connect(ecosystem).approve(liquidity.address, M(40)))
      .to.emit(mesh, "Approval").withArgs(ecosystem.address, liquidity.address, M(40))
    await mesh.connect(liquidity).transferFrom(ecosystem.address, deployer.address, M(25))
    expect(await mesh.balanceOf(deployer.address)).to.equal(M(25))
    expect(await mesh.allowance(ecosystem.address, liquidity.address)).to.equal(M(15))
    await expect(mesh.connect(liquidity).transferFrom(ecosystem.address, deployer.address, M(20)))
      .to.be.revertedWithCustomError(mesh, "InsufficientAllowance")
  })

  it("transferFrom reverts on zero-address recipient and low balance", async () => {
    const { mesh, ecosystem, liquidity, deployer } = await deployMesh()
    await mesh.connect(ecosystem).approve(liquidity.address, M(1000))
    await expect(mesh.connect(liquidity).transferFrom(ecosystem.address, ethers.ZeroAddress, M(1)))
      .to.be.revertedWithCustomError(mesh, "ZeroAddress")
    await expect(mesh.connect(liquidity).transferFrom(ecosystem.address, deployer.address, M(201)))
      .to.be.revertedWithCustomError(mesh, "InsufficientBalance")
  })
})
