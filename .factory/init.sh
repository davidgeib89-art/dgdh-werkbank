#!/bin/sh
# Mission init script — idempotent
# Installs dependencies if node_modules is missing or stale

set -e

if [ ! -d "node_modules" ]; then
  echo "[init] Installing dependencies..."
  pnpm install
else
  echo "[init] Dependencies already installed."
fi
