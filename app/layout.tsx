import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/shared/NavBar";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
        "dark",
      )}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <NavBar />
          {children}
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
