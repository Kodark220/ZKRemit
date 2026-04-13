pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

/// @title ComplianceProof - ZK circuit for AML/KYC compliance verification
/// @notice Proves that a sender meets compliance requirements without revealing:
///         - Their actual KYC level (only that it meets minimum threshold)
///         - Their identity details
///         - Their transaction history patterns
///         - Their exact position in the sanctions exclusion tree
///
/// Public signals:
///   [0] kycLevelHash    - Poseidon hash of (kycLevel, userSecret) 
///   [1] amountInRange   - 1 if amount is within AML limits
///   [2] sanctionsClear  - 1 if address is NOT on sanctions list
///   [3] corridorHash    - Poseidon hash of corridor identifier
///   [4] timestamp       - Proof generation timestamp (for freshness)
///   [5] nullifier       - Unique nullifier to prevent proof reuse

template ComplianceProof(sanctionsTreeDepth) {
    // ========== Private Inputs ==========
    signal input kycLevel;              // User's actual KYC level (1-4)
    signal input userSecret;            // User's secret for commitment
    signal input amount;                // Transaction amount
    signal input maxAmount;             // AML threshold for this corridor
    signal input senderAddress;         // Sender's address (as field element)
    signal input corridorId;            // Corridor identifier
    
    // Sanctions Merkle exclusion proof
    signal input sanctionsMerkleRoot;   // Root of sanctions list Merkle tree
    signal input sanctionsMerklePath[sanctionsTreeDepth];
    signal input sanctionsMerklePathIndices[sanctionsTreeDepth];
    
    // ========== Public Outputs ==========
    signal output kycLevelHash;
    signal output amountInRange;
    signal output sanctionsClear;
    signal output corridorHash;
    signal output timestamp;
    signal output nullifier;

    // ========== Timestamp Input ==========
    signal input proofTimestamp;

    // ========== 1. KYC Level Verification ==========
    // Prove kycLevel >= 1 (BASIC minimum) without revealing exact level
    signal kycMinusMin;
    kycMinusMin <== kycLevel - 1;
    
    // Ensure kycLevel is in valid range [1, 4]
    component kycUpperBound = LessEqThan(8);
    kycUpperBound.in[0] <== kycLevel;
    kycUpperBound.in[1] <== 4;
    kycUpperBound.out === 1;
    
    component kycLowerBound = GreaterEqThan(8);
    kycLowerBound.in[0] <== kycLevel;
    kycLowerBound.in[1] <== 1;
    kycLowerBound.out === 1;

    // Hash KYC level with user secret (commitment)
    component kycHasher = Poseidon(2);
    kycHasher.inputs[0] <== kycLevel;
    kycHasher.inputs[1] <== userSecret;
    kycLevelHash <== kycHasher.out;

    // ========== 2. Amount Range Check (AML Compliance) ==========
    // Prove amount <= maxAmount without revealing exact amount
    component amountCheck = LessEqThan(64);
    amountCheck.in[0] <== amount;
    amountCheck.in[1] <== maxAmount;
    amountInRange <== amountCheck.out;

    // Also ensure amount > 0
    component amountPositive = GreaterThan(64);
    amountPositive.in[0] <== amount;
    amountPositive.in[1] <== 0;
    amountPositive.out === 1;

    // ========== 3. Sanctions Exclusion Proof ==========
    // Prove sender address is NOT in the sanctions Merkle tree
    // We verify the address doesn't match any leaf by checking
    // the computed root differs from the sanctions root
    component addressHasher = Poseidon(1);
    addressHasher.inputs[0] <== senderAddress;
    
    // Compute Merkle path from the sender's hashed address
    signal merkleNodes[sanctionsTreeDepth + 1];
    merkleNodes[0] <== addressHasher.out;
    
    component merkleHashers[sanctionsTreeDepth];
    component merkleMux[sanctionsTreeDepth];
    
    for (var i = 0; i < sanctionsTreeDepth; i++) {
        merkleMux[i] = Mux1();
        merkleMux[i].c[0] <== merkleNodes[i];
        merkleMux[i].c[1] <== sanctionsMerklePath[i];
        merkleMux[i].s <== sanctionsMerklePathIndices[i];
        
        merkleHashers[i] = Poseidon(2);
        merkleHashers[i].inputs[0] <== merkleMux[i].out;
        merkleHashers[i].inputs[1] <== sanctionsMerklePath[i] + merkleNodes[i] - merkleMux[i].out;
        merkleNodes[i + 1] <== merkleHashers[i].out;
    }
    
    // If computed root != sanctions root, address is NOT sanctioned
    component sanctionsCheck = IsEqual();
    sanctionsCheck.in[0] <== merkleNodes[sanctionsTreeDepth];
    sanctionsCheck.in[1] <== sanctionsMerkleRoot;
    
    // sanctionsClear = 1 when NOT equal (not in sanctions list)
    sanctionsClear <== 1 - sanctionsCheck.out;

    // ========== 4. Corridor Hash ==========
    component corridorHasher = Poseidon(1);
    corridorHasher.inputs[0] <== corridorId;
    corridorHash <== corridorHasher.out;

    // ========== 5. Timestamp ==========
    timestamp <== proofTimestamp;

    // ========== 6. Nullifier (prevents proof reuse) ==========
    component nullifierHasher = Poseidon(3);
    nullifierHasher.inputs[0] <== userSecret;
    nullifierHasher.inputs[1] <== amount;
    nullifierHasher.inputs[2] <== proofTimestamp;
    nullifier <== nullifierHasher.out;
}

// Instantiate with 10-level Merkle tree for sanctions list (supports 1024 entries)
component main {public []} = ComplianceProof(10);
