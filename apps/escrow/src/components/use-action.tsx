"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TxLink } from "@vku/ui";
import { explorer } from "@vku/stellar/server";

import { describeError } from "@/lib/errors";

export interface ActionResult {
  hash: string | null;
  message: string;
}

/**
 * One place for the shape every on chain action takes: run it, show the
 * transaction link, pull fresh state from the ledger.
 */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, action: () => Promise<ActionResult | void>) => {
      setBusy(key);
      try {
        const outcome = await action();
        if (outcome) {
          toast.success(outcome.message, {
            duration: 9000,
            description: outcome.hash ? (
              <TxLink href={explorer.tx(outcome.hash)}>Xem giao dịch trên Stellar Expert</TxLink>
            ) : undefined,
          });
        }
        router.refresh();
      } catch (caught) {
        toast.error(describeError(caught));
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  return { busy, run };
}
