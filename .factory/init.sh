#!/bin/bash
# Factory init script for DGDH Runtime Cleanup Mission
# This script runs at the start of each worker session

set -e

echo "=== DGDH Runtime Cleanup Mission - Environment Setup ==="

# Verify git is accessible
if ! command -v git &> /dev/null; then
    echo "ERROR: git not found"
    exit 1
fi

# Verify pnpm is accessible
if ! command -v pnpm &> /dev/null; then
    echo "ERROR: pnpm not found"
    exit 1
fi

# Verify Node.js version
node_version=$(node --version)
echo "Node.js version: $node_version"

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Verify CLI is available
if ! pnpm paperclipai --help &> /dev/null; then
    echo "WARNING: paperclipai CLI may not be fully configured"
fi

echo "=== Environment Setup Complete ==="
echo "Working directory: $(pwd)"
echo "Git branch: $(git rev-parse --abbrev-ref HEAD)"
