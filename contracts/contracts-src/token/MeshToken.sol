// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title MeshToken
 * @notice $MESH — the utility token of the PaliMesh decentralized storage network.
 *
 * Unlike $PALI (the native gas token of the Palium L1, accounted for in
 * PalimeshToken), $MESH is a *standard ERC-20* deployed as a regular contract on
 * Palium 88780. Gas is still paid in $PALI; $MESH pays for and rewards storage
 * service only. Storage nodes post their bond in $PALI (reusing the existing PoSe
 * bond/slash machinery) — $MESH itself carries NO staking or slashing logic, it
 * only mints, distributes, pays and burns.
 *
 * Fixed supply: 1,000,000,000 MESH, allocated as:
 *   - 40% (400M) Storage reward pool — minted linearly over time by the authorized
 *     minter (StorageRewardManager) as nodes earn "S" (Storage) PoSe rewards.
 *   - 20% (200M) Ecosystem & airdrop — minted at genesis to the ecosystem address.
 *   - 20% (200M) Team & foundation — minted at genesis to a vesting recipient
 *     (4-year linear vesting is enforced off-token by MeshVesting when that address
 *     is a MeshVesting instance).
 *   - 20% (200M) Liquidity & reserve — minted at genesis to the reserve address.
 *
 * Genesis mints 60% (600M) up front; the remaining 40% (400M) is released through
 * the minter, hard-capped at STORAGE_REWARD_POOL. Storage payments burn 10% of fees
 * (see StorageRewardManager), permanently reducing supply below the 1B cap.
 *
 * Note: in Solidity the `ether` keyword means 10^18 (the smallest unit), NOT Ether.
 * Here 1 ether = 1 MESH = 10^18 of MESH's smallest unit.
 */
contract MeshToken is Initializable, UUPSUpgradeable {
    string public constant name = "PaliMesh Storage";
    string public constant symbol = "MESH";
    uint8 public constant decimals = 18;

    uint256 public constant TOTAL_SUPPLY_CAP = 1_000_000_000 ether; // 1B MESH

    // Allocation buckets (must sum to TOTAL_SUPPLY_CAP)
    uint256 public constant STORAGE_REWARD_POOL = 400_000_000 ether; // 40% — minted via minter
    uint256 public constant ECOSYSTEM_SUPPLY = 200_000_000 ether;    // 20% — genesis
    uint256 public constant TEAM_SUPPLY = 200_000_000 ether;         // 20% — genesis (vested)
    uint256 public constant LIQUIDITY_SUPPLY = 200_000_000 ether;    // 20% — genesis
    uint256 public constant GENESIS_SUPPLY =
        ECOSYSTEM_SUPPLY + TEAM_SUPPLY + LIQUIDITY_SUPPLY;           // 600M (60%)

    uint256 public totalSupply;
    uint256 public totalMinted; // Cumulative storage-reward emissions (excludes genesis)
    uint256 public totalBurned; // All burns (fee burn + manual)

    address public owner;
    address public minter; // StorageRewardManager — sole authorized minter

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    error ExceedsSupplyCap();
    error ExceedsRewardPool();
    error NotOwner();
    error NotMinter();
    error InsufficientBalance();
    error InsufficientAllowance();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param ecosystem   Receives ECOSYSTEM_SUPPLY (200M) at genesis.
     * @param teamVesting Receives TEAM_SUPPLY (200M) at genesis — a MeshVesting
     *                    instance for enforced 4-year linear release, or a multisig.
     * @param liquidity   Receives LIQUIDITY_SUPPLY (200M) at genesis.
     * @param initialOwner Owner / UUPS upgrade authority (multisig on 88780).
     */
    function initialize(
        address ecosystem,
        address teamVesting,
        address liquidity,
        address initialOwner
    ) external initializer {
        if (
            ecosystem == address(0) ||
            teamVesting == address(0) ||
            liquidity == address(0) ||
            initialOwner == address(0)
        ) revert ZeroAddress();

        owner = initialOwner;

        _genesisMint(ecosystem, ECOSYSTEM_SUPPLY);
        _genesisMint(teamVesting, TEAM_SUPPLY);
        _genesisMint(liquidity, LIQUIDITY_SUPPLY);

        totalSupply = GENESIS_SUPPLY;
    }

    function _genesisMint(address to, uint256 amount) private {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    // ── Minter Management ──────────────────────────────────────────

    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) revert ZeroAddress();
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    // ── Storage-reward Emission (called by StorageRewardManager) ───

    /**
     * @notice Mint storage-reward tokens from the reward pool.
     * @dev Only the authorized minter (StorageRewardManager). Enforces
     *      STORAGE_REWARD_POOL — cumulative minting never exceeds 400M — and the
     *      1B total cap as a redundant guard.
     */
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert ZeroAddress();
        if (totalMinted + amount > STORAGE_REWARD_POOL) revert ExceedsRewardPool();
        if (totalSupply + amount > TOTAL_SUPPLY_CAP) revert ExceedsSupplyCap();

        totalMinted += amount;
        totalSupply += amount;
        balanceOf[to] += amount;

        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    // ── Burn ────────────────────────────────────────────────────────

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address from, uint256 amount) external {
        if (allowance[from][msg.sender] < amount) revert InsufficientAllowance();
        allowance[from][msg.sender] -= amount;
        _burn(from, amount);
    }

    function _burn(address from, uint256 amount) private {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        balanceOf[from] -= amount;
        totalSupply -= amount;
        totalBurned += amount;
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }

    // ── Standard ERC-20 ─────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        if (allowance[from][msg.sender] < amount) revert InsufficientAllowance();

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }

    // ── View Helpers ────────────────────────────────────────────────

    function remainingRewardPool() external view returns (uint256) {
        return STORAGE_REWARD_POOL - totalMinted;
    }

    function circulatingSupply() external view returns (uint256) {
        return totalSupply;
    }

    // UUPS storage gap — append-only state from now on.
    uint256[50] private __gap;
}
