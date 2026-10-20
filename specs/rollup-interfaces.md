# EVM Rollup Interfaces for Palimesh PoSe (v0.1 draft)

## 1. Architecture Boundary

- L1 (Settlement Layer): authoritative PoSe lifecycle and fund accounting.
- L2 (EVM Rollup): application execution and optional service metadata mirror.
- Relayer: transports canonical messages and receipts between layers.

## 2. L1 Contracts (authoritative)

- `PoSeManager`
- `BondVault`
- `EpochManager`

Required interfaces:

- `registerNode(...)`
- `updateCommitment(node_id, new_commitment)`
- `submitBatch(epoch_id, merkle_root, summary_hash, sample_proofs)`
- `challengeBatch(batch_id, receipt_leaf, merkle_proof)`
- `finalizeEpoch(epoch_id)`
- `slash(node_id, evidence)`

## 3. L2 Contracts (execution-oriented)

- `ServiceRegistry` (optional mirror)

Suggested responsibilities:

- maintain non-canonical service metadata for app-level routing;
- expose events consumed by relayer;
- avoid duplicating slash/finalize source of truth.

## 4. Cross-layer Message Types

- `NodeRegistered`
- `CommitmentUpdated`
- `BatchSubmitted`
- `BatchChallenged`
- `EpochFinalized`
- `NodeSlashed`

Message requirements:

- include source chain id and block reference;
- include deterministic payload hash;
- include monotonic nonce per channel.

## 4.1 Replay Protection Example

Canonical replay key:

`replay_key = keccak256(src_chain_id || dst_chain_id || channel_id || nonce || payload_hash)`

Validation rules:

- reject if `src_chain_id == dst_chain_id` for bridge-only channels;
- reject if `nonce <= last_nonce[channel_id][src_chain_id]`;
- reject if `replay_key` already exists;
- accept only when payload hash and block reference match finalized source event.

Suggested relayer envelope:

- `src_chain_id: uint64`
- `dst_chain_id: uint64`
- `channel_id: bytes32`
- `nonce: uint64`
- `payload_hash: bytes32`
- `source_block_number: uint64`
- `source_tx_hash: bytes32`

## 5. Finality and Timing Policy

- Epoch duration: 1 hour.
- Dispute window: 2 epochs.
- Relayer must wait configured finality depth before forwarding.
- L2 mirrors are eventually consistent and non-authoritative.

## 6. Trust and Failure Model

- Relayer crash: recover by event replay from finalized block.
- Relayer equivocation: reject by payload hash mismatch and nonce monotonic checks.
- Bridge delay: does not alter L1 canonical PoSe settlement.

## 7. Compatibility Targets

- Solidity contracts under EVM equivalence assumptions.
- Support standard wallet/tooling for node operators.
- Keep receipt leaf schema stable to enable future L2 migration.
