import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    <div className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
      <TooltipProvider>
        <Component {...pageProps} />
      </TooltipProvider>
    </div>
  );
}
