import type { ReactNode } from "react";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { Container, TopBar, TxLink } from "@vku/ui";
import { NetworkBadge, WalletButton } from "@vku/stellar";
import { explorer } from "@vku/stellar/server";

import { CONTRACT_ID } from "@/lib/env";

const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_URL;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        brand={
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Handshake className="size-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-semibold">Chốt Job</span>
              <span className="text-[11px] text-fg-faint">Nhận việc không sợ bị bùng</span>
            </span>
          </Link>
        }
        actions={
          <>
            <span className="hidden sm:block">
              <NetworkBadge />
            </span>
            <WalletButton />
          </>
        }
      />

      <main className="flex-1 py-8 sm:py-12">
        <Container>{children}</Container>
      </main>

      <footer className="border-t border-line/70 py-8">
        <Container className="flex flex-col gap-3 text-xs text-fg-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            Chạy trên Stellar testnet. XLM trong app là tiền thử nghiệm, không có giá trị thật.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <TxLink href={explorer.contract(CONTRACT_ID)}>Hợp đồng trên Stellar Expert</TxLink>
            {COURSE_URL ? (
              <a
                href={COURSE_URL}
                className="transition-colors hover:text-fg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Khoá học Stellar x VKU
              </a>
            ) : null}
          </div>
        </Container>
      </footer>
    </div>
  );
}
