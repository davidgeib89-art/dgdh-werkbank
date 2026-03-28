#!/bin/bash
# DGDH Cleanup Mission Init Script
# Idempotent setup for cleanup mission

set -e

echo "=== DGDH Cleanup Mission Init ==="

# Check Node version
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js >=20 required, found $(node --version)"
    exit 1
fi

echo "✓ Node.js $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "ERROR: pnpm not found"
    exit 1
fi

echo "✓ pnpm $(pnpm --version)"

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

echo "✓ Dependencies installed"

# Check for .env file (for DB access if needed)
if [ -f ".env" ]; then
    echo "✓ .env file present (for DB access if needed)"
else
    echo "ℹ No .env file (API/CLI preferred anyway)"
fi

echo "=== Init Complete ==="
