# Palimesh Testnet Deployment Guide

## 1. Testnet Overview

| Item | Value |
|------|-------|
| Chain ID | 18780 (0x495c) |
| Server | 199.192.16.79 (server1.palimesh.io) |
| Nodes | 3 (BFT validators) |
| Consensus | BFT-lite (2/3 stake-weighted quorum) |
| Block Time | ~3 s/block (~40 blocks/min) |
| Finality Depth | 3 blocks |
| Max Transactions/Block | 100 |
| Storage Backend | LevelDB |

### Validator Set

| Node | Address | Private Key (Hardhat #0-2) |
|------|---------|---------------------------|
| node-1 | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| node-2 | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| node-3 | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

> **Note**: These are Hardhat default test keys, intended for testnet use only.

### Prefunded Accounts

| Address | Balance |
|---------|---------|
| `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | 10,000 ETH |
| `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 10,000 ETH |

---

## 2. Port Mapping

### External RPC Endpoints

| Node | JSON-RPC | WebSocket | P2P Gossip | Wire Protocol | Prometheus |
|------|----------|-----------|------------|---------------|------------|
| node-1 | :28780 | :28781 | :29780 | :29781 | :9101 |
| node-2 | :28782 | :28783 | :29782 | :29783 | :9102 |
| node-3 | :28784 | :28785 | :29784 | :29785 | :9103 |

### Quick Access

```bash
# Query block height
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
  http://199.192.16.79:28780/

# Query chain stats
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"pali_chainStats","id":1}' \
  http://199.192.16.79:28780/

# Query BFT status
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"pali_getBftStatus","id":1}' \
  http://199.192.16.79:28780/
```

---

## 3. Enabled Features

| Feature | Status | Description |
|---------|--------|-------------|
| BFT Consensus | Enabled | 2/3 stake-weighted signature voting |
| Wire Protocol | Enabled | TCP binary frame protocol (Magic 0xC0C1) |
| DHT Discovery | Enabled | Kademlia DHT routing table |
| SnapSync | Enabled | Fast state synchronization |
| Admin RPC | Enabled | Administrative endpoints |
| P2P Auth | enforce | Inbound connections require signed identity |
| PoSe Auth | enforce | Challenges/receipts require signed identity |

---

## 4. Docker Deployment Architecture

### Container Composition

```
docker-compose.testnet.yml
├── palimesh-node-1   (Validator #0)
├── palimesh-node-2   (Validator #1)
├── palimesh-node-3   (Validator #2)
├── palimesh-explorer  (Block explorer, :3000)
├── palimesh-faucet    (Faucet, :3003, optional)
├── palimesh-agent     (PoSe Agent, optional, profile=pose)
└── palimesh-relayer   (PoSe Relayer, optional, profile=pose)
```

### Network Topology

```
palimesh-p2p (internal bridge)
  └── node-1 ↔ node-2 ↔ node-3

palimesh-rpc (external bridge)
  ├── node-1, node-2, node-3 (RPC exposed)
  ├── explorer → node-1
  ├── faucet → node-1
  └── agent/relayer → node-1, node-2, node-3
```

### Start / Stop

```bash
cd Palimesh

# Start testnet (3 nodes + explorer)
docker compose -f docker/docker-compose.testnet.yml up -d

# Stop
docker compose -f docker/docker-compose.testnet.yml down

# View logs
docker logs palimesh-node-1 --tail 50
docker logs palimesh-node-2 --tail 50
docker logs palimesh-node-3 --tail 50

# Wipe data and rebuild (destructive: all chain data will be lost)
docker compose -f docker/docker-compose.testnet.yml down
docker volume rm docker_node1-data docker_node2-data docker_node3-data
docker compose -f docker/docker-compose.testnet.yml build node-1
docker compose -f docker/docker-compose.testnet.yml up -d
```

---

## 5. RPC Reference

### Standard Ethereum Methods

| Method | Description |
|--------|-------------|
| `eth_blockNumber` | Current block height (hex) |
| `eth_getBlockByNumber` | Get block by height |
| `eth_getBlockByHash` | Get block by hash |
| `eth_getBalance` | Query account balance |
| `eth_getTransactionByHash` | Get transaction details |
| `eth_getTransactionReceipt` | Get transaction receipt |
| `eth_syncing` | Sync status |
| `net_peerCount` | Connected peer count |

### Palimesh Extension Methods

| Method | Description |
|--------|-------------|
| `pali_chainStats` | Chain statistics (blocks, TPS, validator count) |
| `pali_getBftStatus` | BFT consensus round status |
| `pali_getEquivocations` | BFT equivocation evidence |

---

## 6. OpenClaw Plugin — palimesh-nodeops

### Installation

palimesh-nodeops runs as an OpenClaw extension plugin, providing both CLI commands and AI agent tools.

**Option 1: Local path install**

Edit `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "palimesh-nodeops": {
        "enabled": true,
        "config": {
          "runtimeDir": "/path/to/Palimesh/runtime"
        }
      }
    },
    "installs": {
      "palimesh-nodeops": {
        "source": "path",
        "sourcePath": "/path/to/Palimesh/extensions/palimesh-nodeops",
        "installPath": "~/.openclaw/extensions/palimesh-nodeops"
      }
    }
  }
}
```

Then sync files:

```bash
rsync -av --exclude='node_modules' \
  /path/to/Palimesh/extensions/palimesh-nodeops/ \
  ~/.openclaw/extensions/palimesh-nodeops/

cd ~/.openclaw/extensions/palimesh-nodeops && npm install
```

**Option 2: Manual copy**

```bash
cp -r Palimesh/extensions/palimesh-nodeops ~/.openclaw/extensions/
cd ~/.openclaw/extensions/palimesh-nodeops && npm install
```

### Verify Installation

```bash
# From the OpenClaw project directory
pnpm openclaw plugins list 2>&1 | grep coc
# Expected output:
#   Palimesh node ops extension loading...
#   Palimesh extension loaded (10 agent tools registered)
```

### 10 Agent Tools

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `palimesh-node-init` | Initialize a new node | `type` (dev/validator/fullnode/archive/gateway), `network` (local/testnet/custom) |
| `palimesh-node-list` | List all managed nodes | none |
| `palimesh-node-start` | Start a node | `name` (optional; starts all if omitted) |
| `palimesh-node-stop` | Stop a node | `name` (optional) |
| `palimesh-node-restart` | Restart a node | `name` (optional) |
| `palimesh-node-status` | Query live status | `name` (optional) — returns blockHeight/peerCount/bftActive |
| `palimesh-node-remove` | Remove a node instance | `name`, `keepData` (boolean) |
| `palimesh-node-config` | View or patch config | `name`, `patch` (object, optional) |
| `palimesh-node-logs` | View service logs | `name`, `service` (node/agent/relayer), `lines` |
| `palimesh-rpc-query` | On-chain RPC query | `method`, `params`, `name` (optional) |

### RPC Query Allowlist

The `palimesh-rpc-query` tool restricts calls to the following read-only methods:

```
eth_blockNumber, eth_getBlockByNumber, eth_getBlockByHash,
net_peerCount, pali_chainStats, pali_getBftStatus,
eth_getBalance, eth_syncing, eth_getTransactionByHash,
eth_getTransactionReceipt
```

### Skill Usage

When an OpenClaw AI agent needs to manage Palimesh nodes, the `palimesh-nodeops` skill activates automatically.

Example conversations:

```
User: Deploy a Palimesh test node for me
Agent: [calls palimesh-node-init, type=dev, network=local]
       [calls palimesh-node-start]
       [calls palimesh-node-status]
       Node started. Block height: 5, RPC port: 18780.

User: Show me the chain status
Agent: [calls palimesh-rpc-query, method=pali_chainStats]
       Current block height: 120, 40 blocks/min, 1 validator.

User: Connect to the remote testnet
Agent: [calls palimesh-node-init, type=fullnode, network=custom]
       [calls palimesh-node-config, patch={peers, validators, ...}]
       [calls palimesh-node-start]
       [calls palimesh-node-status]
       Synced to testnet height 7092, connected to 3 peers.
```

---

## 7. Deploying a New Node

### Option A: Docker Single Node (Easiest)

```bash
git clone https://github.com/NGPlateform/Palimesh.git
cd Palimesh

# Build and start single node + explorer
docker compose -f docker/docker-compose.yml up -d

# Verify
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
  http://localhost:18780/
```

Ports: RPC :18780, WS :18781, P2P :19780, Wire :19781, IPFS :5001, Metrics :9100, Explorer :3000

### Option B: Native Run (Development)

**Prerequisite**: Node.js 22+

```bash
git clone https://github.com/NGPlateform/Palimesh.git
cd Palimesh && npm install

# Run directly (auto-generates key and genesis block)
node --experimental-strip-types node/src/index.ts
```

Binds to 127.0.0.1:18780 by default in single-validator mode.

### Option C: Via OpenClaw (Recommended)

Ensure the palimesh-nodeops plugin is installed (see Section 6).

```bash
# Initialize a local dev node
openclaw coc init --type dev --network local --name my-node

# Start
openclaw coc start my-node

# Check status
openclaw coc status my-node

# View logs
openclaw coc logs my-node
```

### Option D: Join the Testnet (Observer Node)

Deploy a fullnode observer that auto-syncs blocks via SnapSync:

**Step 1**: Initialize

```bash
openclaw coc init --type fullnode --network custom --name testnet-obs --rpc-port 18790
```

**Step 2**: Configure testnet connection

Edit `~/.clawdbot/coc/nodes/testnet-obs/node-config.json`:

```json
{
  "chainId": 18780,
  "validators": [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
  ],
  "peers": [
    { "id": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", "url": "http://199.192.16.79:29780" },
    { "id": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", "url": "http://199.192.16.79:29782" },
    { "id": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", "url": "http://199.192.16.79:29784" }
  ],
  "dhtBootstrapPeers": [
    { "id": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", "address": "199.192.16.79", "port": 29781 },
    { "id": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", "address": "199.192.16.79", "port": 29783 },
    { "id": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", "address": "199.192.16.79", "port": 29785 }
  ],
  "enableWireProtocol": true,
  "enableDht": true,
  "enableSnapSync": true,
  "enableBft": false,
  "rpcPort": 18790,
  "rpcBind": "127.0.0.1",
  "wsPort": 18791,
  "p2pPort": 19790,
  "p2pBind": "0.0.0.0",
  "wirePort": 19791,
  "wireBind": "0.0.0.0",
  "blockTimeMs": 3000,
  "p2pInboundAuthMode": "off"
}
```

**Step 3**: Start and verify

```bash
openclaw coc start testnet-obs

# Wait ~15 seconds for SnapSync to complete
openclaw coc status testnet-obs
# Expected: blockHeight=XXXX, peerCount=3
```

Or verify via RPC directly:

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"pali_chainStats","id":1}' \
  http://127.0.0.1:18790/
