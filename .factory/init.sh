#!/bin/sh
# init.sh - idempotent environment setup for Factory missions in DGDH.
# Runs at the start of each worker session.

set -e

pnpm install --frozen-lockfile

case "${FACTORY_REQUIRE_PAPERCLIP_RUNTIME:-true}" in
  false|FALSE|0|no|NO)
    ;;
  *)
    # Ensure one shared Paperclip runtime for the whole mission.
    # The script is idempotent: if 3100 is already healthy, it exits quickly.
    node .factory/hooks/ensure-paperclip-runtime.mjs --mode "${FACTORY_PAPERCLIP_RUNTIME_MODE:-watch}"
    ;;
esac
