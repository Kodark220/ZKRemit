import { BrowserProvider, JsonRpcSigner } from "ethers";

const HASHKEY_TESTNET = {
  chainId: "0x85",
  chainName: "HashKey Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: ["https://testnet.hsk.xyz"],
  blockExplorerUrls: ["https://testnet.hashkeyscan.io"],
};

const HASHKEY_MAINNET = {
  chainId: "0xB1",
  chainName: "HashKey Chain",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: ["https://mainnet.hsk.xyz"],
  blockExplorerUrls: ["https://hashkeyscan.io"],
};

const TARGET_CHAIN = HASHKEY_TESTNET;

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectChain: boolean;
  signer: JsonRpcSigner | null;
}

export const initialWalletState: WalletState = {
  address: null,
  chainId: null,
  isConnected: false,
  isCorrectChain: false,
  signer: null,
};

function getEthereum(): any | null {
  if (typeof window !== "undefined") {
    return (window as any).ethereum ?? null;
  }
  return null;
}

export async function connectWallet(): Promise<WalletState> {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error("No wallet detected. Please install MetaMask.");

  const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts.length) throw new Error("No accounts found.");

  const chainIdHex: string = await ethereum.request({ method: "eth_chainId" });
  const chainId = parseInt(chainIdHex, 16);
  const isCorrectChain = chainIdHex.toLowerCase() === TARGET_CHAIN.chainId.toLowerCase();

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  return {
    address: accounts[0],
    chainId,
    isConnected: true,
    isCorrectChain,
    signer,
  };
}

export async function switchToHashKey(): Promise<void> {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error("No wallet detected.");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_CHAIN.chainId }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [TARGET_CHAIN],
      });
    } else {
      throw err;
    }
  }
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  const ethereum = getEthereum();
  if (!ethereum) return () => {};
  ethereum.on("accountsChanged", callback);
  return () => ethereum.removeListener("accountsChanged", callback);
}

export function onChainChanged(callback: (chainId: string) => void): () => void {
  const ethereum = getEthereum();
  if (!ethereum) return () => {};
  ethereum.on("chainChanged", callback);
  return () => ethereum.removeListener("chainChanged", callback);
}
