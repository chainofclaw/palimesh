// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {MerkleProofLite} from "../settlement/MerkleProofLite.sol";

/// @notice Minimal view surface of ValidatorRegistry consumed by CoreSetManager.
interface IValidatorRegistryLite {
    struct Validator {
        bytes32 nodeId;
        address operator;
        uint256 stake;
        uint64 registeredAt;
        uint64 unstakeRequestedAt;
        bool active;
    }

    function isActive(bytes32 nodeId) external view returns (bool);
    function getActiveValidators() external view returns (bytes32[] memory);
    function getValidator(bytes32 nodeId) external view returns (Validator memory);
}

/// @notice Minimal view surface of PoSeManagerV2 consumed by CoreSetManager.
interface IPoSeManagerLite {
    function epochRewardRoots(uint64 epochId) external view returns (bytes32);
    function getNodeBond(bytes32 nodeId) external view returns (uint256);
}

/**
 * @title CoreSetManager
 * @notice On-chain canonical authority for the two-tier core / non-core node
 *         model. Per epoch it ingests candidate data + Merkle proofs, verifies
 *         every input against on-chain state, computes a composite ranking
 *         score ON-CHAIN, and stores the ranked "core set" (the validators that
 *         participate in BFT consensus + block production). Non-core nodes are
 *         simply absent — they keep participating in PoSe only.
 *
 *         Because the ranking is derived on-chain from Merkle-proven inputs, the
 *         submitter (relayer) supplies only DATA + PROOFS, never the result: any
 *         node can recompute and MUST get the identical set. Every node then
 *         READS getActiveCoreSet() rather than recomputing locally, which is the
 *         property that removes the cross-node divergence risk of the pure
 *         runtime (Phase 1) design.
 *
 *         The scoring is kept byte-identical to runtime/lib/core-set-selector.ts
 *         (integer/BigInt math, normalize-over-totals, weighted sum, sort
 *         descending by score with a nodeId-ascending tie-break, hybrid Top-N
 *         with a floor). A determinism cross-check test enforces parity.
 */
