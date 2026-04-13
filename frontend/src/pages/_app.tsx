import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from "@privy-io/react-auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmnx8ztqe00ex0dkzgt6i7qq5"}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
          logo: undefined,
        },
        loginMethods: ["wallet", "email", "google"],
        defaultChain: {
          id: 133,
          name: "HashKey Chain Testnet",
          network: "hashkey-testnet",
          nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
          rpcUrls: {
            default: { http: ["https://testnet.hsk.xyz"] },
            public: { http: ["https://testnet.hsk.xyz"] },
          },
          blockExplorers: {
            default: { name: "HashKeyScan", url: "https://testnet.hashkeyscan.io" },
          },
        },
        supportedChains: [
          {
            id: 133,
            name: "HashKey Chain Testnet",
            network: "hashkey-testnet",
            nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
            rpcUrls: {
              default: { http: ["https://testnet.hsk.xyz"] },
              public: { http: ["https://testnet.hsk.xyz"] },
            },
            blockExplorers: {
              default: { name: "HashKeyScan", url: "https://testnet.hashkeyscan.io" },
            },
          },
        ],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <div className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <TooltipProvider>
          <Component {...pageProps} />
        </TooltipProvider>
      </div>
    </PrivyProvider>
  );
}
