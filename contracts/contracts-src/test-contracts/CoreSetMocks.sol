// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test double for ValidatorRegistry — settable stake/active + active list.
contract MockValidatorRegistry {
    struct Validator {
        bytes32 nodeId;
        address operator;
        uint256 stake;
        uint64 registeredAt;
        uint64 unstakeRequestedAt;
        bool active;
    }

    mapping(bytes32 => Validator) private _v;
    bytes32[] private _active;

    function setValidator(bytes32 nodeId, uint256 stake, bool active) external {
        bool wasActive = _v[nodeId].active;
        _v[nodeId] = Validator({
            nodeId: nodeId,
            operator: address(0),
            stake: stake,
            registeredAt: 0,
            unstakeRequestedAt: 0,
            active: active
        });
        if (active && !wasActive) {
            _active.push(nodeId);
        } else if (!active && wasActive) {
            for (uint256 i; i < _active.length; i++) {
                if (_active[i] == nodeId) {
                    _active[i] = _active[_active.length - 1];
                    _active.pop();
                    break;
                }
            }
        }
    }

    function isActive(bytes32 nodeId) external view returns (bool) {
        return _v[nodeId].active;
    }

    function getActiveValidators() external view returns (bytes32[] memory) {
        return _active;
    }

    function getValidator(bytes32 nodeId) external view returns (Validator memory) {
        return _v[nodeId];
    }
}

/// @notice Test double for PoSeManagerV2 — settable bond + epoch reward root.
contract MockPoSeManager {
    mapping(uint64 => bytes32) public epochRewardRoots;
    mapping(bytes32 => uint256) private _bond;

    function setRewardRoot(uint64 epochId, bytes32 root) external {
        epochRewardRoots[epochId] = root;
    }

    function setBond(bytes32 nodeId, uint256 bond) external {
        _bond[nodeId] = bond;
    }

    function getNodeBond(bytes32 nodeId) external view returns (uint256) {
        return _bond[nodeId];
    }
}
