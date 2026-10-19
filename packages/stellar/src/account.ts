import { toStroops } from "./amount";

const HORIZON = process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const FRIENDBOT = process.env.NEXT_PUBLIC_FRIENDBOT_URL ?? "https://friendbot.stellar.org";

/** Native XLM balance in stroops, or null when the account does not exist yet. */
export async function fetchXlmBalance(address: string): Promise<bigint | null> {
  const response = await fetch(`${HORIZON}/accounts/${address}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Không đọc được số dư");

  const body = (await response.json()) as {
    balances?: { asset_type?: string; balance?: string }[];
  };
  const native = body.balances?.find((entry) => entry.asset_type === "native");
  return native?.balance ? toStroops(native.balance) : 0n;
}

/** Testnet only: asks friendbot for 10000 test XLM. */
export async function fundWithFriendbot(address: string): Promise<void> {
  const response = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(address)}`);
  if (!response.ok && response.status !== 400) {
    throw new Error("Friendbot từ chối, thử lại sau");
  }
}
