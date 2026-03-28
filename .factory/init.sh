#!/bin/bash
# DGDH Mission Environment Setup
# Idempotent initialization for worker sessions

set -e

echo "=== DGDH Mission Environment Setup ==="

# Check Node version
node_version=$(node --version 2>/dev/null || echo "none")
if [ "$node_version" = "none" ]; then
    echo "ERROR: Node.js not found"
    exit 1
fi
echo "Node version: $node_version"

# Check pnpm
pnpm_version=$(pnpm --version 2>/dev/null || echo "none")
if [ "$pnpm_version" = "none" ]; then
    echo "ERROR: pnpm not found"
    exit 1
fi
echo "pnpm version: $pnpm_version"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ package.json -nt node_modules/.package-lock ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Verify workspace
if [ -f "pnpm-workspace.yaml" ]; then
    echo "Workspace verified: pnpm-workspace.yaml found"
fi

# Check runtime connectivity
echo "Checking runtime connectivity on port 3100..."
if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
    echo "✓ Runtime 3100 is healthy"
else
    echo "⚠ Runtime 3100 not responding (may need to start)"
fi

echo "=== Setup complete ==="
