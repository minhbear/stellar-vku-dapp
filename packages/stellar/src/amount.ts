import { TOKEN_CODE } from "./network";

/** Stellar amounts carry seven decimal places. */
export const DECIMALS = 7n;
const SCALE = 10_000_000n;

/** "12.5" -> 125000000n. Throws on anything that is not a positive amount. */
export function toStroops(input: string): bigint {
  const cleaned = input.trim().replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    throw new Error("Số tiền không hợp lệ");
  }
  const [whole, fraction = ""] = cleaned.split(".");
  if (fraction.length > Number(DECIMALS)) {
    throw new Error("Tối đa 7 số thập phân");
  }
  const padded = fraction.padEnd(Number(DECIMALS), "0");
  return BigInt(whole || "0") * SCALE + BigInt(padded || "0");
}

/** 125000000n -> "12.5". Never goes through Number, so nothing is rounded. */
export function fromStroops(value: bigint | string): string {
  const raw = typeof value === "string" ? BigInt(value) : value;
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const whole = abs / SCALE;
  const fraction = (abs % SCALE).toString().padStart(Number(DECIMALS), "0").replace(/0+$/, "");
  const text = fraction ? `${whole}.${fraction}` : whole.toString();
  return negative ? `-${text}` : text;
}

/** Grouped for reading: 1234500000n -> "123.45" with thousands separators. */
export function formatAmount(value: bigint | string): string {
  const text = fromStroops(value);
  const [whole, fraction] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? `${grouped},${fraction}` : grouped;
}

export function withCode(value: bigint | string): string {
  return `${formatAmount(value)} ${TOKEN_CODE}`;
}

export function shortAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}
