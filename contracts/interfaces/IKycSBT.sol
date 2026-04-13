// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IKycSBT - HashKey Chain KYC Soul Bound Token Interface
/// @notice Interface for HashKey Chain's native on-chain KYC system
interface IKycSBT {
    enum KycLevel { NONE, BASIC, ADVANCED, PREMIUM, ULTIMATE }
    enum KycStatus { NONE, APPROVED, REVOKED }

    function isHuman(address account) external view returns (bool, uint8);
    function getKycInfo(address account) external view returns (
        string memory ensName,
        KycLevel level,
        KycStatus status,
        uint256 createTime
    );
}
