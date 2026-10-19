import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

import "./globals.css";

const sans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Chốt Job: nhận việc freelance không sợ bị bùng",
    template: "%s · Chốt Job",
  },
  description:
    "Hợp đồng giữ tiền trên Stellar testnet: khách khoá tiền trước, trả theo từng mốc, và hai cái đồng hồ giữ cho cả hai bên thật thà.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
