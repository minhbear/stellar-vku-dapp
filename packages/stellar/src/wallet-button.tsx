"use client";

import { Download, LogOut, Plus, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Notice } from "@vku/ui";

import { formatAmount } from "./amount";
import { NETWORK, TOKEN_CODE } from "./network";
import { useWallet } from "./wallet";

/** Connect, address, balance and the testnet faucet in one control. */
export function WalletButton() {
  const wallet = useWallet();

  if (wallet.status === "notInstalled") {
    return (
      <Button asChild variant="secondary" size="sm">
        <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">
          <Download />
          Cài Freighter
        </a>
      </Button>
    );
  }

  if (wallet.status !== "connected" || !wallet.address) {
    return (
      <Button size="sm" loading={wallet.connecting} onClick={() => void wallet.connect()}>
        <Wallet />
        Kết nối ví
      </Button>
    );
  }

  const low = wallet.balance !== null && wallet.balance < 50_000_000n;

  return (
    <div className="flex items-center gap-2">
      {low ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void wallet.fund()}
          title="Friendbot gửi 10000 XLM test"
        >
          <Plus />
          Nhận XLM test
        </Button>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5">
        <Avatar seed={wallet.address} size="sm" />
        <div className="hidden leading-tight sm:block">
          <p className="font-mono text-xs text-fg-soft">
            {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
          </p>
          <p className="font-mono text-[11px] text-fg-faint">
            {wallet.balance === null ? "..." : `${formatAmount(wallet.balance)} ${TOKEN_CODE}`}
          </p>
        </div>
        <button
          type="button"
          onClick={wallet.disconnect}
          className="rounded-lg p-1.5 text-fg-faint transition-colors hover:bg-surface-2 hover:text-danger"
          aria-label="Ngắt kết nối"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Shown when the wallet is pointed at the wrong network. */
export function NetworkWarning() {
  const wallet = useWallet();
  if (!wallet.networkMismatch) return null;

  return (
    <Notice tone="warn" title={`Ví đang ở mạng ${wallet.network ?? "khác"}`} className="mb-6">
      App này chỉ chạy trên {NETWORK.label}. Mở Freighter, đổi mạng sang Test Net rồi tải lại trang.
    </Notice>
  );
}

export function NetworkBadge() {
  return (
    <Badge tone="accent" className="font-mono">
      {NETWORK.label}
    </Badge>
  );
}
