"use client";

import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "./cn";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm data-[state=open]:animate-rise" />
        <Primitive.Content
          className={cn(
            "card-shadow fixed top-1/2 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-6 data-[state=open]:animate-rise",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Primitive.Title className="text-lg font-semibold">{title}</Primitive.Title>
              {description ? (
                <Primitive.Description className="mt-1 text-sm leading-relaxed text-fg-soft">
                  {description}
                </Primitive.Description>
              ) : null}
            </div>
            <Primitive.Close
              className="-mt-1 -mr-1 rounded-lg p-2 text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </Primitive.Close>
          </div>
          {children ? <div className="mt-5 flex flex-col gap-4">{children}</div> : null}
          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
