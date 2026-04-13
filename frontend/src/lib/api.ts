const API_BASE = "";

export interface Corridor {
  id: string;
  name: string;
  source: string;
  destination: string;
  sourceCurrency: string;
  destCurrency: string;
  rate: number;
  minAmount: number;
  maxAmount: number;
  fee: string;
  estimatedTime: string;
  flag: string;
}

export interface Quote {
  corridor: string;
  sourceAmount: number;
  destinationAmount: number;
  exchangeRate: number;
  protocolFee: number;
  networkFee: number;
  totalFee: number;
  estimatedTime: string;
  expiresAt: string;
}

export interface Transaction {
  id: string;
  corridor: string;
  amount: number;
  destinationAmount: number;
  status: string;
  timestamp: string;
  txHash?: string;
}

export interface Stats {
  totalVolume: string;
  totalTransactions: number;
  activeCorridors: number;
  averageFee: string;
}

export const CORRIDORS: Corridor[] = [
  { id: "HK-PH", name: "Hong Kong → Philippines", source: "HK", destination: "PH", sourceCurrency: "USDT", destCurrency: "PHP", rate: 56.2, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~2 min", flag: "🇵🇭" },
  { id: "HK-ID", name: "Hong Kong → Indonesia", source: "HK", destination: "ID", sourceCurrency: "USDT", destCurrency: "IDR", rate: 15890, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~2 min", flag: "🇮🇩" },
  { id: "HK-TH", name: "Hong Kong → Thailand", source: "HK", destination: "TH", sourceCurrency: "USDT", destCurrency: "THB", rate: 35.8, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~2 min", flag: "🇹🇭" },
  { id: "HK-VN", name: "Hong Kong → Vietnam", source: "HK", destination: "VN", sourceCurrency: "USDT", destCurrency: "VND", rate: 24850, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~2 min", flag: "🇻🇳" },
  { id: "HK-IN", name: "Hong Kong → India", source: "HK", destination: "IN", sourceCurrency: "USDT", destCurrency: "INR", rate: 83.2, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~3 min", flag: "🇮🇳" },
  { id: "HK-PK", name: "Hong Kong → Pakistan", source: "HK", destination: "PK", sourceCurrency: "USDT", destCurrency: "PKR", rate: 278.5, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~3 min", flag: "🇵🇰" },
  { id: "HK-BD", name: "Hong Kong → Bangladesh", source: "HK", destination: "BD", sourceCurrency: "USDT", destCurrency: "BDT", rate: 109.8, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~3 min", flag: "🇧🇩" },
  { id: "HK-NP", name: "Hong Kong → Nepal", source: "HK", destination: "NP", sourceCurrency: "USDT", destCurrency: "NPR", rate: 133.2, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~3 min", flag: "🇳🇵" },
  { id: "HK-LK", name: "Hong Kong → Sri Lanka", source: "HK", destination: "LK", sourceCurrency: "USDT", destCurrency: "LKR", rate: 312.5, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~3 min", flag: "🇱🇰" },
  { id: "HK-NG", name: "Hong Kong → Nigeria", source: "HK", destination: "NG", sourceCurrency: "USDT", destCurrency: "NGN", rate: 1580, minAmount: 10, maxAmount: 10000, fee: "0.3%", estimatedTime: "~3 min", flag: "🇳🇬" },
];

export const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  pending: { label: "Pending", variant: "warning" },
  proof_submitted: { label: "Proof Submitted", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  settled: { label: "Settled", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchCorridors(): Promise<Corridor[]> {
  try {
    const data = await apiFetch<{ corridors: Corridor[] }>("/api/corridors");
    return data.corridors;
  } catch {
    return CORRIDORS;
  }
}

export async function fetchQuote(corridor: string, amount: number): Promise<Quote> {
  return apiFetch<Quote>(`/api/quote?corridor=${encodeURIComponent(corridor)}&amount=${amount}`);
}

export async function fetchTransactions(address: string): Promise<Transaction[]> {
  return apiFetch<{ transactions: Transaction[] }>(`/api/transactions/${encodeURIComponent(address)}`).then(
    (d) => d.transactions
  );
}

export async function fetchStats(): Promise<Stats> {
  return apiFetch<Stats>("/api/stats");
}

export function formatCurrency(amount: number, currency: string): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M ${currency}`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}
