/** Everything about the chain these dapps talk to. Testnet only, on purpose. */
export const NETWORK = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  passphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  /** Shown to the user when their wallet is pointed somewhere else. */
  label: "Testnet",
  explorer: "https://stellar.expert/explorer/testnet",
} as const;

/**
 * Reading contract state is a simulated transaction, and a simulation still
 * needs a source account. Nothing is signed and nothing is spent, so any
 * funded account does: this one is the contract deployer.
 */
export const READ_ONLY_ACCOUNT =
  process.env.NEXT_PUBLIC_READONLY_ACCOUNT ??
  "GCUAKE3Y445GM25YXKBYCROT5K5HDV2UEQYLABANAZVBKBRYAAQFKFZV";

/** The Stellar Asset Contract for native XLM on testnet. */
export const XLM_SAC =
  process.env.NEXT_PUBLIC_TOKEN_ID ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const TOKEN_CODE = process.env.NEXT_PUBLIC_TOKEN_CODE ?? "XLM";
