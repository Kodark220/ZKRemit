// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IKycSBT.sol";

/// @title MockKycSBT - Mock HashKey Chain KYC SBT for testing
contract MockKycSBT is IKycSBT {
    mapping(address => KycLevel) public kycLevels;
    mapping(address => KycStatus) public kycStatuses;

    function setKyc(address user, KycLevel level, KycStatus status) external {
        kycLevels[user] = level;
        kycStatuses[user] = status;
    }

    function isHuman(address account) external view returns (bool, uint8) {
        bool valid = kycStatuses[account] == KycStatus.APPROVED && kycLevels[account] >= KycLevel.BASIC;
        return (valid, uint8(kycLevels[account]));
    }

    function getKycInfo(address account) external view returns (
        string memory ensName,
        KycLevel level,
        KycStatus status,
        uint256 createTime
    ) {
        return ("test.hsk", kycLevels[account], kycStatuses[account], block.timestamp);
    }
}
