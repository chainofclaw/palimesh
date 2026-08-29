// PM2 config for Palimesh production synthetic + active health loops.
//
// Two processes:
//   palimesh-synthetic   — passive HTTP/RPC invariants, 60s interval (fast MTTD)
//   palimesh-health-loop — active txs + auto-remediation, 30 min interval
//
// Deploy:  pm2 startOrReload scripts/synthetic/ecosystem.config.cjs && pm2 save
// Logs:    pm2 logs palimesh-synthetic   /   pm2 logs palimesh-health-loop
module.exports = {
  apps: [
    {
      name: 'palimesh-synthetic',
      script: 'check-prod.mjs',
      cwd: __dirname,
      args: '--watch --json /var/log/palimesh-synthetic/last.json',
      autorestart: true,
      max_restarts: 50,
      max_memory_restart: '256M',
      env: {
        PALI_CHAIN_ID: '88780',
        PALI_RPC_URL: 'https://palimesh.io/api/testnet/rpc',
        PALI_WS_URL: 'wss://palimesh.io/api/testnet/ws',
        PALI_FAUCET_URL: 'https://faucet.palimesh.io',
        PALI_FAUCET_ADDRESS: '0x47f9940cCf9777C0407F094A1B0d8c50b0DD01BF',
        PALI_FAUCET_MIN_BALANCE: '100',
        PALI_WEBSITE_URL: 'https://palimesh.io',
        PALI_EXPLORER_URL: 'https://explorer.palimesh.io',
        PALI_IPFS_URL: 'https://ipfs.palimesh.io',
        PALI_BLOCK_FRESHNESS_SEC: '60',
        CHECK_INTERVAL_SEC: '60',
      },
    },
    {
      name: 'palimesh-health-loop',
      script: 'health-loop.mjs',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 50,
      max_memory_restart: '512M',
      env: {
        // Active probe knobs — use loopback on prod to avoid hairpin-NAT cold-start
        PROBE_RPC: 'http://127.0.0.1:28780',
        PROBE_CHAIN_ID: '88780',
        PROBE_PK: process.env.PROBE_PK || '',
        PROBE_TX_TIMEOUT_MS: '30000',
        // Remediation knobs
        DEPLOYER_PK: process.env.DEPLOYER_PK || '',
        FAUCET_ADDR: '0x47f9940cCf9777C0407F094A1B0d8c50b0DD01BF',
        FAUCET_MIN_COC: '1000',
        FAUCET_REFUND_COC: '50000',
        BLOCK_FRESHNESS_LIMIT_SEC: '300',
        SSH_KEY: '/root/.ssh/palimesh-automation',
        REMEDIATE_STATE: '/var/lib/palimesh-synthetic/state.json',
        // Loop cadence
        HEALTH_LOOP_INTERVAL_SEC: '1800', // 30 min
        HEALTH_STRESS_EVERY: '4',  // run stress probe every 4 ticks (~2 hours)
        STRESS_N: '32',
        STRESS_MODE: 'mixed',
        HEALTH_REPORT_DIR: '/var/log/palimesh-synthetic',
      },
    },
  ],
}
