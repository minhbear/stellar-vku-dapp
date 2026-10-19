import * as React from "react";

import { cn } from "./cn";

/** Ratio in 0..1. Kept as a number only for drawing, never for money. */
export function Bar({
  ratio,
  tone = "accent",
  className,
}: {
  ratio: number;
  tone?: "accent" | "ok" | "warn" | "danger";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const tones = {
    accent: "bg-accent",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
  } as const;

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone])}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

export function Ring({
  ratio,
  size = 112,
  label,
  sub,
  className,
}: {
  ratio: number;
  size?: number;
  label?: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label}
        {sub ? <span className="text-[11px] text-fg-faint">{sub}</span> : null}
      </span>
    </div>
  );
}

/** Votes collected out of votes needed, drawn as dots. */
export function VoteDots({
  approved,
  total,
  needed,
  className,
}: {
  approved: number;
  total: number;
  needed: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-2.5 rounded-full border transition-colors",
            index < approved
              ? "border-accent bg-accent"
              : index < needed
                ? "border-accent/50 bg-transparent"
                : "border-line bg-transparent",
          )}
        />
      ))}
    </span>
  );
}
