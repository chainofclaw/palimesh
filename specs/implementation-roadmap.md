# Palimesh Implementation Roadmap (Solution 2)

Date: 2026-02-11

## 1. Technical Route (Final)

- Execution: EVM Rollup for application throughput and low fees.
- Settlement: L1 PoSe contracts as canonical source for registration, batch, dispute, finalize, slash.
- Off-chain services: challenger/verifier/aggregator/relayer for high-frequency operations.
- NodeOps: OpenClaw-style policy engine for deploy, monitor, self-heal, security, key lifecycle.

## 2. Layered Responsibilities

- L1 Settlement:
  - `PoSeManager` + storage model
  - bond/slash/dispute/finalization
- L2 Rollup:
  - `ServiceRegistry` mirror and relayer-driven updates
- Off-chain:
  - challenge issuance and quota
  - receipt verification with nonce replay protection
  - batch merkle root + summary hash generation
  - anti-cheat evidence generation
- NodeOps:
  - policy-driven recovery and operational safety

## 3. Milestone Delivery (v0.1 ~ v0.4)

## v0.1 (Protocol + Core Loop)

Deliverables:

- protocol specs (`pose-protocol`, `rollup-interfaces`)
- settlement contract skeleton
- challenger/verifier/aggregator baseline services

Exit Criteria:

- challenge -> verify -> aggregate pipeline works
- deterministic hash and replay guard validated

## v0.2 (Batch + Sample + Dispute)

Deliverables:

- sampled verification details wired into settlement logic
- dispute evidence verification path
- integration and e2e coverage for dispute outcomes

Exit Criteria:

- submit batch + sampled checks + dispute window path pass
- invalid leaf/evidence can be rejected and flagged

## v0.3 (Decentralized Roles)

Deliverables:

- challenger/aggregator rotation and stake/slash policy
- cross-role anti-collusion strategy
- stronger replay and equivocation detection

Exit Criteria:

- role rotation under load is stable
- slash evidence path verified end-to-end

## v0.4 (NodeOps + Multi-client)

Deliverables:

- policy standardization for NodeOps
- at least two client implementations compatible with policies
- failover/self-heal drill reports

Exit Criteria:

- operational drills pass under fault injection
- policy actions are observable and auditable

## 4. Current Completed Scope (this cycle)

- Step 1-9 delivered.
- quality gate delivered and passing:
  - unit/integration/e2e all green.

## 5. Next Engineering Backlog

1. complete settlement TODOs in `PoSeManager` (sample proof verification, dispute semantics, finalize math).
2. connect slash evidence schema to on-chain `slash` ABI strictly.
3. implement profile loader for `nodeops/policies/*.yaml`.
4. add e2e fault-injection cases (timeout/replay/dispute success).

## 6. Release Readiness Checklist

- specs frozen and versioned
- all tests pass via `bash Palimesh/scripts/quality-gate.sh`
- security review for replay/slash/dispute paths
- observability and audit logs enabled for nodeops actions
