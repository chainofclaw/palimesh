/**
 * Deploy CoreSetManager (UUPS proxy) to 88780 — Phase 2 core-set on-chain authority.
 *
 * The contract ranks the ValidatorRegistry candidate pool by composite score
 * (stake / bond / perf) and stores the resulting core set per epoch. Nodes read
 * `getCoreSet(epoch)`; the relayer submits `finalizeCoreSet(...)`.
 *
 * OWNERSHIP: CoreSetManager has NO transferOwnership — `initialize` sets the
 * owner permanently. We therefore deploy with owner = the 88780 3-of-5 multisig
 * (upgrade authority, consistent with the gen-5 security model). The relayer EOA
 * (default = deployer/slasher) is set as `initialRelayer` so no extra call is
 * needed to authorize submissions. Size limits (minCore/maxCore/topN) default to
 * 4/21/21; a follow-up multisig `setSizes(4,4,4)` (see the emitted prepared JSON)
 * narrows the core to Top-4 for the current 5-candidate 88780 deployment.
 *
 * USAGE
 *   COC_RPC_URL=https://clawchain.io/api/testnet/rpc \
 *   COC_CHAIN_ID=88780 \
 *   DEPLOYER_PRIVATE_KEY=0x<deployer/slasher> \
 *   [COC_CORE_SET_RELAYER=0x<relayer EOA, default=manifest.deployer>] \
 *   npx hardhat run scripts/deploy-core-set-manager-88780.js --network coc
 *
 * Outputs
 *   - configs/deployed-contracts-88780.json  (adds "CoreSetManager")
 *   - tmp/coreset-deployed.json              (proxy/impl/params/deployedAt)
 *   - tmp/coreset-setsizes-prepared.json     (feeds multisig-execute-pose-call.js
 *                                             to run setSizes(4,4,4) via multisig)
 *
 * Safety
 *   - Deploy only; touches no existing proxy. finalizeCoreSet is inert until the
 *     relayer starts submitting AND PoSeManagerV2 exposes getNodeBond (deploy the
 *     PoSeManagerV2 upgrade first — see prepare-pose-getnodebond-upgrade.js).
 */

const fs = require("node:fs")
const path = require("node:path")
const { ethers, upgrades } = require("hardhat")
const { assertSafeDeployer } = require("./preflight.js")

const DEPLOYED_88780 = path.join(__dirname, "..", "..", "configs", "deployed-contracts-88780.json")
const TMP_DIR = path.join(__dirname, "..", "tmp")

// Target core-set sizing for the current 88780 deployment (5 candidates → Top-4).
const TARGET_MIN_CORE = 4
const TARGET_MAX_CORE = 4
const TARGET_TOP_N = 4

function isAddr(a) {
  return typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a)
}

