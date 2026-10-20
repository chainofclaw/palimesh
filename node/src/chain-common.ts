/**
 * Mainnet-derived EthereumJS chain config with mainnet's fork *heights*
 * neutralised.
 *
 * Palimesh selects the active hardfork explicitly (`setHardfork`), but
 * @ethereumjs/block and @ethereumjs/vm still consult the preset's fork block
 * numbers for a few height-triggered special cases:
 *   - DAO (1920000): header requires extraData='dao-hard-fork' for
 *     1920000..1920009, and runBlock applies the DAO refund at 1920000.
 *     This halted 88780 at 1919999 on 2026-09-08.
 *   - London (12965000): header requires baseFee == initialBaseFee and the
 *     gas-limit check doubles the parent limit at that height.
 * Removing DAO and pinning every block-scheduled fork to genesis disables
 * those special cases (ethereumjs exempts London at block 0). Below the old
 * heights nothing changes, so historical blocks re-execute identically.
 */
import { Mainnet, getPresetChainConfig, type ChainConfig } from "@ethereumjs/common"

export function palimeshChainConfig(base: ChainConfig = getPresetChainConfig("mainnet")): ChainConfig {
  const hardforks = base.hardforks
    .filter((hf) => hf.name !== "dao")
    .map((hf) => (hf.block === null ? { ...hf } : { ...hf, block: 0 }))
  return { ...base, hardforks }
}

export function palimeshWorkerChainConfig(chainId: number): ChainConfig {
  return { ...palimeshChainConfig(Mainnet), chainId }
}
