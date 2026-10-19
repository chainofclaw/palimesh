// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {MerkleProofLite} from "./MerkleProofLite.sol";

interface IMeshToken {
    function mint(address to, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

/// @dev Read-only slice of PoSeManagerV2 — StorageRewardManager only *reads* the
///      node registry so it never touches the live U/R $PALI settlement path.
interface IPoSeNodeRegistry {
    function nodeOperator(bytes32 nodeId) external view returns (address);
}

/**
 * @title StorageRewardManager
 * @notice Settles PoSe "S" (Storage) proof rewards in $MESH, entirely bypassing
 *         PoSeManagerV2's native-token uptime/relay ($PALI) settlement.
 *
 * Design (keeps the live chain untouched):
 *   - Storage nodes are the *same* nodes registered in PoSeManagerV2 — they post
 *     their bond in the native token ($PALI) there. This contract only READS
 *     `nodeOperator(nodeId)` to resolve the payout address, so it reuses the
 *     existing bond/slash machinery and adds NO $MESH staking or slashing.
 *   - Each epoch a relayer submits a storage-only reward Merkle root plus the
 *     epoch's total $MESH, produced off-chain from the storage bucket of the
 *     existing scoring pipeline (services/verifier/scoring.ts). Leaves reuse the
 *     PoSe reward-tree encoding: keccak256(abi.encodePacked(epochId,nodeId,amount)).
 *   - Nodes claim with a Merkle proof within CLAIM_WINDOW_EPOCHS; this contract
 *     MINTS $MESH to the operator from the 40% storage reward pool.
 *   - Emission is LINEAR (not PoSe's decaying schedule). To keep the "linear"
 *     promise robust against governance, the rate change is SEGMENTED: changing
 *     `emissionPerEpoch` freezes the amount unlocked so far as a baseline and only
 *     applies the new rate to future epochs — a rate hike can never retroactively
 *     unlock past epochs. A hard MAX_EMISSION_PER_EPOCH bounds the shortest
 *     possible release to 2 years.
 *   - Unclaimed epoch budget is reclaimed after the claim window (`sweepUnclaimed`)
 *     so dust never permanently locks the schedulable pool; the un-minted $MESH is
 *     simply never created (deflationary).
 *   - Storage *payments* (clients paying for service) split 70% node / 20% treasury
 *     / 10% burn via `payForStorage`.
 *
 * epoch definition matches PoSeManagerStorage.EPOCH_SECONDS (3600s / 1h).
 */
contract StorageRewardManager is Initializable, UUPSUpgradeable {
    uint64 public constant EPOCH_SECONDS = 3600;
    uint256 public constant STORAGE_REWARD_POOL = 400_000_000 ether; // 40% of 1B — mint ceiling
    // Shortest allowed release ~2 years → caps emissionPerEpoch (bounds H1/L3 blast radius)
    uint256 public constant MAX_EMISSION_PER_EPOCH = STORAGE_REWARD_POOL / (2 * 8760);
    uint64 public constant CLAIM_WINDOW_EPOCHS = 30 * 24; // 30 days to claim before sweep

    // Storage payment split (basis points, sum = 10000)
    uint16 public constant PAY_NODE_BPS = 7000;     // 70% to node
    uint16 public constant PAY_TREASURY_BPS = 2000; // 20% to treasury
    uint16 public constant PAY_BURN_BPS = 1000;     // 10% burned
    uint16 public constant BPS_DENOM = 10000;

    IMeshToken public meshToken;
    IPoSeNodeRegistry public poseRegistry;
    address public treasury;
    address public owner;

    mapping(address => bool) public relayers;

    uint64 public startEpoch;         // epoch at deployment
    uint256 public emissionPerEpoch;  // current linear unlock rate per epoch
    // Segmented linear release: unlocked = baseline + (now - anchor + 1) * rate,
    // frozen at each rate change so a hike never retroactively unlocks past epochs.
    uint256 public unlockedBaseline;
    uint64 public rateAnchorEpoch;

    uint256 public totalScheduled;    // cumulative $MESH committed (net of sweeps)
    uint256 public totalRewarded;     // cumulative $MESH actually claimed/minted
    uint256 public totalPaidToNodes;  // cumulative storage-payment $MESH to nodes
    uint256 public totalToTreasury;   // cumulative storage-payment $MESH to treasury
    uint256 public totalBurned;       // cumulative storage-payment $MESH burned

    mapping(uint64 => bytes32) public storageRewardRoot;
    mapping(uint64 => bool) public epochSubmitted;
    mapping(uint64 => uint64) public epochSubmittedAtEpoch; // for the claim window
    mapping(uint64 => bool) public epochSwept;
    mapping(uint64 => uint256) public epochTotalMesh;
    mapping(uint64 => uint256) public epochClaimedMesh;
    mapping(uint64 => mapping(bytes32 => bool)) public rewardClaimed;

    event StorageEpochSubmitted(uint64 indexed epochId, bytes32 rewardRoot, uint256 totalMesh);
    event RewardClaimed(uint64 indexed epochId, bytes32 indexed nodeId, address indexed operator, uint256 amount);
    event UnclaimedSwept(uint64 indexed epochId, uint256 reclaimed);
    event StoragePaid(
        address indexed payer,
        bytes32 indexed nodeId,
        address indexed operator,
        uint256 toNode,
        uint256 toTreasury,
        uint256 burned
    );
    event EmissionRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event RelayerUpdated(address indexed relayer, bool enabled);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error NotOwner();
    error NotRelayer();
    error ZeroAddress();
    error ZeroAmount();
    error EmissionAboveMax();
    error EpochAlreadySubmitted();
    error ExceedsUnlocked();
    error EpochNotSubmitted();
    error AlreadyClaimed();
    error ClaimWindowClosed();
    error InvalidMerkleProof();
    error ClaimExceedsEpochBudget();
    error NodeNotRegistered();
    error TransferFailed();
    error SweepWindowNotElapsed();
    error AlreadySwept();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (!relayers[msg.sender]) revert NotRelayer();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _meshToken,
        address _poseRegistry,
        address _treasury,
        uint256 _emissionPerEpoch,
        address initialOwner
    ) external initializer {
        if (
            _meshToken == address(0) ||
            _poseRegistry == address(0) ||
            _treasury == address(0) ||
            initialOwner == address(0)
        ) revert ZeroAddress();
        if (_emissionPerEpoch == 0) revert ZeroAmount();
        if (_emissionPerEpoch > MAX_EMISSION_PER_EPOCH) revert EmissionAboveMax();

        meshToken = IMeshToken(_meshToken);
        poseRegistry = IPoSeNodeRegistry(_poseRegistry);
        treasury = _treasury;
        owner = initialOwner;
        emissionPerEpoch = _emissionPerEpoch;
        startEpoch = _currentEpoch();
        rateAnchorEpoch = startEpoch;
        unlockedBaseline = 0;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function _currentEpoch() internal view returns (uint64) {
        return uint64(block.timestamp / EPOCH_SECONDS);
    }

    function currentEpoch() external view returns (uint64) {
        return _currentEpoch();
    }

    // ── Admin ────────────────────────────────────────────────────────

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /**
     * @notice Change the linear emission rate for FUTURE epochs only.
     * @dev Freezes the amount unlocked so far into `unlockedBaseline` and re-anchors
     *      at the next epoch, so a rate change never retroactively unlocks the pool.
     */
    function setEmissionPerEpoch(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert ZeroAmount();
        if (newRate > MAX_EMISSION_PER_EPOCH) revert EmissionAboveMax();
        unlockedBaseline = unlockedToDate();
        rateAnchorEpoch = _currentEpoch() + 1; // new rate applies from the next epoch
        emit EmissionRateUpdated(emissionPerEpoch, newRate);
        emissionPerEpoch = newRate;
    }

    function setRelayer(address relayer, bool enabled) external onlyOwner {
        if (relayer == address(0)) revert ZeroAddress();
        relayers[relayer] = enabled;
        emit RelayerUpdated(relayer, enabled);
    }

    // ── Linear release ───────────────────────────────────────────────

    /// @notice Cumulative $MESH unlocked for storage rewards by now: segmented
    ///         linear, hard-capped at STORAGE_REWARD_POOL.
    function unlockedToDate() public view returns (uint256) {
        uint64 nowEpoch = _currentEpoch();
        uint256 unlocked;
        if (nowEpoch < rateAnchorEpoch) {
            // Between a rate change and its next-epoch anchor: baseline stands.
            unlocked = unlockedBaseline;
        } else {
            uint256 elapsed = uint256(nowEpoch - rateAnchorEpoch) + 1; // inclusive of anchor epoch
            unlocked = unlockedBaseline + elapsed * emissionPerEpoch;
        }
        return unlocked > STORAGE_REWARD_POOL ? STORAGE_REWARD_POOL : unlocked;
    }

    function remainingPool() external view returns (uint256) {
        return STORAGE_REWARD_POOL - totalScheduled;
    }

    // ── Epoch submission (relayer) ───────────────────────────────────

    /**
     * @notice Commit an epoch's storage-only reward root and total $MESH.
     * @dev Enforces the linear release ceiling: cumulative scheduled $MESH may not
     *      exceed `unlockedToDate()`.
     */
    function submitStorageEpoch(
        uint64 epochId,
        bytes32 rewardRoot,
        uint256 totalMesh
    ) external onlyRelayer {
        if (epochSubmitted[epochId]) revert EpochAlreadySubmitted();
        if (totalMesh == 0 || rewardRoot == bytes32(0)) revert ZeroAmount();
        if (totalScheduled + totalMesh > unlockedToDate()) revert ExceedsUnlocked();

        storageRewardRoot[epochId] = rewardRoot;
        epochSubmitted[epochId] = true;
        epochSubmittedAtEpoch[epochId] = _currentEpoch();
        epochTotalMesh[epochId] = totalMesh;
        totalScheduled += totalMesh;

        emit StorageEpochSubmitted(epochId, rewardRoot, totalMesh);
    }

    // ── Merkle-claimable storage rewards ─────────────────────────────

    /**
     * @notice Claim an epoch's storage reward for `nodeId`; mints $MESH to the
     *         node's operator (resolved from PoSeManagerV2). Anyone may submit the
     *         proof — funds always go to the registered operator.
     */
    function claim(
        uint64 epochId,
        bytes32 nodeId,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        if (!epochSubmitted[epochId]) revert EpochNotSubmitted();
        if (amount == 0) revert ZeroAmount();
        if (merkleProof.length == 0) revert InvalidMerkleProof(); // real trees always yield a proof
        if (rewardClaimed[epochId][nodeId]) revert AlreadyClaimed();
        if (_currentEpoch() > epochSubmittedAtEpoch[epochId] + CLAIM_WINDOW_EPOCHS) {
            revert ClaimWindowClosed();
        }

        // Leaf encoding mirrors PoSe reward-tree.ts (services/common/reward-tree.ts)
        bytes32 leaf = keccak256(abi.encodePacked(epochId, nodeId, amount));
        if (!MerkleProofLite.verify(merkleProof, storageRewardRoot[epochId], leaf)) {
            revert InvalidMerkleProof();
        }

        uint256 claimed = epochClaimedMesh[epochId] + amount;
        if (claimed > epochTotalMesh[epochId]) revert ClaimExceedsEpochBudget();

        address operator = poseRegistry.nodeOperator(nodeId);
        if (operator == address(0)) revert NodeNotRegistered();

        rewardClaimed[epochId][nodeId] = true;
        epochClaimedMesh[epochId] = claimed;
        totalRewarded += amount;

        meshToken.mint(operator, amount);
        emit RewardClaimed(epochId, nodeId, operator, amount);
    }

    /**
     * @notice After the claim window, reclaim an epoch's unclaimed budget back into
     *         the schedulable pool. The un-minted $MESH is never created — this only
     *         frees `totalScheduled` so future epochs can use it. Callable by anyone.
     */
    function sweepUnclaimed(uint64 epochId) external {
        if (!epochSubmitted[epochId]) revert EpochNotSubmitted();
        if (epochSwept[epochId]) revert AlreadySwept();
        if (_currentEpoch() <= epochSubmittedAtEpoch[epochId] + CLAIM_WINDOW_EPOCHS) {
            revert SweepWindowNotElapsed();
        }

        epochSwept[epochId] = true;
        uint256 unclaimed = epochTotalMesh[epochId] - epochClaimedMesh[epochId];
        if (unclaimed > 0) {
            totalScheduled -= unclaimed;
        }
        emit UnclaimedSwept(epochId, unclaimed);
    }

    // ── Storage payments (70% node / 20% treasury / 10% burn) ────────

    /**
     * @notice Pay `amount` $MESH for storage served by `nodeId`. Caller must have
     *         approved this contract for `amount`. Splits 70/20/10 to
     *         node operator / treasury / burn.
     */
    function payForStorage(bytes32 nodeId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        address operator = poseRegistry.nodeOperator(nodeId);
        if (operator == address(0)) revert NodeNotRegistered();

        uint256 toNode = (amount * PAY_NODE_BPS) / BPS_DENOM;
        uint256 toTreasury = (amount * PAY_TREASURY_BPS) / BPS_DENOM;
        uint256 toBurn = amount - toNode - toTreasury; // remainder → burn (absorbs rounding)

        // Pull funds in, then account (before paying out) for CEI-style safety.
        if (!meshToken.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        totalPaidToNodes += toNode;
        totalToTreasury += toTreasury;
        totalBurned += toBurn;

        if (toNode > 0 && !meshToken.transfer(operator, toNode)) revert TransferFailed();
        if (toTreasury > 0 && !meshToken.transfer(treasury, toTreasury)) revert TransferFailed();
        if (toBurn > 0) meshToken.burn(toBurn);

        emit StoragePaid(msg.sender, nodeId, operator, toNode, toTreasury, toBurn);
    }

    // UUPS storage gap — append-only state from now on.
    uint256[50] private __gap;
}
