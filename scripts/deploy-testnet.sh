#!/usr/bin/env bash
# Deploys both contracts to testnet and records the addresses.
set -euo pipefail

cd "$(dirname "$0")/.."
SOURCE="${STELLAR_SOURCE:-vku-dapp}"

echo "Building contracts..."
(cd contracts && cargo build --release --target wasm32v1-none)

WASM_DIR=contracts/target/wasm32v1-none/release
SHAREBILL=$(stellar contract deploy --wasm "$WASM_DIR/sharebill.wasm" --source "$SOURCE" --network testnet | tail -1)
ESCROW=$(stellar contract deploy --wasm "$WASM_DIR/escrow.wasm" --source "$SOURCE" --network testnet | tail -1)
NATIVE=$(stellar contract id asset --asset native --network testnet)

mkdir -p deploy
cat > deploy/testnet.json <<JSON
{
  "network": "testnet",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "deployer": "$(stellar keys address "$SOURCE")",
  "sharebill": "$SHAREBILL",
  "escrow": "$ESCROW",
  "nativeSac": "$NATIVE",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo
echo "Share Bill: $SHAREBILL"
echo "Escrow:     $ESCROW"
echo "Remember to update NEXT_PUBLIC_CONTRACT_ID in both apps."
