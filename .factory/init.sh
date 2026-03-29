#!/bin/sh
# init.sh — idempotent environment setup for Triad Closeout mission
# Runs at the start of each worker session.

set -e

# Install dependencies if needed
pnpm install --frozen-lockfile

# Verify the server is alive (it should already be running on 3100)
# Workers do NOT start a new server — only check if it's there.
if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
  echo "Server healthy on port 3100"
else
  echo "WARNING: Server not responding on port 3100. Workers must not start a new instance without orchestrator approval."
fi
