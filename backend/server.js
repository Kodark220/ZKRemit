const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// HashKey Chain provider
const provider = new ethers.JsonRpcProvider(
  process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz"
);

// Contract ABIs (minimal)
const HSP_ABI = [
  "function getPaymentRequest(bytes32) view returns (tuple(bytes32 requestId, address sender, address recipient, address token, uint256 amount, uint256 fee, string sourceCurrency, string targetCurrency, string corridor, uint256 createdAt, uint256 expiresAt, uint8 status))",
  "function getUserRequests(address) view returns (bytes32[])",
  "function getReceipt(bytes32) view returns (tuple(bytes32 requestId, address sender, address recipient, uint256 amount, uint256 settledAt, bytes32 txHash))",
  "function calculateFee(uint256) view returns (uint256)",
  "function isCorridorSupported(string) view returns (bool)",
  "function totalSettledVolume() view returns (uint256)",
  "function totalRemittances() view returns (uint256)",
];

const ZKREMIT_ABI = [
  "function getOrder(bytes32) view returns (tuple(bytes32 orderId, bytes32 hspRequestId, address sender, address recipient, address token, uint256 amount, string corridor, uint256 exchangeRate, uint256 recipientAmount, uint256 createdAt, uint8 status))",
  "function getUserOrders(address) view returns (bytes32[])",
  "function getCorridor(string) view returns (tuple(string code, string sourceCurrency, string targetCurrency, uint256 minAmount, uint256 maxAmount, uint256 exchangeRate, bool active))",
  "function getAllCorridors() view returns (string[])",
  "function getQuote(uint256, string) view returns (uint256, uint256, uint256)",
  "function totalOrders() view returns (uint256)",
];

// Load deployment config
let contracts = {};
try {
  const fs = require("fs");
  const path = require("path");
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployment-hashkeyTestnet.json"), "utf8")
  );
  contracts = {
    hsp: new ethers.Contract(deployment.hspSettlement, HSP_ABI, provider),
    zkRemit: new ethers.Contract(deployment.zkRemitCore, ZKREMIT_ABI, provider),
    usdt: deployment.usdt,
  };
  console.log("Loaded deployment config for", deployment.network);
} catch {
  console.log("No deployment found. API will run in demo mode.");
}

// ============ Routes ============

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", network: "hashkey-testnet", timestamp: Date.now() });
});

