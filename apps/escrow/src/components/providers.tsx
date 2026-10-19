"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { WalletProvider } from "@vku/stellar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
          },
        }}
      />
    </WalletProvider>
  );
}
