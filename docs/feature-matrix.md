# Palimesh Feature Matrix (English)

This matrix lists features by domain, with current status and primary code references.

Status legend:
- `Production-ready`: runtime-wired and hardened for sustained production use
- `Runtime-wired`: present in code and connected to the runtime main path
- `Implemented`: present in code and exercised in tests/devnet scripts
- `Partial`: present but simplified, stubbed, or not yet hardened
- `Missing`: not implemented

## Execution & RPC
- **EVM execution engine** — Partial — `Palimesh/node/src/evm.ts`
- **RPC: basic chain info** — Implemented — `Palimesh/node/src/rpc.ts`
- **RPC: block/tx queries** — Implemented — `Palimesh/node/src/rpc.ts`
- **RPC: pending tx visibility + pending nonce** — Implemented — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/rpc-semantic-compat.test.ts`
- **RPC: safe/finalized historical block-tag semantics** — Implemented — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/rpc-semantic-compat.test.ts`
- **RPC: logs + filters** — Implemented (minimal) — `Palimesh/node/src/rpc.ts`
- **RPC: web3_sha3** — Implemented — `Palimesh/node/src/rpc.ts`
- **RPC: historical block-tag state reads** — Implemented (P0) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`, `Palimesh/node/src/storage/persistent-state-manager.ts`
- **RPC: historical execution context for call/estimate/trace** — Implemented (post-P6 parity hardening) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`
- **RPC: tx/receipt schema parity** — Implemented (P1) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/chain-engine-persistent.ts`
- **RPC: eth_createAccessList** — Implemented (P2) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`
- **RPC: eth_getProof** — Implemented (P4) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/storage/state-trie.ts`
- **RPC: eth_estimateGas intrinsic gas parity** — Implemented (post-P6 parity hardening) — `Palimesh/node/src/evm.ts`, `Palimesh/node/src/rpc.ts`
- **RPC: eth_getCompilers** — Implemented (post-P6, Solidity only) — `Palimesh/node/src/rpc.ts`
- **RPC: eth_compileSolidity** — Implemented (post-P6, lazy `solc`) — `Palimesh/node/src/rpc.ts`
- **RPC: real block header fields** — Implemented (M3) — `Palimesh/node/src/block-header.ts`, `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/chain-events.ts`
- **RPC: Cancun header/blob-gas surface** — Implemented (no blob tx inclusion) — `Palimesh/node/src/base-fee.ts`, `Palimesh/node/src/block-header.ts`, `Palimesh/node/src/rpc.ts`
- **RPC: full EVM parity** — Missing
- **EVM hardfork configurability** — Implemented (P3 + post-P6 parity hardening, single hardfork + static schedule) — `Palimesh/node/src/config.ts`, `Palimesh/node/src/evm.ts`

## Consensus & Chain
- **Proposer rotation** — Implemented — `Palimesh/node/src/chain-engine.ts`
- **Finality depth** — Implemented (simple) — `Palimesh/node/src/chain-engine.ts`
- **Fork choice (GHOST-inspired)** — Implemented (Phase 28) — `Palimesh/node/src/fork-choice.ts`
- **BFT-lite consensus rounds** — Implemented (Phase 28) — `Palimesh/node/src/bft.ts`
- **BFT coordinator** — Implemented (Phase 28) — `Palimesh/node/src/bft-coordinator.ts`
- **BFT status RPC** — Implemented (Phase 28) — `Palimesh/node/src/rpc.ts`
- **BFT commit blockHash binding** — Implemented (Audit) — `Palimesh/node/src/bft.ts`
- **BFT equivocation detection** — Implemented (Phase 30) — `Palimesh/node/src/bft.ts`
- **Validator governance** — Implemented (Phase 22 + 26) — `Palimesh/node/src/validator-governance.ts`, `Palimesh/node/src/chain-engine-persistent.ts`
- **On-chain dynamic validator set (ValidatorRegistry + reader, zero-restart)** — **Live on 88780 (2026-06-10)** — `Palimesh/runtime/lib/validator-registry-reader.ts`, `Palimesh/node/src/index.ts`, `Palimesh/contracts/contracts-src/governance/ValidatorRegistry.sol` (proxy `0x4441299c…`); see `docs/88780-dynamic-validator-enablement-2026-06-10.md`
- **Stake-weighted proposer** — Implemented (Phase 26) — `Palimesh/node/src/chain-engine-persistent.ts`
- **Block signature/stateRoot** — Implemented (Phase 26) — `Palimesh/node/src/blockchain-types.ts`
- **StateRoot verification (post-EVM)** — Implemented (M7) — `Palimesh/node/src/chain-engine.ts`
- **RPC PoW stubs** — Implemented (M7) — `Palimesh/node/src/rpc.ts`
- **Governance RPC** — Implemented (Phase 26) — `Palimesh/node/src/rpc.ts`

## Networking
- **Tx gossip** — Implemented — `Palimesh/node/src/p2p.ts`
- **Block gossip** — Implemented — `Palimesh/node/src/p2p.ts`
- **Snapshot sync** — Implemented — `Palimesh/node/src/p2p.ts`
- **Peer discovery / scoring** — Implemented (Phase 16 + 26) — `Palimesh/node/src/peer-discovery.ts`
- **Peer persistence** — Implemented (Phase 26) — `Palimesh/node/src/peer-store.ts`
- **DNS seed discovery** — Implemented (Phase 26) — `Palimesh/node/src/dns-seeds.ts`
- **BFT message routing** — Implemented (Phase 28) — `Palimesh/node/src/p2p.ts`
- **Kademlia DHT routing** — Implemented (Phase 28) — `Palimesh/node/src/dht.ts`
- **DHT network layer** — Implemented (Phase 29) — `Palimesh/node/src/dht-network.ts`
- **Binary wire protocol** — Implemented (Phase 28) — `Palimesh/node/src/wire-protocol.ts`
- **Wire server (TCP inbound)** — Implemented (Phase 29) — `Palimesh/node/src/wire-server.ts`
- **Wire client (TCP outbound)** — Implemented (Phase 29) — `Palimesh/node/src/wire-client.ts`
- **State snapshot P2P** — Implemented (Phase 29) — `Palimesh/node/src/p2p.ts`
- **Wire FIND_NODE message** — Implemented (Phase 30) — `Palimesh/node/src/wire-protocol.ts`
- **Wire connection manager** — Implemented (Phase 30) — `Palimesh/node/src/wire-connection-manager.ts`
- **DHT node announcement** — Implemented (Phase 30) — `Palimesh/node/src/dht-network.ts`
- **Dual HTTP+TCP block propagation** — Implemented (Phase 30) — `Palimesh/node/src/consensus.ts`
- **Wire transaction relay** — Implemented (Phase 30) — `Palimesh/node/src/index.ts`
- **Wire Block/Tx dedup** — Implemented (Phase 32) — `Palimesh/node/src/wire-server.ts`
- **Cross-protocol relay (Wire→HTTP)** — Implemented (Phase 32) — `Palimesh/node/src/wire-server.ts`
- **BFT dual transport (HTTP+TCP)** — Implemented (Phase 32) — `Palimesh/node/src/index.ts`
- **DHT wireClientByPeerId lookup** — Implemented (Phase 32) — `Palimesh/node/src/dht-network.ts`
- **Per-peer wire port config** — Implemented (Phase 32) — `Palimesh/node/src/index.ts`
- **broadcastFrame sender exclusion** — Implemented (Phase 32) — `Palimesh/node/src/wire-server.ts`
- **Wire frame priority queue** — Implemented (M7) — `Palimesh/node/src/wire-protocol.ts`

## Storage
- **Chain snapshot persistence** — Implemented — `Palimesh/node/src/storage.ts`
- **LevelDB persistent storage** — Implemented (Phase 13.1) — `Palimesh/node/src/storage/db.ts`
- **Block/transaction indexing** — Implemented (Phase 13.1) — `Palimesh/node/src/storage/block-index.ts`
- **Address tx pagination** — Implemented — `Palimesh/node/src/storage/block-index.ts`
- **EVM state trie** — Implemented (Phase 13.1) — `Palimesh/node/src/storage/state-trie.ts`
- **EVM state persistence** — Implemented (Phase 26) — `Palimesh/node/src/storage/persistent-state-manager.ts`
- **Nonce registry persistence** — Implemented (Phase 13.1) — `Palimesh/node/src/storage/nonce-store.ts`
- **User file storage (IPFS-compatible)** — Implemented (core APIs) — `Palimesh/node/src/ipfs-http.ts`
- **IPFS gateway** — Implemented (basic) — `Palimesh/node/src/ipfs-http.ts`
- **IPFS MFS** — Implemented (Phase 26) — `Palimesh/node/src/ipfs-mfs.ts`
- **IPFS Pubsub** — Implemented (Phase 26) — `Palimesh/node/src/ipfs-pubsub.ts`
- **IPFS tar archive** — Implemented (Phase 28) — `Palimesh/node/src/ipfs-tar.ts`
- **IPFS UnixFS directory DAG (write + read, incl. HAMT)** — Implemented (#468) — `Palimesh/node/src/ipfs-unixfs-dir.ts`, `ipfs-path-resolve.ts`, `ipfs-blockstore-adapter.ts` (directory uploads via `wrap-with-directory`, `<cid>/<path>` navigation on cat/ls/object-stat/gateway)
- **EVM state snapshot** — Implemented (Phase 28 + Audit: full trie traversal) — `Palimesh/node/src/state-snapshot.ts`
- **Snap sync provider** — Implemented (Phase 29) — `Palimesh/node/src/consensus.ts`
- **Log indexing** — Implemented (Phase 13.2) — `Palimesh/node/src/storage/block-index.ts`
- **Block/log pruning** — Implemented (Phase 21) — `Palimesh/node/src/storage/pruner.ts`
- **Tx-level pruning by age** — Implemented (M7) — `Palimesh/node/src/storage/pruner.ts`
- **State trie COW (fork/merge)** — Implemented (M7) — `Palimesh/node/src/storage/state-trie.ts`
- **Node mode (full/archive/light)** — Implemented (M7) — `Palimesh/node/src/config.ts`

## Mempool
- **Gas‑price ordering** — Implemented — `Palimesh/node/src/mempool.ts`
- **Nonce continuity** — Implemented — `Palimesh/node/src/mempool.ts`
- **EIP-1559 effective gas price sorting** — Implemented — `Palimesh/node/src/mempool.ts`
- **Dynamic base fee calculation** — Implemented — `Palimesh/node/src/base-fee.ts`
- **Per-block baseFee integration** — Implemented (Audit) — `Palimesh/node/src/chain-engine.ts`, `Palimesh/node/src/chain-engine-persistent.ts`
- **Blob / type-3 tx rejection** — Implemented (explicitly unsupported) — `Palimesh/node/src/mempool.ts`, `Palimesh/node/src/evm.ts`

## PoSe (Off‑chain)
- **Challenge factory (v1)** — Implemented — `Palimesh/services/challenger/challenge-factory.ts`
- **Challenge factory (v2 EIP-712)** — Implemented — `Palimesh/services/challenger/challenge-factory-v2.ts`
- **Receipt verification (v1)** — Implemented — `Palimesh/services/verifier/receipt-verifier.ts`
- **Receipt verification (v2, 9-layer)** — Implemented — `Palimesh/services/verifier/receipt-verifier-v2.ts`
- **Batch aggregation (v1 + v2)** — Implemented — `Palimesh/services/aggregator/*`
- **Reward scoring** — Implemented — `Palimesh/services/verifier/scoring.ts`
- **Unified SlashEvidence bus** — Implemented (M0-M2) — `Palimesh/services/common/slash-evidence.ts`
- **Unified reward manifest (v1/v2)** — Implemented (M4) — `Palimesh/runtime/lib/reward-manifest.ts`, `Palimesh/runtime/palimesh-agent.ts`
- **Reward tree (Merkle-claimable)** — Implemented — `Palimesh/services/common/reward-tree.ts`
- **Storage proofs** — Implemented (Merkle path) — `Palimesh/runtime/palimesh-node.ts`
- **Witness collector** — Implemented — `Palimesh/runtime/lib/witness-collector.ts`

## PoSe (On‑chain)
- **PoSeManager (v1)** — Implemented — `Palimesh/contracts/settlement/PoSeManager.sol`
- **PoSeManagerV2 (v2)** — Implemented — `Palimesh/contracts/settlement/PoSeManagerV2.sol`
- **v2 Fault proofs (commit-reveal-settle)** — Implemented — `Palimesh/contracts/settlement/PoSeManagerV2.sol`
- **v2 Witness quorum validation** — Implemented (default strict) — `Palimesh/contracts/settlement/PoSeManagerV2.sol`
- **v2 Merkle-claimable rewards** — Implemented — `Palimesh/contracts/settlement/PoSeManagerV2.sol`
- **v2 EIP-712 signatures** — Implemented — `Palimesh/contracts/settlement/PoSeTypesV2.sol`
- **EIP-712 cross-check (TS ↔ Solidity)** — Implemented — `Palimesh/contracts/test/eip712-crosscheck.test.cjs`
- **L1/L2 deployment configs** — Implemented (M7) — `Palimesh/contracts/deploy/l1-config.ts`, `Palimesh/contracts/deploy/l2-config.ts`
- **PoSe deploy script** — Implemented (M7) — `Palimesh/contracts/deploy/deploy-pose.ts`
- **PoSe deploy CLI** — Implemented (P5) — `Palimesh/contracts/deploy/cli-deploy-pose.ts`

## Runtime Services
- **palimesh-node HTTP endpoints** — Runtime-wired — `Palimesh/runtime/palimesh-node.ts` (dual-version signing, `/pose/witness`)
- **palimesh-agent automation** — Runtime-wired — `Palimesh/runtime/palimesh-agent.ts` (v2 challenges, witness collection, reward manifest, persistent pending, metrics, NodeOps tick)
- **palimesh-relayer automation** — Runtime-wired — `Palimesh/runtime/palimesh-relayer.ts` (v2 finalize with reward manifest, epoch nonce init, fault proof lifecycle, persistent pending recovery, scoring-based reward distribution)
- **Runtime Docker image** — Implemented — `Palimesh/docker/Dockerfile.runtime`
- **Runtime systemd templates** — Implemented — `Palimesh/docker/systemd/palimesh-agent.service`, `Palimesh/docker/systemd/palimesh-relayer.service`
- **Testnet `pose` compose profile** — Implemented — `Palimesh/docker/docker-compose.testnet.yml`, `Palimesh/docker/testnet-runtime-configs/{agent,relayer}.json`
- **Runtime metrics** — Implemented — `Palimesh/runtime/lib/runtime-metrics.ts`, `Palimesh/runtime/lib/agent-metrics-server.ts`
- **Pending retention** — Implemented — `Palimesh/runtime/lib/pending-retention.ts`
- **Unified retry (exponential backoff)** — Implemented (M6) — `Palimesh/runtime/lib/retry.ts`
- **Secure key resolution** — Implemented (M6) — `Palimesh/runtime/lib/key-material.ts`
- **BFT → PoSe slash bridge** — Implemented (M7) — `Palimesh/runtime/palimesh-relayer.ts`
- **V1 challenger rewards** — Implemented (M7) — `Palimesh/services/relayer/epoch-finalizer.ts`

## Tooling
- **Wallet CLI** — Implemented (M7) — `Palimesh/wallet/palimesh-wallet.ts`
- **Devnet scripts (3/5/7)** — Implemented — `Palimesh/scripts/*.sh`
- **Genesis + boot-node artifact generation** — Implemented — `Palimesh/scripts/generate-genesis.sh`, `Palimesh/scripts/setup-boot-nodes.sh`
- **Testnet image-tag deployment workflow** — Implemented — `Palimesh/.github/workflows/testnet-deploy.yml`, `Palimesh/docker/docker-compose.testnet.yml`
- **Docker monitoring stack on shared testnet RPC network** — Implemented — `Palimesh/docker/docker-compose.monitoring.yml`, `Palimesh/docker/prometheus/prometheus.yml`, `Palimesh/ops/alerts/prometheus-rules.yml`
- **Quality gate script** — Implemented — `Palimesh/scripts/quality-gate.sh`

## Blockchain Explorer
- **Block explorer** — Implemented — `Palimesh/explorer/src/app/block/[id]/page.tsx`
- **Transaction viewer** — Implemented — `Palimesh/explorer/src/app/tx/[hash]/page.tsx`
- **Address explorer** — Implemented — `Palimesh/explorer/src/app/address/[address]/page.tsx`
- **Latest blocks feed** — Implemented — `Palimesh/explorer/src/app/page.tsx`
- **Contract view** — Implemented — `Palimesh/explorer/src/components/ContractView.tsx`
- **Mempool page** — Implemented — `Palimesh/explorer/src/app/mempool/page.tsx`
- **Validators page** — Implemented — `Palimesh/explorer/src/app/validators/page.tsx`
- **Stats page** — Implemented — `Palimesh/explorer/src/app/stats/page.tsx`
- **Contracts listing** — Implemented — `Palimesh/explorer/src/app/contracts/page.tsx`
- **Network page** — Implemented — `Palimesh/explorer/src/app/network/page.tsx`
- **Real-time updates** — Implemented (WebSocket) — `Palimesh/explorer/src/app/page.tsx`
- **Contract call history** — Implemented (Phase 27) — `Palimesh/explorer/src/components/ContractCallHistory.tsx`
- **Address tx type classification** — Implemented (Phase 27) — `Palimesh/explorer/src/app/address/[address]/page.tsx`
- **Internal transactions trace** — Implemented (Phase 27) — `Palimesh/explorer/src/app/tx/[hash]/page.tsx`
- **WebSocket reconnection** — Implemented (exponential backoff) — `Palimesh/explorer/src/lib/use-websocket.ts`
- **Error boundaries** — Implemented (Phase 27) — `Palimesh/explorer/src/app/`
- **Contract verification** — Implemented (M7) — `Palimesh/explorer/src/app/verify/page.tsx`, `Palimesh/explorer/src/lib/solc-verify.ts`
- **ABI method decoding** — Implemented (M7) — `Palimesh/explorer/src/lib/abi-decoder.ts`
- **TPS/Gas charts** — Implemented (M7) — `Palimesh/explorer/src/components/ChainCharts.tsx`

## Node Operations
- **Policy engine** — Implemented — `Palimesh/nodeops/policy-engine.ts`
- **Policy loader (YAML)** — Implemented — `Palimesh/nodeops/policy-loader.ts`
- **Agent hooks** — Implemented — `Palimesh/nodeops/agent-hooks.ts`
- **Policy hot-reload** — Implemented (M5) — `Palimesh/runtime/lib/nodeops-runtime.ts`
- **Policy conflict detection** — Implemented (M5) — `Palimesh/nodeops/policy-loader.ts`
- **NodeOps agent runtime** — Implemented (M5) — `Palimesh/runtime/lib/nodeops-runtime.ts`
- **Advanced policy DSL** — Implemented (M7) — `Palimesh/nodeops/expression-eval.ts`, `Palimesh/nodeops/policy-types.ts`

## Networking (Advanced)
- **Request body limits** — Implemented (2MB P2P, 1MB RPC) — `Palimesh/node/src/p2p.ts`, `Palimesh/node/src/rpc.ts`
- **P2P broadcast concurrency** — Implemented (5 peers/batch) — `Palimesh/node/src/p2p.ts`
- **Per-peer broadcast dedup** — Implemented — `Palimesh/node/src/p2p.ts`
- **P2P stats/counters** — Implemented — `Palimesh/node/src/p2p.ts`
- **P2P signed auth envelope (`_auth`)** — Implemented (tx/block/pubsub/bft write paths) — `Palimesh/node/src/p2p.ts`
- **P2P inbound auth mode** — Implemented (`off`/`monitor`/`enforce`) — `Palimesh/node/src/config.ts`, `Palimesh/node/src/p2p.ts`
- **P2P auth observability counters** — Implemented (`authAccepted/authMissing/authInvalid/authRejected`) — `Palimesh/node/src/p2p.ts`

## WebSocket RPC
- **eth_subscribe (newHeads)** — Implemented — `Palimesh/node/src/websocket-rpc.ts`
- **eth_subscribe (newPendingTransactions)** — Implemented — `Palimesh/node/src/websocket-rpc.ts`
- **eth_subscribe (logs)** — Implemented — `Palimesh/node/src/websocket-rpc.ts`
- **Subscription validation** — Implemented (address/topic format, max 10/client) — `Palimesh/node/src/websocket-rpc.ts`

## Consensus & Reliability
- **Consensus error recovery** — Implemented (degraded mode, auto-recovery) — `Palimesh/node/src/consensus.ts`
- **BFT consensus integration** — Implemented (Phase 29, opt-in; Phase 32, dual transport) — `Palimesh/node/src/consensus.ts`
- **Fork choice integration** — Implemented (Phase 29) — `Palimesh/node/src/consensus.ts`
- **Snap sync integration** — Implemented (Phase 29 + Audit: target chain head validation) — `Palimesh/node/src/consensus.ts`
- **Consensus metrics** — Implemented (Phase 30) — `Palimesh/node/src/consensus.ts`
- **Network stats RPC** — Implemented (Phase 30) — `Palimesh/node/src/rpc.ts`
- **Health checker** — Implemented (memory/WS/storage diagnostics) — `Palimesh/node/src/health.ts`

## Debug & Trace
- **debug_traceTransaction** — Implemented (P2: replay-backed opcode-level) — `Palimesh/node/src/debug-trace.ts`
- **debug_traceBlockByNumber** — Implemented (P2: replay-backed opcode-level) — `Palimesh/node/src/debug-trace.ts`
- **debug_traceCall** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`
- **trace_transaction** — Implemented (P2: replay-backed, OpenEthereum format) — `Palimesh/node/src/debug-trace.ts`
- **trace_call** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`
- **trace_replayTransaction** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/debug-trace.ts`
- **trace_replayBlockTransactions** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/debug-trace.ts`
- **trace_rawTransaction** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`
- **trace_block** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/debug-trace.ts`
- **trace_filter** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/debug-trace.ts`
- **trace_get** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`
- **trace_callMany** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`
- **Built-in callTracer / prestateTracer** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`
- **Best-effort vmTrace / stateDiff** — Implemented (post-P6 trace parity) — `Palimesh/node/src/rpc.ts`, `Palimesh/node/src/evm.ts`

## EVM Compatibility Regression (P6)
- **P0-P5 regression baseline** — Implemented (P6) — `Palimesh/node/src/rpc-debug-compatibility.test.ts`, `Palimesh/node/src/rpc-persistent.test.ts`
- **RPC semantic compatibility regression** — Implemented — `Palimesh/node/src/rpc-semantic-compat.test.ts`
- **Historical trace/finalized tag regression** — Implemented — `Palimesh/node/src/rpc-debug-compatibility.test.ts`
- **Cancun/blob-gas compatibility regression** — Implemented (header + blob-gas surface, no type-3 support) — `Palimesh/node/src/cancun-compat.test.ts`, `Palimesh/node/src/blob-gas.test.ts`
- **EIP-4788 beacon-root behavior regression** — Implemented — `Palimesh/node/src/cancun-compat.test.ts`
- **Ethers toolchain compatibility regression** — Implemented (post-P6 parity hardening) — `Palimesh/node/src/ethers-toolchain-compat.test.ts`
- **Viem toolchain compatibility regression** — Implemented — `Palimesh/node/src/viem-toolchain-compat.test.ts`
- **Wallet / Foundry RPC smoke regression** — Implemented — `Palimesh/node/src/wallet-toolchain-compat.test.ts`
- **Node workspace quality gate** — Implemented (`864` tests / `124` suites passing) — `Palimesh/node/src/**/*.test.ts`
- **Root tests workspace quality gate** — Implemented (`173` tests / `34` suites passing) — `Palimesh/tests/**/*.test.ts`
- **Repository-wide quality gate** — Implemented (`1563` tests / `145` files across repo workspaces, excluding vendored `node_modules` tests) — `Palimesh/scripts/quality-gate.sh`

## Input Validation & Error Handling
- **RPC parameter validation** — Implemented (Phase 27) — `Palimesh/node/src/rpc.ts`
- **Structured RPC error codes** — Implemented (-32602/-32603) — `Palimesh/node/src/rpc.ts`
- **PoSe HTTP field validation** — Implemented (Phase 27) — `Palimesh/node/src/pose-http.ts`
- **Config validation** — Implemented (Phase 27) — `Palimesh/node/src/config.ts`
- **Merkle path bounds check** — Implemented (Phase 27) — `Palimesh/node/src/ipfs-merkle.ts`
- **Snapshot JSON validation** — Implemented (Phase 27) — `Palimesh/node/src/storage/snapshot-manager.ts`

## Security Hardening (Phase 33)
- **IPFS upload size limit** — Implemented (10MB default) — `Palimesh/node/src/ipfs-http.ts`
- **MFS path traversal protection** — Implemented — `Palimesh/node/src/ipfs-mfs.ts`
- **Wire per-IP connection limit** — Implemented (max 5/IP) — `Palimesh/node/src/wire-server.ts`
- **Block timestamp validation** — Implemented (parent ordering + 60s drift, both engines) — `Palimesh/node/src/chain-engine.ts`, `Palimesh/node/src/chain-engine-persistent.ts`
- **Configurable signature enforcement** — Implemented (off/monitor/enforce) — `Palimesh/node/src/config.ts`
- **Node identity authentication** — Implemented (wire handshake signing) — `Palimesh/node/src/wire-server.ts`, `Palimesh/node/src/wire-client.ts`
- **BFT message signing** — Implemented (mandatory signature) — `Palimesh/node/src/bft-coordinator.ts`
- **DHT peer verification** — Implemented (TCP probe + ping-evict) — `Palimesh/node/src/dht-network.ts`
- **DHT distance-sorted lookup** — Implemented (Audit) — `Palimesh/node/src/dht-network.ts`
- **K-bucket ping-evict** — Implemented (Audit) — `Palimesh/node/src/dht.ts`
- **State snapshot stateRoot check** — Implemented — `Palimesh/node/src/state-snapshot.ts`
- **Exponential peer ban** — Implemented (base * 2^n, max 24h) — `Palimesh/node/src/peer-scoring.ts`
- **WebSocket idle timeout** — Implemented (1h) — `Palimesh/node/src/websocket-rpc.ts`
- **Dev accounts gating** — Implemented (PALI_DEV_ACCOUNTS=1) — `Palimesh/node/src/rpc.ts`
- **Default localhost binding** — Implemented (127.0.0.1) — `Palimesh/node/src/wire-server.ts`
- **Shared rate limiter** — Implemented (RPC/IPFS/PoSe) — `Palimesh/node/src/rate-limiter.ts`
- **P2P signed request verification** — Implemented (timestamp window + nonce replay guard) — `Palimesh/node/src/p2p.ts`
- **Governance self-vote removal** — Implemented — `Palimesh/node/src/validator-governance.ts`
- **PoSeManager v-value check** — Implemented — `Palimesh/contracts/settlement/PoSeManager.sol`

## Soul Identity & Recovery (AI Silicon Immortality)
- **SoulRegistry contract** — Implemented — `Palimesh/contracts/contracts-src/governance/SoulRegistry.sol`
- **Soul registration (EIP-712)** — Implemented — `SoulRegistry.sol` registerSoul
- **Backup CID anchoring** — Implemented — `SoulRegistry.sol` anchorBackup (full + incremental)
- **Identity update (EIP-712)** — Implemented — `SoulRegistry.sol` updateIdentity
- **Social recovery (2/3 quorum + timelock)** — Implemented — `SoulRegistry.sol` initiate/approve/complete
- **Recovery cancel (owner)** — Implemented — `SoulRegistry.sol` cancelRecovery
- **Soul deactivation** — Implemented — `SoulRegistry.sol` deactivateSoul
- **Guardian snapshot at initiation** — Implemented — prevents threshold bypass via guardian removal
- **EIP-2 signature canonicality** — Implemented — s-value range check in _recoverSigner
- **palimesh-backup extension** — Implemented — `Palimesh/extensions/palimesh-backup/`
- **Incremental backup chaining** — Implemented — scheduler with maxIncrementalChain
- **AES-256-GCM file encryption** — Implemented — scrypt KDF, per-file salt+IV
- **Three-layer integrity verification** — Implemented — manifest Merkle / disk SHA-256 / on-chain anchor
- **Path traversal protection** — Implemented — resolve+startsWith in downloader
- **IPFS CID validation + timeout** — Implemented — format check, 30s AbortSignal
- **On-chain recovery from CID** — Implemented — `CidRegistry.sol` + `cid-resolver.ts` three-layer resolution (local→MFS→on-chain)
- **CidRegistry contract** — Implemented — `Palimesh/contracts/contracts-src/governance/CidRegistry.sol` (permissionless, immutable entries, batch registration)
- **Binary database backup (SQLite/LanceDB)** — Implemented — `binary-handler.ts` (VACUUM INTO snapshot, directory tar archive)
- **Execution context snapshots** — Implemented — `context-snapshot.ts` (session metadata capture before each backup)
- **OpenClaw lifecycle hooks** — Implemented — `session_end`, `before_compaction`, `gateway_stop` hooks in `index.ts`
- **Automated recovery orchestrator** — Implemented — `orchestrator.ts` (discover → resolve → download → verify → restart)
- **Carrier daemon** — Implemented — `carrier-daemon.ts` (AbortController shutdown, addRequest→AddRequestResult, concurrency limit, 30s drain timeout)
- **Offline agent monitor** — Implemented — `offline-monitor.ts` (polls `isOffline()`, online→offline transition detection)
- **Resurrection state machine** — Implemented — `resurrection-flow.ts` (carrier-side: confirm → waitReadiness → restore → spawn → health → complete, shutdown-aware at every step)
- **Guardian CLI** — Implemented — `palimesh-backup guardian initiate/approve/status` (requires guardian EOA)
- **Carrier CLI** — Implemented — `palimesh-backup carrier register/submit-request/list` (submit-request wired to daemon.addRequest)
- **9 agent tools** — Implemented — soul-backup, soul-restore, soul-status, soul-doctor, soul-resurrection, soul-auto-restore, soul-guardian-initiate, soul-guardian-approve, soul-carrier-request
- **Multi-process role model** — Implemented — owner/guardian/carrier as separate processes with distinct EOAs, matching contract `msg.sender` enforcement

## DID (Decentralized Identity for AI Agents)
- **DIDRegistry contract** — Implemented — `Palimesh/contracts/contracts-src/governance/DIDRegistry.sol`
- **did:coc method resolver** — Implemented — `Palimesh/node/src/did/did-resolver.ts`
- **DID Document builder (W3C compliant)** — Implemented — `Palimesh/node/src/did/did-document-builder.ts`
- **EIP-712 types for DIDRegistry** — Implemented — `Palimesh/node/src/crypto/did-registry-types.ts`
- **Key rotation (add/revoke verification methods)** — Implemented — DIDRegistry addVerificationMethod / revokeVerificationMethod
- **Delegation registry (scope-limited, time-bound)** — Implemented — DIDRegistry grantDelegation / revokeDelegation / revokeAllDelegations
- **Delegation chain verification (depth ≤ 3)** — Implemented — `Palimesh/node/src/did/delegation-chain.ts`
- **Scope subset checking (URI pattern + constraint narrowing)** — Implemented — delegation-chain.ts isScopeSubset
- **Cascading revocation + global epoch** — Implemented — DIDRegistry isDelegationValid + globalRevocationEpoch
- **Rate-limited delegation creation** — Implemented — MIN_DELEGATION_INTERVAL=60s, MAX_DELEGATIONS_PER_AGENT=32
- **Ephemeral sub-identities** — Implemented — DIDRegistry createEphemeralIdentity / deactivateEphemeralIdentity
- **Agent lineage tracking** — Implemented — DIDRegistry recordLineage (parent, forkHeight, generation)
- **Verifiable Credential anchoring** — Implemented — DIDRegistry anchorCredential / revokeCredential
- **Selective disclosure (Merkle tree)** — Implemented — `Palimesh/node/src/did/verifiable-credentials.ts`
- **Capability bitmask (16 flags)** — Implemented — DIDRegistry updateCapabilities
- **DID-based authentication (challenge-response)** — Implemented — `Palimesh/node/src/did/did-auth.ts`
- **Wire handshake DID extension** — Implemented — HandshakePayload + optional did/didProof fields
- **P2P auth DID extension** — Implemented — P2PAuthEnvelope + optional did/delegationChain fields
- **DID config (didEnabled, didAuthMode)** — Implemented — `Palimesh/node/src/config.ts`
- **Explorer DID pages** — Implemented — `Palimesh/explorer/src/app/did/`
- **RPC methods (pali_resolveDid etc.)** — Partial — types defined, wiring pending
- **DID deployment script** — Implemented — `Palimesh/contracts/deploy/deploy-did-registry.ts`

## Performance & Benchmarking
- **EVM benchmarks** — Implemented — `Palimesh/node/src/benchmarks/evm-benchmark.test.ts`
- **Load testing** — Implemented (Phase 23) — `Palimesh/node/src/benchmarks/load-test.test.ts`
- **formatBlock optimization** — Implemented (O(n) via Transaction.from) — `Palimesh/node/src/rpc.ts`
- **P2P benchmarks** — Implemented (M7) — `Palimesh/node/src/benchmarks/p2p-benchmark.test.ts`
- **TPS 100+ optimization (Phase 37)** — Implemented — Single-node sequencer: 16.7 TPS → **131 TPS** via mega-batch atomic DB writes
- **Op-builder pattern (batch DB operations)** — Implemented (Phase 37) — `Palimesh/node/src/storage/block-index.ts`, `Palimesh/node/src/storage/nonce-store.ts`
- **Reduced transaction parsing** — Implemented (Phase 37) — Eliminated 200x ECDSA recovery per block (mempool removal reuses execution-phase hashes)
- **EVM pipeline optimization (Phase 38)** — Implemented — `executeRawTxInBlock()` fast path, ECDSA dedup, `BlockExecutionResult` direct return, batch `evictCaches()` → **133.7 TPS**
- **State trie batch commit (Phase 39)** — Implemented — Direct `trie.put()` in commit, skip unchanged storageRoot. Sequencer mode (`nodeMode: "sequencer"`)
- **Rollup services (Phase 39)** — Implemented — Output Proposer, Batcher, `rollup_*` RPC methods
- **EVM engine abstraction (Phase 40)** — Implemented — `IEvmEngine` interface, `EvmBlockEnv`, `evm-factory.ts`, dual-engine comparison tests (5/5)
- **revm WASM engine (Phase 40)** — Implemented — Rust revm compiled to WASM (606KB), `RevmEngine` implements `IEvmEngine`, **20,540 TPS raw execution** (154x vs EthereumJS)
- **High-throughput benchmarks** — Implemented (Phase 37-40) — 1000 tx/10 blocks (133.7 TPS), pickForBlock(256) latency (0.93ms), revm raw (20K TPS)
- **blockTimeMs config** — Implemented (Phase 37, configurable) — Default 1s (was 3s), min 100ms
- **maxTxPerBlock config** — Implemented (Phase 38, configurable) — Default 512 (was 50→256→512)
