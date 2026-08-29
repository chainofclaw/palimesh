/**
 * Prepare the PoSeManagerV2 upgrade that adds `getNodeBond(bytes32) view` —
 * the additive view CoreSetManager.finalizeCoreSet reads to score each
 * candidate's PoSe bond. Without it, finalizeCoreSet reverts on prod.
 *
 * This is the deployer-side half (deploy new impl only). The proxy is owned by
 * the 88780 3-of-5 multisig, so the actual upgradeToAndCall is executed by
 * multisig-execute-security-upgrades.js (which consumes the manifest emitted
 * here via PHASE_B_INPUT).
 *
 * USAGE
 *   COC_RPC_URL=https://clawchain.io/api/testnet/rpc \
 *   COC_CHAIN_ID=88780 \
 *   DEPLOYER_PRIVATE_KEY=0x<deployer> \
 *   npx hardhat run scripts/prepare-pose-getnodebond-upgrade.js --network coc
 *
 * Output
 *   tmp/upgrade-coreset-prepared.json — { chainId, multisig, upgrades:[{pr,name,proxy,newImpl}] }
 *   (batch format consumed by multisig-execute-security-upgrades.js)
 *
 * Safety
 *   - validateUpgrade asserts getNodeBond is append-only (no slot relocation);
 *     aborts on any storage-layout violation.
 *   - prepareUpgrade deploys the new impl at a fresh address and records it in
 *     .openzeppelin/unknown-88780.json. No proxy state is touched here.
 */

const fs = require("node:fs")
const path = require("node:path")
const { ethers, upgrades } = require("hardhat")

const DEPLOYED_88780 = path.join(__dirname, "..", "..", "configs", "deployed-contracts-88780.json")
const TMP_DIR = path.join(__dirname, "..", "tmp")

async function main() {
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_88780, "utf8"))
  if (deployed.chainId !== 88780) throw new Error(`expected chainId=88780, got ${deployed.chainId}`)
  const proxy = deployed.contracts.PoSeManagerV2
  const multisig = deployed.owner
  if (!/^0x[0-9a-fA-F]{40}$/.test(proxy)) throw new Error(`bad PoSeManagerV2 address: ${proxy}`)
  if (!/^0x[0-9a-fA-F]{40}$/.test(multisig)) throw new Error(`bad multisig address: ${multisig}`)

  const network = await ethers.provider.getNetwork()
  if (Number(network.chainId) !== 88780) {
    throw new Error(`network mismatch: connected to chainId=${network.chainId}, expected 88780`)
  }

  console.log("PoSeManagerV2 getNodeBond upgrade — preparing new implementation")
  console.log(`  proxy:    ${proxy}`)
  console.log(`  multisig: ${multisig}`)
  console.log(`  network:  ${network.name} (chainId ${network.chainId})`)

  const Factory = await ethers.getContractFactory("PoSeManagerV2")

  console.log("  validating storage layout compatibility (getNodeBond must be additive)...")
  await upgrades.validateUpgrade(proxy, Factory, { kind: "uups" })
  console.log("    ✓ layout compatible")

  console.log("  deploying new implementation (no proxy state changes)...")
  const newImpl = await upgrades.prepareUpgrade(proxy, Factory, { kind: "uups" })
  if (typeof newImpl !== "string") throw new Error(`prepareUpgrade returned non-string: ${String(newImpl)}`)
  console.log(`    ✓ new impl: ${newImpl}`)

  const out = {
    chainId: 88780,
    multisig,
    upgrades: [
      {
        pr: "#783",
        name: "PoSeManagerV2 (getNodeBond)",
        proxy,
        newImpl,
      },
    ],
    preparedAt: new Date().toISOString(),
  }
  fs.mkdirSync(TMP_DIR, { recursive: true })
  const outPath = path.join(TMP_DIR, "upgrade-coreset-prepared.json")
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n")
  console.log(`  wrote ${outPath}`)
  console.log("")
  console.log("Next step: execute the upgrade via multisig:")
  console.log("  PHASE_B_INPUT=tmp/upgrade-coreset-prepared.json \\")
  console.log("    npx hardhat run scripts/multisig-execute-security-upgrades.js --network coc")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
