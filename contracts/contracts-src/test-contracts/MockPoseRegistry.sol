// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockPoseRegistry
 * @notice Test double for the read-only slice of PoSeManagerV2 that
 *         StorageRewardManager depends on (`nodeOperator`). Lets tests wire
 *         node→operator without standing up the full PoSe registration flow
 *         (bond, witnesses, epochs).
 */
contract MockPoseRegistry {
    mapping(bytes32 => address) public nodeOperator;

    function setOperator(bytes32 nodeId, address operator) external {
        nodeOperator[nodeId] = operator;
    }
}
