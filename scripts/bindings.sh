#!/usr/bin/env bash
# Regenerates the TypeScript clients from the built wasm files.
set -euo pipefail

cd "$(dirname "$0")/.."
(cd contracts && cargo build --release --target wasm32v1-none)
WASM_DIR=contracts/target/wasm32v1-none/release

for name in sharebill escrow; do
  stellar contract bindings typescript \
    --wasm "$WASM_DIR/$name.wasm" \
    --output-dir "packages/$name-client" \
    --overwrite
done

echo
echo "Clients regenerated. Re-apply the package.json tweaks if the generator"
echo "overwrote them: name @vku/<name>-client, main and types pointing at"
echo "./src/index.ts, and @stellar/stellar-sdk ^17."
