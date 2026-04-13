// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IComplianceVerifier - ZK Proof Verifier Interface
/// @notice Verifies Groth16 ZK proofs for AML/KYC compliance
interface IComplianceVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[6] calldata _pubSignals
    ) external view returns (bool);
}