// Get supported corridors
app.get("/api/corridors", async (req, res) => {
  try {
    if (contracts.zkRemit) {
      const codes = await contracts.zkRemit.getAllCorridors();
      const corridors = await Promise.all(
        codes.map(async (code) => {
          const c = await contracts.zkRemit.getCorridor(code);
          return {
            code: c[0],
            sourceCurrency: c[1],
            targetCurrency: c[2],
            minAmount: c[3].toString(),
            maxAmount: c[4].toString(),
            exchangeRate: c[5].toString(),
            active: c[6],
          };
        })
      );
      return res.json({ corridors });
    }

    // Demo mode
    res.json({
      corridors: [
        { code: "HK-PH", sourceCurrency: "HKD", targetCurrency: "PHP", exchangeRate: "7200000", active: true },
        { code: "HK-ID", sourceCurrency: "HKD", targetCurrency: "IDR", exchangeRate: "2020000000", active: true },
        { code: "HK-TH", sourceCurrency: "HKD", targetCurrency: "THB", exchangeRate: "4400000", active: true },
        { code: "HK-VN", sourceCurrency: "HKD", targetCurrency: "VND", exchangeRate: "3200000000", active: true },
        { code: "HK-IN", sourceCurrency: "HKD", targetCurrency: "INR", exchangeRate: "10800000", active: true },
        { code: "HK-PK", sourceCurrency: "HKD", targetCurrency: "PKR", exchangeRate: "35600000", active: true },
        { code: "HK-BD", sourceCurrency: "HKD", targetCurrency: "BDT", exchangeRate: "14000000", active: true },
        { code: "HK-NP", sourceCurrency: "HKD", targetCurrency: "NPR", exchangeRate: "17200000", active: true },
        { code: "HK-LK", sourceCurrency: "HKD", targetCurrency: "LKR", exchangeRate: "38000000", active: true },
        { code: "HK-NG", sourceCurrency: "HKD", targetCurrency: "NGN", exchangeRate: "200000000", active: true },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get remittance quote
app.get("/api/quote", async (req, res) => {
  try {
    const { amount, corridor } = req.query;
    if (!amount || !corridor) {
      return res.status(400).json({ error: "amount and corridor required" });
    }

    if (contracts.zkRemit) {
      const [recipientAmount, fee, rate] = await contracts.zkRemit.getQuote(amount, corridor);
      return res.json({
        amount: amount.toString(),
        corridor,
        recipientAmount: recipientAmount.toString(),
        fee: fee.toString(),
        exchangeRate: rate.toString(),
      });
    }

    // Demo mode
    const rates = {
      "HK-PH": 7200000n, "HK-ID": 2020000000n, "HK-TH": 4400000n,
      "HK-VN": 3200000000n, "HK-IN": 10800000n, "HK-NG": 200000000n,
    };
    const rate = rates[corridor] || 1000000n;
    const amountBN = BigInt(amount);
    const fee = (amountBN * 30n) / 10000n;
    const recipientAmount = ((amountBN - fee) * rate) / 1000000n;

    res.json({
      amount: amount.toString(),
      corridor,
      recipientAmount: recipientAmount.toString(),
      fee: fee.toString(),
      exchangeRate: rate.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user transactions
app.get("/api/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    if (contracts.hsp) {
      const requestIds = await contracts.hsp.getUserRequests(address);
      const requests = await Promise.all(
        requestIds.map(async (id) => {
          const r = await contracts.hsp.getPaymentRequest(id);
          return {
            requestId: r[0],
            sender: r[1],
            recipient: r[2],
            token: r[3],
            amount: r[4].toString(),
            fee: r[5].toString(),
            sourceCurrency: r[6],
            targetCurrency: r[7],
            corridor: r[8],
            createdAt: r[9].toString(),
            expiresAt: r[10].toString(),
            status: Number(r[11]),
          };
        })
      );
      return res.json({ transactions: requests });
    }

    res.json({ transactions: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get protocol stats
app.get("/api/stats", async (req, res) => {
  try {
    if (contracts.hsp) {
      const [volume, count, orders] = await Promise.all([
        contracts.hsp.totalSettledVolume(),
        contracts.hsp.totalRemittances(),
        contracts.zkRemit.totalOrders(),
      ]);
      return res.json({
        totalVolume: volume.toString(),
        totalRemittances: count.toString(),
        totalOrders: orders.toString(),
      });
    }

    res.json({ totalVolume: "0", totalRemittances: "0", totalOrders: "0" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate ZK compliance proof (demo endpoint)
app.post("/api/proof/generate", async (req, res) => {
  try {
    const { kycLevel, amount, corridor, timestamp } = req.body;
    if (!kycLevel || !amount || !corridor) {
      return res.status(400).json({ error: "kycLevel, amount, corridor required" });
    }

    // In production, this would call the actual circuit
    // For demo, generate deterministic proof signals
    const corridorIds = {
      "HK-PH": 1, "HK-ID": 2, "HK-TH": 3, "HK-VN": 4, "HK-IN": 5,
      "HK-PK": 6, "HK-BD": 7, "HK-NP": 8, "HK-LK": 9, "HK-NG": 10,
    };

    const ts = timestamp || Math.floor(Date.now() / 1000);
    const corridorId = corridorIds[corridor] || 1;

    // Generate deterministic hashes for demo
    const kycLevelHash = ethers.keccak256(
      ethers.solidityPacked(["uint256", "uint256"], [kycLevel, ts])
    );
    const corridorHash = ethers.keccak256(
      ethers.solidityPacked(["uint256"], [corridorId])
    );
    const nullifier = ethers.keccak256(
      ethers.solidityPacked(["uint256", "uint256", "uint256"], [ts, amount, corridorId])
    );

    // Convert to uint256 range
    const toUint = (hex) => BigInt(hex) % BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

    res.json({
      proof: {
        pA: ["1", "2"],
        pB: [["1", "2"], ["3", "4"]],
        pC: ["1", "2"],
      },
      publicSignals: [
        toUint(kycLevelHash).toString(),
        "1",
        "1",
        toUint(corridorHash).toString(),
        ts.toString(),
        toUint(nullifier).toString(),
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contract addresses
app.get("/api/contracts", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const deployment = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "deployment-hashkeyTestnet.json"), "utf8")
    );
    res.json(deployment);
  } catch {
    res.json({
      network: "demo",
      complianceVerifier: ethers.ZeroAddress,
      kycSBT: ethers.ZeroAddress,
      hspSettlement: ethers.ZeroAddress,
      zkRemitCore: ethers.ZeroAddress,
      usdt: ethers.ZeroAddress,
    });
  }
});

app.listen(PORT, () => {
  console.log(`ZKRemit API running on http://localhost:${PORT}`);
  console.log(`Mode: ${contracts.hsp ? "live" : "demo"}`);
});