```

### Option E: Docker Testnet Observer

```bash
cd Palimesh

# Create observer config
mkdir -p /tmp/palimesh-observer
cat > /tmp/palimesh-observer/node-config.json << 'EOF'
{
  "chainId": 18780,
  "validators": [
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
  ],
  "peers": [
    { "id": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", "url": "http://199.192.16.79:29780" },
    { "id": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", "url": "http://199.192.16.79:29782" },
    { "id": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", "url": "http://199.192.16.79:29784" }
  ],
  "dhtBootstrapPeers": [
    { "id": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", "address": "199.192.16.79", "port": 29781 },
    { "id": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", "address": "199.192.16.79", "port": 29783 },
    { "id": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", "address": "199.192.16.79", "port": 29785 }
  ],
  "enableWireProtocol": true,
  "enableDht": true,
  "enableSnapSync": true,
  "enableBft": false,
  "p2pBind": "0.0.0.0",
  "p2pPort": 19780,
  "wireBind": "0.0.0.0",
  "wirePort": 19781,
  "rpcBind": "0.0.0.0",
  "rpcPort": 18780,
  "blockTimeMs": 3000,
  "p2pInboundAuthMode": "off"
}
EOF

# Run Docker observer
docker run -d --name palimesh-observer \
  -p 18790:18780 -p 18791:18781 \
  -v /tmp/palimesh-observer:/data/coc \
  -e PALI_DATA_DIR=/data/coc \
  -e PALI_NODE_CONFIG=/data/coc/node-config.json \
  ghcr.io/palimesh/palimesh-node:latest

# Verify sync
sleep 15
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}' \
  http://localhost:18790/
```

---

## 8. Troubleshooting

### Common Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `invalid cumulativeWeight: expected 2, got 1` | Genesis block missing cumulativeWeight | Upgrade to latest code, wipe data and restart |
| `verifyBlockChain failed: invalid snapshot cumulative weight` | SnapSync type mismatch (string vs BigInt) | Upgrade to latest code (hasValidSnapshotWeight fix) |
| `hexToBytes: invalid hex characters` | nodeId is not a valid hex address | Ensure nodeId is an Ethereum address derived from the private key |
| Node stuck at height 1, no block production | Genesis block hash mismatch | Ensure all nodes share the same validators list and chainId |
| SnapSync fails repeatedly | Unstable peer connections | Check firewall rules, confirm Wire ports are reachable |
| `ENOENT: palimesh-node.ts` | Process manager script path error | Upgrade palimesh-nodeops to v0.2.0+ |

### Diagnostic Commands

```bash
# Check node health
curl -sf http://localhost:18780/ -X POST \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}'

# Check peer connectivity
curl -sf http://localhost:18780/ -X POST \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","id":1}'

# Check container logs for errors
docker logs palimesh-node-1 --tail 50 2>&1 | grep -E '"level":"(error|warn)"'

# Via OpenClaw
openclaw coc status
openclaw coc logs <node-name> --service node
```