contract CoreSetManager is Initializable, UUPSUpgradeable {
    // ── Ownership / roles ─────────────────────────────────────────────────
    address public owner;
    /// @notice Authorized to submit finalizeCoreSet (the epoch relayer).
    address public relayer;

    // ── Wired contracts ───────────────────────────────────────────────────
    IValidatorRegistryLite public validatorRegistry;
    IPoSeManagerLite public poseManager;

    // ── Ranking parameters (owner-settable via multisig) ──────────────────
    uint256 public wStake; // basis points
    uint256 public wBond; // basis points
    uint256 public wPerf; // basis points
    uint256 public scoreDenom; // normalization scale, e.g. 1e9
    uint16 public minCore; // hard floor (>= 4, ties to PR1A_MIN_VALIDATORS)
    uint16 public maxCore; // upper cap
    uint16 public topN; // desired size before clamping into [minCore, maxCore]

    // ── Per-epoch results ─────────────────────────────────────────────────
    mapping(uint64 => bytes32[]) private _coreSet; // ranked nodeIds
    mapping(uint64 => bool) public isCoreSetFinalized;
    mapping(uint64 => bool) public wasFallback; // below-floor → full registry set
    uint64 public lastFinalizedEpoch;

    uint256[45] private __gap;

    // ── Events / errors ───────────────────────────────────────────────────
    event CoreSetFinalized(uint64 indexed epochId, uint256 size, bool fallbackUsed);
    event ParamsUpdated();
    event RelayerUpdated(address indexed relayer);

    error NotOwner();
    error NotRelayer();
    error ZeroAddress();
    error AlreadyFinalized();
    error LengthMismatch();
    error CandidateNotActive(bytes32 nodeId);
    error BadPubkey();
    error EpochNotFinalized();
    error BadRewardProof(bytes32 nodeId);
    error BadParams();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer && msg.sender != owner) revert NotRelayer();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address initialRelayer,
        address registry_,
        address pose_
    ) external initializer {
        if (initialOwner == address(0) || registry_ == address(0) || pose_ == address(0)) revert ZeroAddress();
        owner = initialOwner;
        relayer = initialRelayer;
        validatorRegistry = IValidatorRegistryLite(registry_);
        poseManager = IPoSeManagerLite(pose_);
        // Defaults mirror DEFAULT_CORE_SET_CONFIG in core-set-selector.ts.
        wStake = 5000;
        wBond = 2000;
        wPerf = 3000;
        scoreDenom = 1_000_000_000;
        minCore = 4;
        maxCore = 21;
        topN = 21;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ── Owner setters ─────────────────────────────────────────────────────
    function setWeights(uint256 wStake_, uint256 wBond_, uint256 wPerf_, uint256 scoreDenom_) external onlyOwner {
        if (scoreDenom_ == 0) revert BadParams();
        wStake = wStake_;
        wBond = wBond_;
        wPerf = wPerf_;
        scoreDenom = scoreDenom_;
        emit ParamsUpdated();
    }

    function setSizes(uint16 minCore_, uint16 maxCore_, uint16 topN_) external onlyOwner {
        if (minCore_ == 0 || maxCore_ < minCore_) revert BadParams();
        minCore = minCore_;
        maxCore = maxCore_;
        topN = topN_;
        emit ParamsUpdated();
    }

    function setContracts(address registry_, address pose_) external onlyOwner {
        if (registry_ == address(0) || pose_ == address(0)) revert ZeroAddress();
        validatorRegistry = IValidatorRegistryLite(registry_);
        poseManager = IPoSeManagerLite(pose_);
        emit ParamsUpdated();
    }

    function setRelayer(address relayer_) external onlyOwner {
        relayer = relayer_;
        emit RelayerUpdated(relayer_);
    }

    // ── Core-set finalization (the on-chain ranking) ──────────────────────
    /**
     * @notice Ingest candidate data for `epochId`, verify each input on-chain,
     *         compute the composite ranking, and store the resulting core set.
     * @dev Candidates are supplied as 65-byte uncompressed pubkeys, NOT nodeIds,
     *      because ValidatorRegistry and PoSeManagerV2 derive DIFFERENT nodeIds
     *      from the same key: ValidatorRegistry uses keccak256(pubkey[1:]) (the
     *      EVM-address-anchored id), PoSeManagerV2 uses keccak256(pubkey) (the
     *      full-pubkey id). Deriving both here from one pubkey lets us read stake
     *      against the registry id AND bond/reward against the PoSe id for the
     *      SAME node — trustlessly, since the contract recomputes both ids.
     * @param pubkeys       65-byte (0x04||X||Y) pubkeys of the candidate pool
     *        (each must be an active ValidatorRegistry member — staked).
     * @param rewardAmounts Per-candidate PoSe reward for the epoch (0 if none).
     * @param rewardProofs  Merkle proof for each non-zero reward against
     *        poseManager.epochRewardRoots(epochId), keyed by the PoSe nodeId.
     */
    function finalizeCoreSet(
        uint64 epochId,
        bytes[] calldata pubkeys,
        uint256[] calldata rewardAmounts,
        bytes32[][] calldata rewardProofs
    ) external onlyRelayer {
        if (isCoreSetFinalized[epochId]) revert AlreadyFinalized();
        uint256 n = pubkeys.length;
        if (rewardAmounts.length != n || rewardProofs.length != n) revert LengthMismatch();

        bytes32 root = poseManager.epochRewardRoots(epochId);

        bytes32[] memory regNodeIds = new bytes32[](n); // registry id (BFT id + store)
        uint256[] memory stakes = new uint256[](n);
        uint256[] memory bonds = new uint256[](n);
        uint256[] memory rewards = new uint256[](n);
        uint256 sumStake;
        uint256 sumBond;
        uint256 sumReward;

        for (uint256 i; i < n; i++) {
            bytes calldata pk = pubkeys[i];
            if (pk.length != 65 || pk[0] != bytes1(0x04)) revert BadPubkey();
            bytes32 regNid = keccak256(pk[1:]);   // ValidatorRegistry nodeId
            bytes32 poseNid = keccak256(pk);       // PoSeManagerV2 nodeId
            if (!validatorRegistry.isActive(regNid)) revert CandidateNotActive(regNid);
            uint256 stake = validatorRegistry.getValidator(regNid).stake;
            uint256 bond = poseManager.getNodeBond(poseNid);
            uint256 amt = rewardAmounts[i];
            if (amt > 0) {
                if (root == bytes32(0)) revert EpochNotFinalized();
                bytes32 leaf = keccak256(abi.encodePacked(epochId, poseNid, amt));
                if (!MerkleProofLite.verify(rewardProofs[i], root, leaf)) revert BadRewardProof(regNid);
            }
            regNodeIds[i] = regNid;
            stakes[i] = stake;
            bonds[i] = bond;
            rewards[i] = amt;
            sumStake += stake;
            sumBond += bond;
            sumReward += amt;
        }

        // Composite score — identical formula to core-set-selector.ts.
        uint256[] memory scores = new uint256[](n);
        for (uint256 i; i < n; i++) {
            uint256 nS = (sumStake > 0 && stakes[i] > 0) ? (stakes[i] * scoreDenom) / sumStake : 0;
            uint256 nB = (sumBond > 0 && bonds[i] > 0) ? (bonds[i] * scoreDenom) / sumBond : 0;
            uint256 nR = (sumReward > 0 && rewards[i] > 0) ? (rewards[i] * scoreDenom) / sumReward : 0;
            scores[i] = wStake * nS + wBond * nB + wPerf * nR;
        }

        // Rank descending by score, tie-break nodeId ascending (insertion sort).
        uint256[] memory idx = new uint256[](n);
        for (uint256 i; i < n; i++) idx[i] = i;
        for (uint256 i = 1; i < n; i++) {
            uint256 key = idx[i];
            uint256 j = i;
            while (j > 0 && _ranksBelow(scores[idx[j - 1]], regNodeIds[idx[j - 1]], scores[key], regNodeIds[key])) {
                idx[j] = idx[j - 1];
                j--;
            }
            idx[j] = key;
        }

        // Hybrid Top-N + floor.
        uint16 upper = maxCore < minCore ? minCore : maxCore;
        if (n < minCore) {
            // Below floor: never shrink the BFT set — store the full registry set.
            _coreSet[epochId] = validatorRegistry.getActiveValidators();
            wasFallback[epochId] = true;
        } else {
            uint256 target = topN < minCore ? minCore : (topN > upper ? upper : topN);
            uint256 k = target > n ? n : target;
            bytes32[] memory sel = new bytes32[](k);
            for (uint256 i; i < k; i++) sel[i] = regNodeIds[idx[i]];
            _coreSet[epochId] = sel;
        }

        isCoreSetFinalized[epochId] = true;
        if (epochId > lastFinalizedEpoch) lastFinalizedEpoch = epochId;
        emit CoreSetFinalized(epochId, _coreSet[epochId].length, wasFallback[epochId]);
    }

    /// @dev True when (scoreA, nidA) ranks BELOW (scoreB, nidB): lower score, or
    ///      equal score and larger nodeId. Mirrors core-set-selector.ts ordering.
    function _ranksBelow(uint256 scoreA, bytes32 nidA, uint256 scoreB, bytes32 nidB) private pure returns (bool) {
        if (scoreA < scoreB) return true;
        if (scoreA > scoreB) return false;
        return uint256(nidA) > uint256(nidB);
    }

    // ── Views ─────────────────────────────────────────────────────────────
    function getCoreSet(uint64 epochId) external view returns (bytes32[] memory) {
        return _coreSet[epochId];
    }

    /// @notice The core set every node should apply now: the most recently
    ///         finalized epoch's set (nodes read this at the epoch boundary).
    function getActiveCoreSet() external view returns (bytes32[] memory) {
        return _coreSet[lastFinalizedEpoch];
    }
}
