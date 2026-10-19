import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-fg-soft",
        accent: "border-accent/30 bg-accent-soft text-accent",
        ok: "border-ok/30 bg-ok/12 text-ok",
        warn: "border-warn/30 bg-warn/12 text-warn",
        danger: "border-danger/30 bg-danger/12 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
