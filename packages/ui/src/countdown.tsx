"use client";

import * as React from "react";

import { cn } from "./cn";

function format(seconds: number): string {
  if (seconds <= 0) return "đã hết hạn";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds % 60} giây`;
  return `${seconds} giây`;
}

/**
 * Counts down to a ledger timestamp. Renders nothing on the server so the
 * markup cannot disagree with the client clock.
 */
export function Countdown({
  until,
  prefix = "còn",
  className,
  overdueClassName,
}: {
  until: number;
  prefix?: string;
  className?: string;
  overdueClassName?: string;
}) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (now === null) {
    return <span className={cn("font-mono text-xs text-fg-faint", className)}>...</span>;
  }

  const remaining = until - now;
  const overdue = remaining <= 0;

  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        overdue ? (overdueClassName ?? "text-danger") : "text-fg-soft",
        className,
      )}
    >
      {overdue ? format(0) : `${prefix} ${format(remaining)}`}
    </span>
  );
}

/** Absolute date in Vietnamese order, stable between server and client. */
export function DateText({ at, className }: { at: number; className?: string }) {
  const date = new Date(at * 1000);
  const text = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  return <span className={cn("font-mono text-xs text-fg-faint", className)}>{text}</span>;
}
