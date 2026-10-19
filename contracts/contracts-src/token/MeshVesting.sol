// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IMeshERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title MeshVesting
 * @notice 4-year linear vesting for the $MESH team & foundation allocation (200M, 20%).
 *
 * At genesis MeshToken mints TEAM_SUPPLY (200M MESH) to this contract; the
 * beneficiary then releases linearly over 4 years with no cliff. Unlike the
 * native-token FoundationVesting (which moves value via `call{value}`), this
 * moves an ERC-20 balance via `IMeshERC20.transfer`.
 *
 * The MESH token address is set once after deployment (setMeshToken) to break the
 * MeshToken<->MeshVesting deployment cycle: MeshVesting is deployed first, its
 * address is passed to MeshToken.initialize as the team recipient, then the owner
 * wires the token address back here.
 *
 * `vestedAmount()` is computed against the TEAM_SUPPLY constant and elapsed time —
 * independent of the live contract balance — so schedule accounting is
 * deterministic regardless of when the genesis mint lands.
 */
contract MeshVesting is Initializable, UUPSUpgradeable {
    uint256 public constant TEAM_SUPPLY = 200_000_000 ether; // 20% of 1B
    uint256 public constant VESTING_DURATION = 4 * 365 days;  // 4-year linear, no cliff

    address public beneficiary;
    address public owner;
    address public meshToken;

    uint256 public vestingStart;
    uint256 public totalReleased;

    event Released(address indexed to, uint256 amount);
    event BeneficiaryUpdated(address indexed oldBeneficiary, address indexed newBeneficiary);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);
    event MeshTokenSet(address indexed token);

    error NotOwner();
    error NotBeneficiary();
    error NothingToRelease();
    error TransferFailed();
    error ZeroAddress();
    error TokenAlreadySet();
    error TokenNotSet();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _beneficiary, address initialOwner) external initializer {
        if (_beneficiary == address(0) || initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        beneficiary = _beneficiary;
        // vestingStart is anchored in setMeshToken, when the 200M genesis mint is
        // actually in place — not here — so no time vests before the tokens land.
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Wire the MESH token address once, post-deployment. Anchors the
    ///         4-year vesting clock here, when the genesis allocation is in place.
    function setMeshToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (meshToken != address(0)) revert TokenAlreadySet();
        meshToken = token;
        vestingStart = block.timestamp;
        emit MeshTokenSet(token);
    }

    function updateBeneficiary(address newBeneficiary) external onlyOwner {
        if (newBeneficiary == address(0)) revert ZeroAddress();
        emit BeneficiaryUpdated(beneficiary, newBeneficiary);
        beneficiary = newBeneficiary;
    }

    /// @notice Total amount vested (unlocked) up to now, against TEAM_SUPPLY.
    ///         Zero until the token is wired (vestingStart anchored).
    function vestedAmount() public view returns (uint256) {
        if (vestingStart == 0) return 0;
        uint256 elapsed = block.timestamp - vestingStart;
        if (elapsed >= VESTING_DURATION) return TEAM_SUPPLY;
        return (TEAM_SUPPLY * elapsed) / VESTING_DURATION;
    }

    /// @notice Amount currently releasable (vested minus already released).
    function releasable() public view returns (uint256) {
        uint256 vested = vestedAmount();
        return vested > totalReleased ? vested - totalReleased : 0;
    }

    /// @notice Release up to `amount` of vested MESH to the beneficiary.
    function release(uint256 amount) external onlyBeneficiary {
        if (meshToken == address(0)) revert TokenNotSet();
        if (amount == 0) revert NothingToRelease();
        if (amount > releasable()) revert NothingToRelease();

        totalReleased += amount;

        if (!IMeshERC20(meshToken).transfer(beneficiary, amount)) revert TransferFailed();
        emit Released(beneficiary, amount);
    }

    // UUPS storage gap — append-only state from now on.
    uint256[50] private __gap;
}
