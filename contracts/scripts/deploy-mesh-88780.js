/**
 * Deploy the $MESH storage-economy contracts to 88780 (UUPS proxies).
 *
 *   MeshVesting          — team 20% (200M), 4-year linear
 *   MeshToken            — ERC-20 MESH, 1B fixed, 40/20/20/20 allocation
 *   StorageRewardManager — settles PoSe "S" storage rewards in $MESH,
 *                          reuses the existing $PALI node bond (reads
 *                          PoSeManagerV2.nodeOperator), never touches the
 *                          live U/R $PALI settlement.
 *
 * Deploy order breaks the MeshToken<->MeshVesting cycle: vesting first, its
 * address is the MeshToken team recipient, then setMeshToken wires it back.
 * The deployer holds `owner` during wiring (setMinter / setRelayer /
 * setMeshToken) and hands every contract to the multisig at the end.
 *
 * PoSeManagerV2 address is read from configs/deployed-contracts-88780.json.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   PALI_RPC_URL=... PALI_CHAIN_ID=88780
 *   MULTISIG_ADDRESS=0x...            (upgrade + ownership authority)
 *   MESH_ECOSYSTEM=0x... MESH_LIQUIDITY=0x... MESH_TREASURY=0x...
 *   MESH_TEAM_BENEFICIARY=0x... MESH_RELAYER=0x...
 *     npx hardhat run scripts/deploy-mesh-88780.js --network coc
 *
 * Unset governance addresses fall back to the multisig (treasury/ecosystem/
 * liquidity/beneficiary) or deployer (relayer) — convenient for devnet.
 */

const { ethers, upgrades } = require("hardhat")
const fs = require("fs")
const path = require("path")
const { assertSafeDeployer } = require("./preflight.js")

// Storage reward pool = 400M MESH, released linearly over 8 years (8760 epochs/yr).
const STORAGE_REWARD_POOL = ethers.parseEther("400000000")
const RELEASE_EPOCHS = 8n * 8760n
const DEFAULT_EMISSION_PER_EPOCH = STORAGE_REWARD_POOL / RELEASE_EPOCHS // ~5707.76 MESH/epoch

const CONFIG_PATH = path.join(__dirname, "..", "..", "configs", "deployed-contracts-88780.json")

function requireAddress(value, label) {
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`Invalid or missing address for ${label}: ${value}`)
  }
  return ethers.getAddress(value)
}

async function deployProxy(factoryName, args) {
  const Factory = await ethers.getContractFactory(factoryName)
  const proxy = await upgrades.deployProxy(Factory, args, { initializer: "initialize", kind: "uups" })
  await proxy.waitForDeployment()
  return proxy
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  assertSafeDeployer(deployer.address)

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  const poseManagerV2 = requireAddress(
    process.env.POSE_MANAGER_V2 || config.contracts?.PoSeManagerV2,
    "PoSeManagerV2 (registry source)",
  )

  const multisig = requireAddress(
    process.env.MULTISIG_ADDRESS || config.owner || deployer.address,
    "MULTISIG_ADDRESS",
  )
  const ecosystem = requireAddress(process.env.MESH_ECOSYSTEM || multisig, "MESH_ECOSYSTEM")
  const liquidity = requireAddress(process.env.MESH_LIQUIDITY || multisig, "MESH_LIQUIDITY")
  const treasury = requireAddress(process.env.MESH_TREASURY || multisig, "MESH_TREASURY")
  const beneficiary = requireAddress(process.env.MESH_TEAM_BENEFICIARY || multisig, "MESH_TEAM_BENEFICIARY")
  const relayer = requireAddress(process.env.MESH_RELAYER || deployer.address, "MESH_RELAYER")
  const emissionPerEpoch = process.env.MESH_EMISSION_PER_EPOCH
    ? BigInt(process.env.MESH_EMISSION_PER_EPOCH)
    : DEFAULT_EMISSION_PER_EPOCH

  console.log("=== $MESH storage-economy deploy (UUPS) ===")
  console.log(`Network:       ${network.name} (chainId: ${network.chainId})`)
  console.log(`Deployer:      ${deployer.address}`)
  console.log(`Multisig:      ${multisig}`)
  console.log(`PoSeManagerV2: ${poseManagerV2} (bond/operator source, read-only)`)
  console.log(`Emission/epoch:${ethers.formatEther(emissionPerEpoch)} MESH`)
  console.log("")

  // 1. MeshVesting (deployer owns it during wiring)
  const vesting = await deployProxy("MeshVesting", [beneficiary, deployer.address])
  const vestingAddr = await vesting.getAddress()
  console.log(`MeshVesting:          ${vestingAddr}`)

  // 2. MeshToken — team bucket minted to the vesting contract
  const mesh = await deployProxy("MeshToken", [ecosystem, vestingAddr, liquidity, deployer.address])
  const meshAddr = await mesh.getAddress()
  console.log(`MeshToken:            ${meshAddr}`)

  // 3. StorageRewardManager — reads PoSeManagerV2 for node operators
  const srm = await deployProxy("StorageRewardManager", [
    meshAddr, poseManagerV2, treasury, emissionPerEpoch, deployer.address,
  ])
  const srmAddr = await srm.getAddress()
  console.log(`StorageRewardManager: ${srmAddr}`)

  // 4. Wiring (deployer still owns everything)
  console.log("\n-- wiring --")
  await (await vesting.setMeshToken(meshAddr)).wait()
  console.log("  vesting.setMeshToken")
  await (await mesh.setMinter(srmAddr)).wait()
  console.log("  mesh.setMinter(StorageRewardManager)")
  await (await srm.setRelayer(relayer, true)).wait()
  console.log(`  srm.setRelayer(${relayer})`)

  // 5. Hand ownership + upgrade authority to the multisig
  console.log("\n-- ownership → multisig --")
  for (const [name, c] of [["MeshVesting", vesting], ["MeshToken", mesh], ["StorageRewardManager", srm]]) {
    await (await c.transferOwnership(multisig)).wait()
    console.log(`  ${name}.transferOwnership(${multisig})`)
  }

  // 6. Persist addresses
  config.contracts = config.contracts || {}
  config.contracts.MeshToken = meshAddr
  config.contracts.MeshVesting = vestingAddr
  config.contracts.StorageRewardManager = srmAddr
  config.meshDeployedAt = new Date().toISOString()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n")
  console.log(`\nWrote 3 addresses to ${CONFIG_PATH}`)
  console.log("NOTE: relayer must be added to the PoSe agent/relayer fleet to submit storage epochs.")
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
