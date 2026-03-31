---
title: Quickstart
summary: Get Paperclip running in minutes
---

Get Paperclip running locally in under 5 minutes.

## Quick Start (Recommended)

```sh
npx paperclipai onboard --yes
```

This walks you through setup, configures your environment, and gets Paperclip running.

## Local Development

Prerequisites: Node.js 20+ and pnpm 9+.

```sh
pnpm install
pnpm dev
```

This starts the API server and UI at [http://localhost:3100](http://localhost:3100).

No external database required — Paperclip uses embedded Postgres by default in local mode.

## One-Command Bootstrap

```sh
pnpm paperclipai run
```

This auto-onboards if config is missing, runs health checks with auto-repair, and starts the server.

## What's Next

Once Paperclip is running:

1. Verify the runtime directly with `curl http://localhost:3100/api/health` or `pnpm paperclipai runtime status --api-url http://localhost:3100`
2. Create your first company in the web UI
3. Define a company goal
4. Create a CEO or worker agent and configure its adapter
5. Build out the org chart with more agents
6. Set budgets and assign initial tasks
7. Use runtime or triad diagnostics before assuming a run is healthy

<Card title="Core Concepts" href="/start/core-concepts">
  Learn the key concepts behind Paperclip
</Card>
