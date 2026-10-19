import * as React from "react";

import { cn } from "./cn";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-xs font-medium tracking-wide text-fg-soft uppercase", className)}
      {...props}
    />
  );
}

const control =
  "w-full rounded-xl border border-line bg-bg/60 px-3.5 py-2.5 text-sm text-fg transition-colors placeholder:text-fg-faint focus:border-accent/60 focus:outline-none disabled:opacity-50";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-20 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}

/** Monospace control for amounts and addresses. */
export function CodeInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "font-mono tracking-tight", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-faint">{hint}</p>
      ) : null}
    </div>
  );
}
