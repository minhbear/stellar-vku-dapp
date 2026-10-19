import * as React from "react";

import { cn } from "./cn";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-5xl px-4 sm:px-6", className)} {...props} />;
}

export function TopBar({
  brand,
  actions,
  className,
}: {
  brand: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-lg",
        className,
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        {brand}
        <div className="flex items-center gap-2">{actions}</div>
      </Container>
    </header>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 flex items-center gap-2">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {lede ? <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-fg-soft">{lede}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  note,
  right,
  className,
}: {
  title: string;
  note?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-wide text-fg-soft uppercase">{title}</h2>
        {note ? <p className="mt-1 text-sm text-fg-faint">{note}</p> : null}
      </div>
      {right}
    </div>
  );
}

/** Vertical timeline. Each row brings its own dot so apps can colour states. */
export function Timeline({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ol className={cn("flex flex-col", className)}>{children}</ol>;
}

export function TimelineItem({
  dot,
  last,
  children,
  className,
  dotSize = 36,
}: {
  dot: React.ReactNode;
  last?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Pixel size of the dot, so the connecting line lands in its centre. */
  dotSize?: number;
}) {
  return (
    <li
      className={cn("relative flex gap-4 pb-5 last:pb-0", className)}
      style={{ "--dot": `${dotSize}px` } as React.CSSProperties}
    >
      {last ? null : (
        <span
          className="absolute top-[calc(var(--dot)+6px)] left-[calc(var(--dot)/2-0.5px)] h-[calc(100%-var(--dot)-6px)] w-px bg-line"
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 shrink-0">{dot}</span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </li>
  );
}
