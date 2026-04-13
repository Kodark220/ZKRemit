# ZKRemit 🔐

**ZK-Compliant Cross-Border Remittance Protocol on HashKey Chain**

> Send money home. Prove compliance. Reveal nothing.

[![Track](https://img.shields.io/badge/Track-PayFi%20%2B%20ZKID-6366f1)](https://dorahacks.io/hackathon/2045)
[![Chain](https://img.shields.io/badge/Chain-HashKey%20Chain-22d3ee)](https://hashkeychain.net)
[![HSP](https://img.shields.io/badge/Protocol-HSP-10b981)](https://hashfans.io)

## 🎯 Problem

Hong Kong processes over **$50B in annual remittances**. Migrant workers sending money home face:
- **High fees** (5-10% via traditional providers)
- **Full identity exposure** to every intermediary
- **Slow settlement** (1-5 business days)
- **No privacy** — every middleman sees your full KYC data

## 💡 Solution

ZKRemit is the first protocol that combines **Zero-Knowledge Proofs** with **HashKey Settlement Protocol (HSP)** to enable:

| Feature | Traditional | ZKRemit |
|---------|------------|---------|
| Fee | 5-10% | **0.3%** |
| Privacy | Full exposure | **ZK-verified (nothing revealed)** |
| Settlement | 1-5 days | **Instant (on-chain)** |
| Compliance | Manual checks | **Automated ZK proofs** |
| KYC | Shared with all parties | **Proven without revealing** |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      ZKRemit Protocol                    │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Sender   │───▶│  ZK Circuit   │───▶│  Compliance   │  │
│  │  Wallet   │    │  (Circom)     │    │  Verifier     │  │
│  └──────────┘    └──────────────┘    └───────┬───────┘  │
│                                               │          │
│  ┌──────────────────────────────────────────┐ │          │
│  │           HSP Settlement Layer            │◀┘          │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐ │           │
│  │  │ Request  │─▶│ Confirm  │─▶│ Settle  │ │           │
│  │  │ (Create) │  │(ZK+Lock) │  │(Release)│ │           │
│  │  └─────────┘  └──────────┘  └─────────┘ │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │        HashKey Chain (EVM L2)             │           │
│  │  KYC SBT │ USDT │ On-Chain Receipts      │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

## 🔐 What the ZK Proof Proves (Without Revealing)

| Proven Claim | What's Revealed | What Stays Private |
|---|---|---|
| KYC level ≥ BASIC | Poseidon hash | Actual KYC level, identity |
| Amount ≤ AML limit | Boolean (1/0) | Exact amount, patterns |
| Not on sanctions list | Merkle exclusion proof | Address, history |
| Valid remittance corridor | Corridor hash | Source/destination details |
| Proof freshness | Timestamp | - |
| No replay attack | Nullifier | User secret |

## 🌏 Supported Corridors

| Corridor | Route | Currency |
|----------|-------|----------|
| HK-PH | Hong Kong → Philippines | PHP |
| HK-ID | Hong Kong → Indonesia | IDR |
| HK-TH | Hong Kong → Thailand | THB |
| HK-VN | Hong Kong → Vietnam | VND |
| HK-IN | Hong Kong → India | INR |
| HK-PK | Hong Kong → Pakistan | PKR |
| HK-BD | Hong Kong → Bangladesh | BDT |
| HK-NP | Hong Kong → Nepal | NPR |
| HK-LK | Hong Kong → Sri Lanka | LKR |
| HK-NG | Hong Kong → Nigeria | NGN |

## 🛠️ Tech Stack

- **Smart Contracts**: Solidity 0.8.24, OpenZeppelin 5.x, Hardhat
- **ZK Circuits**: Circom 2.1, Groth16 (snarkjs), Poseidon hash
- **Settlement**: HSP (HashKey Settlement Protocol)
- **Chain**: HashKey Chain (EVM L2, Chain ID 133 testnet / 177 mainnet)
- **Identity**: HashKey KYC SBT (Soul Bound Token)
- **Frontend**: Next.js 14, Tailwind CSS, ethers.js v6
- **Backend**: Express.js, ethers.js

## 📁 Project Structure

```
zkremit/
├── contracts/                 # Solidity smart contracts
│   ├── ZKRemitCore.sol       # Main remittance orchestrator
│   ├── HSPSettlement.sol     # HSP payment flow (Request→Confirm→Settle)
│   ├── ComplianceVerifier.sol # Groth16 ZK proof verifier
│   ├── interfaces/           # IKycSBT, IComplianceVerifier
│   └── mocks/                # MockKycSBT, MockUSDT for testing
├── zk/
│   └── circuits/
│       └── compliance_proof.circom  # ZK circuit (KYC + AML + Sanctions)
├── scripts/
│   ├── deploy.js             # Deployment script
│   └── generate-proof.js     # ZK proof generator
├── test/
│   └── ZKRemit.test.js       # Comprehensive test suite
├── frontend/                 # Next.js frontend
│   └── src/
│       ├── pages/index.js    # Main UI
│       ├── lib/wallet.js     # Wallet connection
│       └── lib/api.js        # API client
├── backend/
│   └── server.js             # Express API server
└── hardhat.config.js         # Hardhat configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet

### Install & Compile

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Deploy to HashKey Chain Testnet

```bash
# Copy env file and add your private key
cp .env.example .env

# Get testnet HSK from faucet:
# https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/Faucet

# Deploy
npx hardhat run scripts/deploy.js --network hashkeyTestnet
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Run Backend API

```bash
cd backend
npm install
npm start
# API at http://localhost:3001
```

## 🧪 Testing

```bash
npx hardhat test
```

Tests cover:
- ✅ HSP payment request creation
- ✅ KYC verification enforcement
- ✅ Corridor validation
- ✅ ZK proof verification & fund locking
- ✅ Payment settlement & fund release
- ✅ Nullifier replay prevention
- ✅ Fee calculation & collection
- ✅ Quote accuracy
- ✅ Cancel & refund flow

## 📜 Contract Addresses (HashKey Chain Testnet)

*Deployed addresses will be in `deployment-hashkeyTestnet.json` after running deploy script.*

## 🔑 Key Innovations

1. **First HSP + ZK integration** — No other project combines HashKey Settlement Protocol with zero-knowledge compliance proofs
2. **Privacy-preserving compliance** — Proves regulatory compliance without revealing any personal data
3. **Hong Kong remittance focus** — Purpose-built for HK's top 10 remittance corridors
4. **Nullifier-based replay protection** — Each proof can only be used once
5. **On-chain receipts** — Immutable settlement records for audit trails

## 🏆 Hackathon Track

**PayFi** (primary) + **ZKID** (secondary)

- Uses **HSP** for settlement (PayFi track requirement, earns extra points)
- Uses **ZK proofs** for privacy-preserving compliance (ZKID track)
- Integrates **HashKey Chain KYC SBT** (native chain feature)
- Built on **HashKey Chain** with proper testnet deployment

## 📄 License

MIT