async function main() {
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_88780, "utf8"))
  if (deployed.chainId !== 88780) {
    throw new Error(`expected deployed-contracts manifest for chainId=88780, got ${deployed.chainId}`)
  }
  const registry = deployed.contracts.ValidatorRegistry
  const pose = deployed.contracts.PoSeManagerV2
  const multisig = deployed.owner
  const relayer = process.env.COC_CORE_SET_RELAYER || deployed.deployer
  for (const [k, v] of Object.entries({ registry, pose, multisig, relayer })) {
    if (!isAddr(v)) throw new Error(`bad/missing address for ${k}: ${v}`)
  }
  if (deployed.contracts.CoreSetManager) {
    throw new Error(
      `CoreSetManager already recorded (${deployed.contracts.CoreSetManager}); ` +
      `refusing to redeploy. Remove it from the manifest to force a fresh deploy.`,
    )
  }

  const [deployer] = await ethers.getSigners()
  assertSafeDeployer(deployer.address)
  const network = await ethers.provider.getNetwork()
  if (Number(network.chainId) !== 88780) {
    throw new Error(`network mismatch: connected to chainId=${network.chainId}, expected 88780`)
  }

  console.log("=== CoreSetManager Deployment (UUPS) — 88780 ===")
  console.log(`  network:  ${network.name} (chainId ${network.chainId})`)
  console.log(`  deployer: ${deployer.address}  (${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH)`)
  console.log(`  owner (multisig):   ${multisig}`)
  console.log(`  initialRelayer:     ${relayer}`)
  console.log(`  ValidatorRegistry:  ${registry}`)
  console.log(`  PoSeManagerV2:      ${pose}`)
  console.log("")

  const Factory = await ethers.getContractFactory("CoreSetManager")
  console.log("  deploying proxy (initialize(owner, relayer, registry, pose))...")
  const proxy = await upgrades.deployProxy(
    Factory,
    [multisig, relayer, registry, pose],
    { initializer: "initialize", kind: "uups" },
  )
  await proxy.waitForDeployment()
  const proxyAddr = await proxy.getAddress()
  const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr)
  console.log(`    ✓ proxy: ${proxyAddr}`)
  console.log(`    ✓ impl:  ${implAddr}`)

  // Sanity read-back.
  const ownerOnChain = await proxy.owner()
  const relayerOnChain = await proxy.relayer()
  if (ownerOnChain.toLowerCase() !== multisig.toLowerCase()) {
    throw new Error(`owner mismatch after deploy: on-chain=${ownerOnChain}, expected=${multisig}`)
  }
  if (relayerOnChain.toLowerCase() !== relayer.toLowerCase()) {
    throw new Error(`relayer mismatch after deploy: on-chain=${relayerOnChain}, expected=${relayer}`)
  }
  console.log(`    ✓ owner/relayer verified on-chain`)
  console.log("")

  fs.mkdirSync(TMP_DIR, { recursive: true })

  // 1. Deployment record.
  const record = {
    chainId: 88780,
    contract: "CoreSetManager",
    proxy: proxyAddr,
    impl: implAddr,
    owner: multisig,
    relayer,
    validatorRegistry: registry,
    poseManagerV2: pose,
    deployedAt: new Date().toISOString(),
    note: "initialize defaults minCore=4/maxCore=21/topN=21; run setSizes via multisig to narrow to Top-4",
  }
  fs.writeFileSync(path.join(TMP_DIR, "coreset-deployed.json"), JSON.stringify(record, null, 2) + "\n")
  console.log(`  wrote tmp/coreset-deployed.json`)

  // 2. Update the canonical deployed-contracts manifest.
  deployed.contracts.CoreSetManager = proxyAddr
  fs.writeFileSync(DEPLOYED_88780, JSON.stringify(deployed, null, 2) + "\n")
  console.log(`  updated configs/deployed-contracts-88780.json (+CoreSetManager)`)

  // 3. Prepared multisig call for setSizes(4,4,4) — feeds multisig-execute-pose-call.js.
  const setSizesPrepared = {
    chainId: 88780,
    multisig,
    calls: [
      {
        name: "setSizes(minCore,maxCore,topN)",
        target: proxyAddr,
        value: "0",
        signature: "setSizes(uint16,uint16,uint16)",
        args: [String(TARGET_MIN_CORE), String(TARGET_MAX_CORE), String(TARGET_TOP_N)],
        issue: "#783",
        pr: "core-set B0",
        verify: { signature: "topN() view returns (uint16)", expected: String(TARGET_TOP_N) },
      },
    ],
  }
  fs.writeFileSync(
    path.join(TMP_DIR, "coreset-setsizes-prepared.json"),
    JSON.stringify(setSizesPrepared, null, 2) + "\n",
  )
  console.log(`  wrote tmp/coreset-setsizes-prepared.json`)
  console.log("")
  console.log("Next steps:")
  console.log("  1. Deploy the PoSeManagerV2 getNodeBond upgrade (if not already):")
  console.log("       npx hardhat run scripts/prepare-pose-getnodebond-upgrade.js --network coc")
  console.log("       PHASE_B_INPUT=tmp/upgrade-coreset-prepared.json \\")
  console.log("         npx hardhat run scripts/multisig-execute-security-upgrades.js --network coc")
  console.log("  2. Narrow the core to Top-4 via multisig:")
  console.log("       PHASE_B_INPUT=tmp/coreset-setsizes-prepared.json \\")
  console.log("         npx hardhat run scripts/multisig-execute-pose-call.js --network coc")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
