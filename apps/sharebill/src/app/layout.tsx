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
    default: "Share Bill: hũ tiền chung cho chuyến đi",
    template: "%s · Share Bill",
  },
  description:
    "Hũ tiền chung trên Stellar testnet: góp không đều nhau, muốn chi phải được quá nửa nhóm đồng ý, hết chuyến thì chia đều và trả lại.",
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
