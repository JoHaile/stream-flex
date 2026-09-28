import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/shared/NavBar";
import { Analytics } from "@vercel/analytics/react";

// Inter is the only family any rule resolves to, so it is the only one loaded.
// Geist and Geist_Mono were downloaded on every page view but referenced by no
// token, since `--font-sans` self-referenced and `--font-mono` was never used.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StreamFlix",
  description:
    "StreamFlix lets you discover, browse, and explore movies and TV series. Powered by TMDB.",
  openGraph: {
    title: "StreamFlix",
    description:
      "StreamFlix lets you discover, browse, and explore movies and TV series. Powered by TMDB.",
    type: "website",
    siteName: "StreamFlix",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", inter.variable, "dark")}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <NavBar />
          <div className="flex-1">{children}</div>
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
