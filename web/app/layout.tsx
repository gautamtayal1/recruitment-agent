import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Recruiter Agent — AI Interviews",
  description: "Run AI-powered technical phone interviews with real-time scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans bg-background text-foreground antialiased`}>

        <header className="sticky top-0 z-20 border-b border-[#E6E6E7] dark:border-white/10 bg-[rgb(var(--background))]/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md brand-mark flex items-center justify-center font-bold">AI</div>
              <span className="text-sm font-medium tracking-tight">Recruiter Agent</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/" className="px-4 py-2 text-sm rounded-full btn-secondary">Dashboard</Link>
              <Link href="/setup" className="px-4 py-2 text-sm rounded-full btn-primary">Custom Setup</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
