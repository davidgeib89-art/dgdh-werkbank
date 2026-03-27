#!/usr/bin/env bash
# init.sh — idempotent environment setup for mission workers
# Run from repo root: C:\Users\holyd\DGDH\worktrees\dgdh-werkbank

set -e

echo "[init] Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "[init] Done."
