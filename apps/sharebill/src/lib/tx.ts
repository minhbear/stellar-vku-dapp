import type { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import { NETWORK } from "@vku/stellar/server";

import { CONTRACT_ID } from "./env";

/**
 * A client that can sign. The SDK is imported on demand so it stays out of the
 * first page load: nothing on screen needs it until the user acts.
 */
export async function writeClient(address: string, sign: (xdr: string) => Promise<string>) {
  const { Client } = await import("@vku/sharebill-client");
  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.rpcUrl,
    publicKey: address,
    signTransaction: async (xdr: string) => ({
      signedTxXdr: await sign(xdr),
      signerAddress: address,
    }),
  });
}

/** Signs, sends, waits, then hands back the hash and the contract's answer. */
export async function send<T>(
  tx: AssembledTransaction<T>,
): Promise<{ hash: string | null; result: T }> {
  const sent = await tx.signAndSend();
  return { hash: sent.sendTransactionResponse?.hash ?? null, result: sent.result };
}

export const ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;
export const CONTRACT_PATTERN = /^C[A-Z2-7]{55}$/;

export function isAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}
