import * as React from "react";
import { ArrowUpRight, Database, Link2 } from "lucide-react";

import { cn } from "./cn";

/**
 * Says where a piece of this screen actually lives. The whole point of the
 * class is that students can tell the two halves apart, so every card that
 * shows data carries one of these.
 */
export function SourceTag({
  kind,
  className,
  label,
}: {
  kind: "chain" | "off";
  label?: string;
  className?: string;
}) {
  const onChain = kind === "chain";
  const Icon = onChain ? Link2 : Database;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] tracking-tight",
        onChain
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-line bg-surface-2 text-off",
        className,
      )}
      title={
        onChain
          ? "Dữ liệu này nằm trên blockchain, ai cũng kiểm tra được"
          : "Dữ liệu này nằm trong database của app"
      }
    >
      <Icon className="size-3" aria-hidden="true" />
      {label ?? (onChain ? "on-chain" : "off-chain")}
    </span>
  );
}

export function TxLink({
  href,
  children,
  className,
}: {
  href: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1 text-xs text-accent underline-offset-4 hover:underline",
        className,
      )}
    >
      {children ?? "Xem trên Stellar Expert"}
      <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
