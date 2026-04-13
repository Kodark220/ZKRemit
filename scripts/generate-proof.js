/**
 * ZKRemit - ZK Proof Generation Script
 * Generates compliance proofs for remittance transactions
 */
const snarkjs = require("snarkjs");
const { poseidon } = require("circomlib");
const path = require("path");
const fs = require("fs");

const TREE_DEPTH = 10;

class ComplianceProofGenerator {
  constructor(wasmPath, zkeyPath) {
    this.wasmPath = wasmPath || path.join(__dirname, "../zk/build/compliance_proof_js/compliance_proof.wasm");
    this.zkeyPath = zkeyPath || path.join(__dirname, "../zk/keys/compliance_proof_final.zkey");
  }

  /**
   * Generate a Poseidon hash
   */
  poseidonHash(inputs) {
    return poseidon(inputs);
  }

  /**
   * Build an empty Merkle tree (sanctions list)
   * Returns tree nodes and root
   */
  buildEmptyMerkleTree(depth) {
    const levels = [];
    let currentLevel = [];
    
    // Create leaf level with zeros
    const numLeaves = 2 ** depth;
    for (let i = 0; i < numLeaves; i++) {
      currentLevel.push(BigInt(0));
    }
    levels.push(currentLevel);

    // Build tree bottom-up
    for (let d = 0; d < depth; d++) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const hash = this.poseidonHash([currentLevel[i], currentLevel[i + 1]]);
        nextLevel.push(hash);
      }
      currentLevel = nextLevel;
      levels.push(currentLevel);
    }

    return { levels, root: currentLevel[0] };
  }

  /**
   * Get Merkle proof for a leaf index
   */
  getMerkleProof(tree, leafIndex) {
    const pathElements = [];
    const pathIndices = [];
    let index = leafIndex;

    for (let d = 0; d < TREE_DEPTH; d++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      pathElements.push(tree.levels[d][siblingIndex].toString());
      pathIndices.push((index % 2).toString());
      index = Math.floor(index / 2);
    }

    return { pathElements, pathIndices };
  }

  /**
   * Generate compliance proof inputs
   */
  generateInputs({
    kycLevel,         // 1-4 (BASIC to ULTIMATE)
    userSecret,       // Random secret for commitment
    amount,           // Transaction amount
    maxAmount,        // AML limit for corridor
    senderAddress,    // Sender address as bigint
    corridorId,       // Corridor identifier as number
    timestamp,        // Current timestamp
  }) {
    // Build sanctions tree (empty = no one sanctioned for demo)
    const tree = this.buildEmptyMerkleTree(TREE_DEPTH);
    
    // Get Merkle proof for a non-existent leaf (proving exclusion)
    const { pathElements, pathIndices } = this.getMerkleProof(tree, 0);

    return {
      // Private inputs
      kycLevel: kycLevel.toString(),
      userSecret: userSecret.toString(),
      amount: amount.toString(),
      maxAmount: maxAmount.toString(),
      senderAddress: senderAddress.toString(),
      corridorId: corridorId.toString(),
      sanctionsMerkleRoot: tree.root.toString(),
      sanctionsMerklePath: pathElements,
      sanctionsMerklePathIndices: pathIndices,
      proofTimestamp: timestamp.toString(),
    };
  }

  /**
   * Generate a ZK proof
   */
  async generateProof(inputs) {
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        this.wasmPath,
        this.zkeyPath
      );

      // Format for Solidity
      const solidityProof = {
        pA: [proof.pi_a[0], proof.pi_a[1]],
        pB: [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        pC: [proof.pi_c[0], proof.pi_c[1]],
        pubSignals: publicSignals,
      };

      return solidityProof;
    } catch (error) {
      console.error("Proof generation failed:", error);
      throw error;
    }
  }

  /**
   * Verify a proof locally
   */
  async verifyProof(proof, publicSignals, vkeyPath) {
    const vkey = JSON.parse(
      fs.readFileSync(vkeyPath || path.join(__dirname, "../zk/keys/verification_key.json"))
    );
    return await snarkjs.groth16.verify(vkey, publicSignals, proof);
  }

  /**
   * Generate a demo proof for testing (doesn't require circuit compilation)
   */
  generateDemoProof({
    kycLevel = 2,
    amount = 1000000000,  // 1000 USDT (6 decimals)
    corridorId = 1,       // HK-PH
    timestamp = Math.floor(Date.now() / 1000),
  }) {
    const userSecret = BigInt("12345678901234567890");
    const senderAddress = BigInt("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18");

    // Generate deterministic "proof" values for demo
    const kycHash = this.poseidonHash([BigInt(kycLevel), userSecret]);
    const corridorHash = this.poseidonHash([BigInt(corridorId)]);
    const nullifier = this.poseidonHash([userSecret, BigInt(amount), BigInt(timestamp)]);

    // Demo proof (valid structure, placeholder values)
    return {
      pA: [
        "12345678901234567890123456789012345678901234567890",
        "12345678901234567890123456789012345678901234567890",
      ],
      pB: [
        [
          "12345678901234567890123456789012345678901234567890",
          "12345678901234567890123456789012345678901234567890",
        ],
        [
          "12345678901234567890123456789012345678901234567890",
          "12345678901234567890123456789012345678901234567890",
        ],
      ],
      pC: [
        "12345678901234567890123456789012345678901234567890",
        "12345678901234567890123456789012345678901234567890",
      ],
      pubSignals: [
        kycHash.toString(),          // [0] kycLevelHash
        "1",                          // [1] amountInRange
        "1",                          // [2] sanctionsClear
        corridorHash.toString(),      // [3] corridorHash
        timestamp.toString(),         // [4] timestamp
        nullifier.toString(),         // [5] nullifier
      ],
    };
  }
}

module.exports = { ComplianceProofGenerator };

// CLI usage
if (require.main === module) {
  const generator = new ComplianceProofGenerator();
  const demoProof = generator.generateDemoProof({});
  console.log("Demo Proof Generated:");
  console.log(JSON.stringify(demoProof, null, 2));
}
