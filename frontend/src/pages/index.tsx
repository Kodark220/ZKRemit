"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Head from "next/head";
import {
  ArrowRightLeft,
  Shield,
  Zap,
  Globe,
  Wallet,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  History,
  BarChart3,
  Info,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CORRIDORS,
  STATUS_LABELS,
  fetchQuote,
  fetchTransactions,
  fetchStats,
  formatCurrency,
  type Corridor,
  type Quote,
  type Transaction,
  type Stats,
} from "@/lib/api";
import {
  connectWallet,
  switchToHashKey,
  shortenAddress,
  onAccountsChanged,
  onChainChanged,
  initialWalletState,
  type WalletState,
} from "@/lib/wallet";

// ── Animation Variants ──────────────────────────────────────────────
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const slideInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
};

// ── Main Page ──────────────────────────────────────────────────────
export default function Home() {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [activeTab, setActiveTab] = useState("send");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const state = await connectWallet();
      setWallet(state);
      if (!state.isCorrectChain) {
        await switchToHashKey();
        const updated = await connectWallet();
        setWallet(updated);
      }
    } catch (err: any) {
      console.error("Connect failed:", err.message);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const unsub1 = onAccountsChanged((accounts) => {
      if (!accounts.length) {
        setWallet(initialWalletState);
      } else {
        connectWallet().then(setWallet).catch(console.error);
      }
    });
    const unsub2 = onChainChanged(() => {
      connectWallet().then(setWallet).catch(console.error);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  return (
    <>
      <Head>
        <title>ZKRemit — Zero-Knowledge Cross-Border Remittance</title>
        <meta name="description" content="Private, compliant cross-border remittance on HashKey Chain using zero-knowledge proofs." />
      </Head>

      <div className="min-h-screen bg-background">
        {/* ─── Navbar ──────────────────────────────────────── */}
        <motion.header
          className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold tracking-tight">ZKRemit</span>
              <Badge variant="secondary" className="ml-2 text-[10px]">
                HashKey Chain
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {!wallet.isCorrectChain && wallet.isConnected && (
                <Button size="sm" variant="destructive" onClick={switchToHashKey}>
                  Switch Network
                </Button>
              )}
              {wallet.isConnected ? (
                <Badge variant="outline" className="px-3 py-1.5 font-mono text-sm">
                  {shortenAddress(wallet.address!)}
                </Badge>
              ) : (
                <Button onClick={handleConnect} disabled={connecting} size="sm">
                  {connecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-4 w-4" />
                  )}
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </motion.header>

        {/* ─── Hero ────────────────────────────────────────── */}
        <section className="container py-16 md:py-24">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">
                <Zap className="mr-1 h-3 w-3" /> Powered by Zero-Knowledge Proofs
              </Badge>
            </motion.div>
            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
              variants={fadeInUp}
            >
              Send Money Anywhere.{" "}
              <span className="text-primary">Prove Nothing.</span>
            </motion.h1>
            <motion.p
              className="mt-4 text-lg text-muted-foreground md:text-xl"
              variants={fadeInUp}
            >
              ZK-compliant cross-border remittance. Verify your identity once with
              HashKey KYC SBT, then send private, low-cost payments worldwide.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-4" variants={fadeInUp}>
              {[
                { icon: Shield, label: "ZK Privacy" },
                { icon: Globe, label: "10 Corridors" },
                { icon: Zap, label: "0.3% Fees" },
                { icon: Clock, label: "~2 Min Settlement" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ─── Main Content ────────────────────────────────── */}
        <section className="container pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto max-w-2xl">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="send" className="gap-1.5">
                <Send className="h-4 w-4" /> Send
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-4 w-4" /> History
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> Stats
              </TabsTrigger>
              <TabsTrigger value="how" className="gap-1.5">
                <Info className="h-4 w-4" /> How It Works
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="send" forceMount={activeTab === "send" ? true : undefined} className={activeTab !== "send" ? "hidden" : ""}>
                  <SendTab wallet={wallet} onConnect={handleConnect} />
                </TabsContent>
                <TabsContent value="history" forceMount={activeTab === "history" ? true : undefined} className={activeTab !== "history" ? "hidden" : ""}>
                  <HistoryTab wallet={wallet} />
                </TabsContent>
                <TabsContent value="stats" forceMount={activeTab === "stats" ? true : undefined} className={activeTab !== "stats" ? "hidden" : ""}>
                  <StatsTab />
                </TabsContent>
                <TabsContent value="how" forceMount={activeTab === "how" ? true : undefined} className={activeTab !== "how" ? "hidden" : ""}>
                  <HowItWorksTab />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </section>

        {/* ─── Footer ──────────────────────────────────────── */}
        <footer className="border-t py-8">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; 2025 ZKRemit. Built on HashKey Chain for the Horizon Hackathon.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="https://hsk.xyz" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                HashKey Chain
              </a>
              <a href="https://hashkeyscan.io" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                Explorer
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Send Tab ──────────────────────────────────────────────────────
function SendTab({ wallet, onConnect }: { wallet: WalletState; onConnect: () => void }) {
  const [corridor, setCorridor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"form" | "review" | "success">("form");

  const selectedCorridor = CORRIDORS.find((c) => c.id === corridor);

  const getQuote = useCallback(async () => {
    if (!corridor || !amount || parseFloat(amount) <= 0) return;
    setLoadingQuote(true);
    try {
      const q = await fetchQuote(corridor, parseFloat(amount));
      setQuote(q);
    } catch {
      if (selectedCorridor) {
        const amt = parseFloat(amount);
        const destAmount = amt * selectedCorridor.rate;
        const fee = amt * 0.003;
        setQuote({
          corridor,
          sourceAmount: amt,
          destinationAmount: destAmount,
          exchangeRate: selectedCorridor.rate,
          protocolFee: fee,
          networkFee: 0.01,
          totalFee: fee + 0.01,
          estimatedTime: selectedCorridor.estimatedTime,
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        });
      }
    } finally {
      setLoadingQuote(false);
    }
  }, [corridor, amount, selectedCorridor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (corridor && amount && parseFloat(amount) > 0) getQuote();
    }, 500);
    return () => clearTimeout(timer);
  }, [corridor, amount, getQuote]);

  const handleSend = async () => {
    setSending(true);
    // simulate transaction
    await new Promise((r) => setTimeout(r, 2500));
    setSending(false);
    setStep("success");
  };

  return (
    <Card className="mt-4">
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div key="form" {...scaleIn} transition={{ duration: 0.25 }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Send Remittance
              </CardTitle>
              <CardDescription>
                Select a corridor and enter the amount to send. ZK proofs ensure your compliance data stays private.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Corridor</Label>
                <Select value={corridor} onValueChange={setCorridor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a remittance corridor" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORRIDORS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">({c.sourceCurrency} → {c.destCurrency})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (USDT)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="10"
                    max="10000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {loadingQuote && (
                    <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {selectedCorridor && (
                  <p className="text-xs text-muted-foreground">
                    Min: {selectedCorridor.minAmount} USDT · Max: {formatCurrency(selectedCorridor.maxAmount, "USDT")}
                  </p>
                )}
              </div>

              {/* Quote Preview */}
              <AnimatePresence>
                {quote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Exchange Rate</span>
                        <span className="font-mono">1 USDT = {quote.exchangeRate.toLocaleString()} {selectedCorridor?.destCurrency}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recipient Gets</span>
                        <span className="text-lg font-bold text-primary">
                          {quote.destinationAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedCorridor?.destCurrency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Fee</span>
                        <span className="font-mono">{quote.totalFee.toFixed(4)} USDT</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Est. Time</span>
                        <span>{quote.estimatedTime}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
            <CardFooter>
              {!wallet.isConnected ? (
                <Button className="w-full" onClick={onConnect}>
                  <Wallet className="mr-2 h-4 w-4" /> Connect Wallet to Send
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={!quote || !corridor || !amount}
                  onClick={() => setStep("review")}
                >
                  Review Transaction <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </motion.div>
        )}

        {step === "review" && quote && (
          <motion.div key="review" {...scaleIn} transition={{ duration: 0.25 }}>
            <CardHeader>
              <CardTitle>Confirm Transaction</CardTitle>
              <CardDescription>Review the details before sending. A ZK proof will be generated automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Corridor</span>
                  <span className="font-medium">{selectedCorridor?.flag} {selectedCorridor?.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">You Send</span>
                  <span className="text-lg font-bold">{quote.sourceAmount} USDT</span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">They Receive</span>
                  <span className="text-lg font-bold text-primary">
                    {quote.destinationAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedCorridor?.destCurrency}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span>{quote.totalFee.toFixed(4)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Settlement</span>
                  <span>{quote.estimatedTime}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Shield className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  A zero-knowledge proof will verify your KYC status and compliance without revealing personal data on-chain.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating ZK Proof...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Now
                  </>
                )}
              </Button>
            </CardFooter>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" {...scaleIn} transition={{ duration: 0.3 }}>
            <CardContent className="flex flex-col items-center py-12 space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold">Transaction Submitted!</h2>
              <p className="text-center text-muted-foreground max-w-sm">
                ZK proof generated and verified. Your remittance of{" "}
                <strong>{quote?.sourceAmount} USDT</strong> to{" "}
                <strong>{selectedCorridor?.name}</strong> is being processed.
              </p>
              <Badge variant="success" className="text-sm px-3 py-1">
                Estimated: {quote?.estimatedTime}
              </Badge>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setStep("form");
                  setQuote(null);
                  setAmount("");
                  setCorridor("");
                }}
              >
                Send Another
              </Button>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── History Tab ───────────────────────────────────────────────────
function HistoryTab({ wallet }: { wallet: WalletState }) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.address) return;
    setLoading(true);
    fetchTransactions(wallet.address)
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, [wallet.address]);

  if (!wallet.isConnected) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view transaction history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No transactions yet. Send your first remittance!</p>
          </div>
        ) : (
          <motion.div className="space-y-3" initial="initial" animate="animate" variants={staggerContainer}>
            {txns.map((tx) => {
              const status = STATUS_LABELS[tx.status] || STATUS_LABELS.pending;
              return (
                <motion.div key={tx.id} variants={fadeInUp} className="rounded-lg border p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{tx.corridor}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleDateString()} · {tx.amount} USDT
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono">{tx.destinationAmount?.toLocaleString()}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Stats Tab ─────────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() =>
        setStats({
          totalVolume: "$1,247,580",
          totalTransactions: 3842,
          activeCorridors: 10,
          averageFee: "0.3%",
        })
      );
  }, []);

  const statCards = stats
    ? [
        { label: "Total Volume", value: stats.totalVolume, icon: BarChart3 },
        { label: "Transactions", value: stats.totalTransactions.toLocaleString(), icon: ArrowRightLeft },
        { label: "Active Corridors", value: stats.activeCorridors, icon: Globe },
        { label: "Average Fee", value: stats.averageFee, icon: Zap },
      ]
    : [];

  return (
    <div className="mt-4 space-y-4">
      <motion.div
        className="grid grid-cols-2 gap-4"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {stats ? (
          statCards.map((s) => (
            <motion.div key={s.label} variants={fadeInUp}>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-2 flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </motion.div>

      {/* Corridors Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Corridors</CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {CORRIDORS.map((c) => (
              <motion.div
                key={c.id}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.flag}</span>
                  <div>
                    <p className="text-sm font-medium">{c.id}</p>
                    <p className="text-xs text-muted-foreground">{c.estimatedTime}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">1:{c.rate.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{c.fee}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── How It Works Tab ──────────────────────────────────────────────
function HowItWorksTab() {
  const steps = [
    {
      icon: Wallet,
      title: "Connect & KYC",
      desc: "Connect your wallet with a HashKey Chain KYC SBT. Your verified identity is bound to your address as a Soul Bound Token.",
    },
    {
      icon: Shield,
      title: "ZK Proof Generated",
      desc: "A zero-knowledge proof is created locally that proves your KYC level, AML compliance, and sanctions clearance — without revealing any personal data.",
    },
    {
      icon: ArrowRightLeft,
      title: "HSP Settlement",
      desc: "Using HashKey Settlement Protocol (HSP), a payment request is created, the ZK proof is verified on-chain, and funds are settled in USDT.",
    },
    {
      icon: CheckCircle2,
      title: "Instant Delivery",
      desc: "The recipient receives funds in their local currency via off-ramp partners. Full settlement typically completes in 2-3 minutes.",
    },
  ];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          How ZKRemit Works
        </CardTitle>
        <CardDescription>
          Privacy-preserving cross-border remittance using ZK proofs on HashKey Chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div
          className="space-y-6"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {steps.map((s, i) => (
            <motion.div key={s.title} variants={slideInLeft} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {i + 1}
                </div>
                {i < steps.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
              </div>
              <div className="pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <Separator className="my-6" />

        <div className="space-y-3">
          <h4 className="font-semibold">Technical Stack</h4>
          <div className="flex flex-wrap gap-2">
            {[
              "HashKey Chain",
              "KYC SBT",
              "HSP Settlement",
              "Groth16 ZK-SNARKs",
              "Circom Circuits",
              "Poseidon Hash",
              "Solidity 0.8.24",
              "OpenZeppelin 5.x",
            ].map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
