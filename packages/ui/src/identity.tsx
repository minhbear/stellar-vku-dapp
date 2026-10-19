"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "./cn";

/** Same address always gets the same colour, so people recognise each other. */
function hueOf(seed: string): number {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) {
    total = (total + seed.charCodeAt(index) * (index + 7)) % 360;
  }
  return total;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({
  seed,
  name,
  size = "md",
  className,
}: {
  seed: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hue = hueOf(seed);
  const sizes = { sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-12 text-sm" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold",
        sizes[size],
        className,
      )}
      style={{
        background: `oklch(0.35 0.09 ${hue})`,
        borderColor: `oklch(0.62 0.14 ${hue})`,
        color: `oklch(0.94 0.05 ${hue})`,
      }}
      title={name ?? seed}
    >
      {initialsOf(name ?? seed.slice(1, 3))}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 5,
  className,
}: {
  people: { seed: string; name?: string }[];
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  return (
    <span className={cn("inline-flex items-center", className)}>
      {shown.map((person) => (
        <Avatar
          key={person.seed}
          seed={person.seed}
          name={person.name}
          size="sm"
          className="-ml-2 ring-2 ring-surface first:ml-0"
        />
      ))}
      {hidden > 0 ? (
        <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full border border-line bg-surface-2 text-[10px] font-medium text-fg-soft ring-2 ring-surface">
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}

export function CopyButton({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
      aria-label={label ?? "Copy"}
    >
      {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      {label}
    </button>
  );
}

export function AddressChip({
  address,
  href,
  className,
  short = 4,
}: {
  address: string;
  href?: string;
  className?: string;
  short?: number;
}) {
  const text =
    address.length > short * 2 + 3
      ? `${address.slice(0, short)}...${address.slice(-short)}`
      : address;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg-soft transition-colors hover:text-accent"
          title={address}
        >
          {text}
        </a>
      ) : (
        <span
          className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg-soft"
          title={address}
        >
          {text}
        </span>
      )}
      <CopyButton value={address} />
    </span>
  );
}
