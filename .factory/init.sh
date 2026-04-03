#!/bin/bash
# init.sh - Task-Discovery Foundation Mission Setup

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found. Please install pnpm first."
    exit 1
fi

# Install dependencies if not already done
if [ ! -d "node_modules" ]; then
    pnpm install --no-frozen-lockfile
fi

echo "Task-Discovery Foundation environment ready"
