/**
 * MeshVesting Test Suite — Phase 3 (team 4-year linear vesting of $MESH).
 *
 * Uses the real MeshToken (genesis-mints TEAM_SUPPLY to the vesting contract),
 * so this also covers the MeshToken<->MeshVesting deployment cycle break.
 */

const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

const M = (n) => ethers.parseEther(String(n * 1_000_000))
const YEAR = 365 * 24 * 3600

async function deploy() {
  const [deployer, beneficiary, ecosystem, liquidity, owner] = await ethers.getSigners()

  const Vesting = await ethers.getContractFactory("MeshVesting")
  const vesting = await upgrades.deployProxy(
    Vesting,
    [beneficiary.address, owner.address],
    { initializer: "initialize", kind: "uups" },
  )
  await vesting.waitForDeployment()

  const Mesh = await ethers.getContractFactory("MeshToken")
  const mesh = await upgrades.deployProxy(
    Mesh,
    [ecosystem.address, await vesting.getAddress(), liquidity.address, owner.address],
    { initializer: "initialize", kind: "uups" },
  )
  await mesh.waitForDeployment()

  await vesting.connect(owner).setMeshToken(await mesh.getAddress())
  return { vesting, mesh, deployer, beneficiary, owner }
}

describe("MeshVesting: setup", () => {
  it("holds 200M MESH and starts vesting at deploy", async () => {
    const { vesting, mesh, beneficiary, owner } = await deploy()
    expect(await mesh.balanceOf(await vesting.getAddress())).to.equal(M(200))
    expect(await vesting.beneficiary()).to.equal(beneficiary.address)
    expect(await vesting.owner()).to.equal(owner.address)
    expect(await vesting.TEAM_SUPPLY()).to.equal(M(200))
    // deploy txs advance a few seconds; vs a 4-year schedule that is dust
    expect(await vesting.vestedAmount()).to.be.lessThan(M(1))
  })

  it("rejects zero-address init and double token-set", async () => {
    const [d, b] = await ethers.getSigners()
    const Vesting = await ethers.getContractFactory("MeshVesting")
    await expect(
      upgrades.deployProxy(Vesting, [ethers.ZeroAddress, b.address], { initializer: "initialize", kind: "uups" }),
    ).to.be.revertedWithCustomError(Vesting, "ZeroAddress")

    const { vesting, mesh, owner } = await deploy()
    await expect(vesting.connect(owner).setMeshToken(await mesh.getAddress()))
      .to.be.revertedWithCustomError(vesting, "TokenAlreadySet")
  })
})

describe("MeshVesting: linear release", () => {
  it("vests ~50% at 2 years and 100% after 4 years", async () => {
    const { vesting } = await deploy()

    await ethers.provider.send("evm_increaseTime", [2 * YEAR])
    await ethers.provider.send("evm_mine", [])
    const half = await vesting.vestedAmount()
    // ~100M ± a block of drift
    expect(half).to.be.greaterThan(M(99))
    expect(half).to.be.lessThan(M(101))

    await ethers.provider.send("evm_increaseTime", [2 * YEAR])
    await ethers.provider.send("evm_mine", [])
    expect(await vesting.vestedAmount()).to.equal(M(200))
  })

  it("beneficiary releases vested MESH; others cannot", async () => {
    const { vesting, mesh, beneficiary, deployer } = await deploy()

    await ethers.provider.send("evm_increaseTime", [2 * YEAR])
    await ethers.provider.send("evm_mine", [])

    await expect(vesting.connect(deployer).release(M(1)))
      .to.be.revertedWithCustomError(vesting, "NotBeneficiary")

    const amount = M(50)
    await expect(vesting.connect(beneficiary).release(amount))
      .to.emit(vesting, "Released").withArgs(beneficiary.address, amount)
    expect(await mesh.balanceOf(beneficiary.address)).to.equal(amount)
    expect(await vesting.totalReleased()).to.equal(amount)
  })

  it("cannot release more than releasable", async () => {
    const { vesting, beneficiary } = await deploy()
    await ethers.provider.send("evm_increaseTime", [YEAR])
    await ethers.provider.send("evm_mine", [])
    // ~50M vested after 1 year; releasing 60M must revert
    await expect(vesting.connect(beneficiary).release(M(60)))
      .to.be.revertedWithCustomError(vesting, "NothingToRelease")
  })

  it("reverts release when token unset", async () => {
    const [d, beneficiary, owner] = await ethers.getSigners()
    const Vesting = await ethers.getContractFactory("MeshVesting")
    const v = await upgrades.deployProxy(
      Vesting, [beneficiary.address, owner.address], { initializer: "initialize", kind: "uups" },
    )
    await v.waitForDeployment()
    await ethers.provider.send("evm_increaseTime", [YEAR])
    await ethers.provider.send("evm_mine", [])
    // vesting clock is unanchored until setMeshToken — nothing vests
    expect(await v.vestedAmount()).to.equal(0n)
    await expect(v.connect(beneficiary).release(M(1)))
      .to.be.revertedWithCustomError(v, "TokenNotSet")
  })
})

describe("MeshVesting: admin", () => {
  it("transferOwnership: onlyOwner + event + zero-addr", async () => {
    const { vesting, owner, beneficiary, deployer } = await deploy()
    await expect(vesting.connect(deployer).transferOwnership(deployer.address))
      .to.be.revertedWithCustomError(vesting, "NotOwner")
    await expect(vesting.connect(owner).transferOwnership(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(vesting, "ZeroAddress")
    await expect(vesting.connect(owner).transferOwnership(beneficiary.address))
      .to.emit(vesting, "OwnerUpdated").withArgs(owner.address, beneficiary.address)
    expect(await vesting.owner()).to.equal(beneficiary.address)
  })

  it("updateBeneficiary: onlyOwner + event + zero-addr", async () => {
    const { vesting, owner, beneficiary, deployer } = await deploy()
    await expect(vesting.connect(deployer).updateBeneficiary(deployer.address))
      .to.be.revertedWithCustomError(vesting, "NotOwner")
    await expect(vesting.connect(owner).updateBeneficiary(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(vesting, "ZeroAddress")
    await expect(vesting.connect(owner).updateBeneficiary(deployer.address))
      .to.emit(vesting, "BeneficiaryUpdated").withArgs(beneficiary.address, deployer.address)
    expect(await vesting.beneficiary()).to.equal(deployer.address)
  })

  it("setMeshToken rejects zero address; release rejects zero amount", async () => {
    const [d, ben, owner] = await ethers.getSigners()
    const Vesting = await ethers.getContractFactory("MeshVesting")
    const v = await upgrades.deployProxy(
      Vesting, [ben.address, owner.address], { initializer: "initialize", kind: "uups" },
    )
    await v.waitForDeployment()
    await expect(v.connect(owner).setMeshToken(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(v, "ZeroAddress")

    const { vesting, beneficiary } = await deploy()
    await ethers.provider.send("evm_increaseTime", [365 * 24 * 3600])
    await ethers.provider.send("evm_mine", [])
    await expect(vesting.connect(beneficiary).release(0))
      .to.be.revertedWithCustomError(vesting, "NothingToRelease")
  })
})
