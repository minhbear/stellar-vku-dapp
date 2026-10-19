import * as React from "react";

import { cn } from "./cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} {...props} />;
}

export function Empty({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="text-fg-faint [&_svg]:size-7">{icon}</div> : null}
      <div>
        <p className="font-medium">{title}</p>
        {body ? <p className="mt-1 max-w-sm text-sm text-fg-soft">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: "neutral" | "accent" | "warn" | "danger" | "ok";
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-surface-2/60 text-fg-soft",
    accent: "border-accent/30 bg-accent-soft text-fg",
    warn: "border-warn/30 bg-warn/10 text-fg",
    danger: "border-danger/30 bg-danger/10 text-fg",
    ok: "border-ok/30 bg-ok/10 text-fg",
  } as const;

  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={cn(title && "mt-1 text-fg-soft")}>{children}</div>
    </div>
  );
}
