import { NETWORK } from "./network";

export const explorer = {
  tx: (hash: string) => `${NETWORK.explorer}/tx/${hash}`,
  account: (address: string) => `${NETWORK.explorer}/account/${address}`,
  contract: (id: string) => `${NETWORK.explorer}/contract/${id}`,
};
