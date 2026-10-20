# Palimesh Economics Spec (v0.1 draft)

## Reward Pool

- `R_epoch = R_fees_epoch + R_inflation_epoch`
- Bucket split default:
  - Uptime: 60%
  - Storage: 30%
  - Relay: 10%

## Score Inputs

Per node per epoch:

- `uptimeBps` (0..10000)
- `storageBps` (0..10000)
- `relayBps` (0..10000)
- `storageGb` (committed and provable)

Thresholds default:

- uptime >= 8000
- storage >= 7000
- relay >= 5000

## Bucket Weights

- Uptime weight: `uptimeBps` above threshold, else `0`.
- Relay weight: `relayBps` above threshold, else `0`.
- Storage weight:
  - `effectiveStorage = min(storageGb, 500)`
  - `factor = sqrt(effectiveStorage)`
  - `weight = storageBps * factor / sqrt(500)`

## Distribution

Within each bucket:

- `nodeReward_bucket = bucketReward * nodeWeight / sumWeights`
- integer remainder goes to deterministic top-weight node (stable behavior).

## Soft Cap

- Compute median of non-zero node rewards.
- cap = `median * softCapMultiplier` (default 5x).
- Any excess above cap is redistributed proportionally to uncapped non-zero nodes.
- If redistribution has no eligible receiver, remainder goes to treasury overflow.

## Security Notes

- Scoring consumes only verified receipts.
- Nonce replay, timeout, invalid proof/signature are slash evidence inputs.
- Storage reward uses diminishing returns to reduce hardware concentration.
