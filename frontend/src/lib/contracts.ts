import { ethers } from "ethers";

const HSP_ABI = [
  "function getPaymentRequest(bytes32) view returns (tuple(bytes32 requestId, address sender, address recipient, address token, uint256 amount, uint256 fee, string sourceCurrency, string targetCurrency, string corridor, uint256 createdAt, uint256 expiresAt, uint8 status))",
  "function getUserRequests(address) view returns (bytes32[])",
  "function calculateFee(uint256) view returns (uint256)",
  "function isCorridorSupported(string) view returns (bool)",
  "function totalSettledVolume() view returns (uint256)",
  "function totalRemittances() view returns (uint256)",
];

const ZKREMIT_ABI = [
  "function getCorridor(string) view returns (tuple(string code, string sourceCurrency, string targetCurrency, uint256 minAmount, uint256 maxAmount, uint256 exchangeRate, bool active))",
  "function getAllCorridors() view returns (string[])",
  "function getQuote(uint256, string) view returns (uint256, uint256, uint256)",
  "function totalOrders() view returns (uint256)",
];

const DEPLOYMENT = {
  network: "hashkeyTestnet",
  complianceVerifier: process.env.NEXT_PUBLIC_COMPLIANCE_VERIFIER || "0x8f0b5DBFb49D60da3541B2aB0788daae58cb1E49",
  kycSBT: process.env.NEXT_PUBLIC_KYC_SBT || "0xB5F07915ac7EE30E408B69e2c9C2F4DE9f26e1ce",
  hspSettlement: process.env.NEXT_PUBLIC_HSP_SETTLEMENT || "0x518D4798c3Be707D5331A8E4EB6Be68F9b88406e",
  zkRemitCore: process.env.NEXT_PUBLIC_ZKREMIT_CORE || "0xF53724F3Ec0E954f1EdcEe9bCb01AE5FD385d912",
  usdt: process.env.NEXT_PUBLIC_USDT || "0xa9aB92ade910e066e3d8012b2544dFBC479576D9",
  deployer: "0x15640DCF8b417aE491f3CE028a9518C8B8754438",
};

const RPC_URL = process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz";

let _provider: ethers.JsonRpcProvider | null = null;
let _hsp: ethers.Contract | null = null;
let _zkRemit: ethers.Contract | null = null;

export function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return _provider;
}

export function getHSP() {
  if (!_hsp) {
    _hsp = new ethers.Contract(DEPLOYMENT.hspSettlement, HSP_ABI, getProvider());
  }
  return _hsp;
}

export function getZKRemit() {
  if (!_zkRemit) {
    _zkRemit = new ethers.Contract(DEPLOYMENT.zkRemitCore, ZKREMIT_ABI, getProvider());
  }
  return _zkRemit;
}

export function getDeployment() {
  return DEPLOYMENT;
}
