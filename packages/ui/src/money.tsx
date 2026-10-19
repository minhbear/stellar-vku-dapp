import * as React from "react";

import { cn } from "./cn";

/** One place decides how money looks, so every screen agrees. */
export function Amount({
  value,
  code,
  size = "md",
  tone = "default",
  className,
}: {
  value: string;
  code?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "accent" | "ok" | "warn" | "danger" | "soft";
  className?: string;
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
    xl: "text-4xl",
  } as const;
  const tones = {
    default: "text-fg",
    accent: "text-accent",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
    soft: "text-fg-soft",
  } as const;

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums tracking-tight",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {value}
      {code ? <span className="ml-1 text-[0.7em] font-medium text-fg-faint">{code}</span> : null}
    </span>
  );
}

export function Stat({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-bg/40 px-4 py-3", className)}>
      <p className="text-[11px] font-medium tracking-wide text-fg-faint uppercase">{label}</p>
      <div className="mt-1">{children}</div>
      {hint ? <div className="mt-1 text-xs text-fg-faint">{hint}</div> : null}
    </div>
  );
}
