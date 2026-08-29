# Palimesh Runtime (Node / Agent / Relayer)

## Start (via OpenClaw)

```bash
openclaw coc config:init
openclaw coc start
openclaw coc status
```

## Logs

```bash
openclaw coc logs node
openclaw coc logs agent
openclaw coc logs relayer
```

## Direct run (debug)

```bash
node --experimental-strip-types Palimesh/runtime/palimesh-node.ts
node --experimental-strip-types Palimesh/runtime/palimesh-agent.ts
node --experimental-strip-types Palimesh/runtime/palimesh-relayer.ts
node --experimental-strip-types Palimesh/runtime/palimesh-reward-claim.ts --epoch 123 --node-id 0x...
```

## Standard deployment templates

- Docker image: `docker/Dockerfile.runtime`
- systemd units:
  - `docker/systemd/palimesh-agent.service`
  - `docker/systemd/palimesh-relayer.service`
- Testnet compose profile:
  - `docker compose -f docker/docker-compose.testnet.yml --profile pose up -d`

## Config

`~/.clawdbot/coc/config.json` or `Palimesh/config.example.json`

Agent 抽样与批次参数:
- `agentBatchSize` / `PALI_AGENT_BATCH_SIZE`
- `agentSampleSize` / `PALI_AGENT_SAMPLE_SIZE`

私钥来源按优先级解析:
- Operator: `PALI_OPERATOR_PK` -> `PALI_OPERATOR_PK_FILE` -> `operatorPrivateKey` -> `operatorPrivateKeyFile`
- Slasher: `PALI_SLASHER_PK` -> `PALI_SLASHER_PK_FILE` -> `slasherPrivateKey` -> `slasherPrivateKeyFile`

交易重试与退避:
- `txRetryAttempts` / `PALI_TX_RETRY_ATTEMPTS`
- `txRetryBaseDelayMs` / `PALI_TX_RETRY_BASE_DELAY_MS`
- `txRetryMaxDelayMs` / `PALI_TX_RETRY_MAX_DELAY_MS`

共享证据总线:
- 默认写入 `${dataDir}/evidence.jsonl`
- `PALI_EVIDENCE_PATH` 可覆盖读写路径
- Relayer 读取共享文件时仍兼容旧文件名 `evidence-agent.jsonl` 与 `evidence-bft.jsonl`

Nonce 防重放持久化:
- `nonceRegistryPath` / `PALI_NONCE_REGISTRY_PATH`（默认: `${dataDir}/nonce-registry.log`）

Reward manifest 与 v2 争议恢复:
- `rewardManifestDir`（默认: `${dataDir}/reward-manifests`）
- `pendingChallengesPath` / `PALI_PENDING_CHALLENGES_PATH`（默认: `${dataDir}/pending-challenges-v2.json`）
- `challengeBondWei`

Reward proof 查询与领取:
- HTTP RPC: `pali_getRewardManifest(epochId)`、`pali_getRewardClaim(epochId, nodeId)`
- 本地 claim 脚本: `runtime/palimesh-reward-claim.ts`
- v2 claim 默认优先读取 `reward-epoch-<epoch>.settled.json`，无 settled manifest 时回退到原始 manifest

NodeOps 运行时接入:
- `nodeOpsPolicyPath` / `PALI_NODEOPS_POLICY_PATH`
- `nodeOpsHotReload`
- `nodeOpsAllowSelfRestart`
- `nodeOpsActionDir`（默认: `${dataDir}/nodeops-actions`）

NodeOps 行为:
- 运行时通过 `pali_getNetworkStats` 探测节点健康
- 动作以 JSON 文件形式落盘到 `nodeops-actions/`
- 默认仅记录动作；`nodeOpsAllowSelfRestart=true` 时才允许自重启
