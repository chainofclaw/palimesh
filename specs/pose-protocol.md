# PoSe Protocol Spec (v0.1 draft)

## 1. Scope

This spec defines the Proof-of-Service protocol for Palimesh in an EVM-rollup-compatible architecture.

- L1 settlement: canonical PoSe state, slashing, epoch finalize.
- L2 execution: business contracts and optional mirrors.
- Off-chain: challenge, receipt verification, aggregation.

## 2. Entities

- `Node`: service provider with registered public key and bond.
- `Challenger`: emits challenge messages by policy and randomness.
- `Aggregator`: batches verified receipts and submits merkle root.
- `Verifier`: deterministic off-chain validator for receipt rules.

## 3. Node Registration Fields

`registerNode(node_id, pubkey_node, service_flags, service_commitment, endpoint_commitment, bond_amount, metadata_hash)`

- `node_id`: `keccak256(pubkey_node)`.
- `pubkey_node`: node signing key.
- `service_flags`: bitmask of `FN/SN/RN`.
- `service_commitment`: commitment root, especially for storage service.
- `endpoint_commitment`: hash of endpoint bundle.
- `bond_amount`: fixed anti-cheat bond, not consensus weight.
- `metadata_hash`: optional off-chain metadata hash.

## 3.1 Canonical Types (EVM)

| Field | Type | Notes |
|---|---|---|
| `node_id` | `bytes32` | derived as `keccak256(pubkey_node)` |
| `pubkey_node` | `bytes` | secp256k1 compressed/uncompressed key |
| `service_flags` | `uint8` | bitmask: `FN=1`, `SN=2`, `RN=4` |
| `service_commitment` | `bytes32` | storage/service commitment root |
| `endpoint_commitment` | `bytes32` | hash of endpoint bundle |
| `bond_amount` | `uint256` | token amount in settlement unit |
| `metadata_hash` | `bytes32` | optional content hash |
| `epoch_id` | `uint64` | monotonically increasing |
| `challenge_type` | `uint8` | `U=0`, `S=1`, `R=2` |
| `nonce` | `bytes16` | 128-bit unique random |
| `issued_at` | `uint64` | unix ms |
| `deadline_ms` | `uint32` | timeout in ms |
| `response_at` | `uint64` | unix ms |
| `merkle_root` | `bytes32` | receipt batch root |
| `summary_hash` | `bytes32` | score/account summary commitment |

## 4. Challenge Message

`challenge_id = keccak256(epoch_id || node_id || challenge_type || nonce || challenger_id)`

Fields:

- `epoch_id`
- `challenge_type`: `U | S | R`
- `nonce`: 128-bit random, single-use
- `rand_seed`: randomness reference
- `issued_at`
- `deadline_ms`
- `query_spec`
- `challenger_sig`

Rules:

- Challenge must be signed.
- Nonce must be globally unique per challenge domain.
- Deadline policy defaults: U=2500ms, S=6000ms, R policy-defined.

## 5. Receipt Message

Fields:

- `challenge_id`
- `node_id`
- `response_at`
- `response_body`
- `node_sig`

Verification rules:

- Signature valid over `hash(challenge_id || response_body || response_at)`.
- Time bound: `response_at <= issued_at + deadline_ms`.
- U receipt must be reproducible from chain state or block data.
- S receipt must validate merkle proof under declared commitment root.
- Replay rejection by nonce registry.

## 6. Batch Settlement

Preferred flow: off-chain aggregation, on-chain sampled verification.

`submitBatch(epoch_id, merkle_root, summary_hash, sample_proofs[])`

- `merkle_root`: root of receipt leaves.
- `summary_hash`: canonical summary for scoring and accounting.
  - v0.1 canonical formula:
    - `summary_hash = keccak256(epoch_id || merkle_root || sample_commitment || sample_count)`
    - `sample_commitment = fold_keccak(sample_leaf_index, sample_leaf_hash)` with strict increasing `leaf_index`.
- `sample_proofs`: on-chain random samples used for immediate checks.

Dispute:

`challengeBatch(batch_id, receipt_leaf, merkle_proof)`

- Dispute window: 2 epochs.
- v0.1 baseline: challenge is restricted to slasher role and requires a valid proof for an unsampled leaf.
- On success: mark batch disputed; slashing and score rollback are then processed by settlement flow.

## 7. Scoring and Rewards (default)

- Buckets: U=60%, S=30%, R=10%.
- Storage score includes diminishing return function (sqrt style).
- Soft cap on node reward to limit concentration.
- Progressive penalty: reward loss first, bond slash on repeated fault.

## 8. Security Invariants

- Bond is anti-cheat collateral only.
- No AI decision enters state transition without deterministic proof.
- Aggregator and challenger are slashable roles when provable fraud exists.
- All critical hashes and signatures are deterministic and replay-safe.
