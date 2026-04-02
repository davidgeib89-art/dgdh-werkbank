#!/bin/bash
# init.sh - Environment setup for shared package work
# This script is idempotent - safe to run multiple times

set -e

# Check Node version
echo "Checking Node version..."
node --version

# Check pnpm
echo "Checking pnpm..."
pnpm --version

# Install dependencies if node_modules is missing or outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

echo "Environment ready."
