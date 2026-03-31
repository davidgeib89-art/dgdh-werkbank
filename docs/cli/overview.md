---
title: CLI Overview
summary: CLI installation and setup
---

The Paperclip CLI handles instance setup, diagnostics, and control-plane operations.

## Usage

```sh
pnpm paperclipai --help
```

## Global Options

Many control-plane commands share these options:

| Flag | Description |
|------|-------------|
| `--data-dir <path>` | Local Paperclip data root (isolates from `~/.paperclip`) |
| `--api-base <url>` | API base URL for the classic client/context command path |
| `--api-key <token>` | API authentication token |
| `--context <path>` | Context file path |
| `--profile <name>` | Context profile name |
| `--json` | Output as JSON |

Company-scoped commands also accept `--company-id <id>`.

Important current nuance:

- newer `runtime` and `triad` commands use `--api-url` instead of `--api-base`
- context profiles still store the client-side base URL through `context set --api-base ...`
- if a command has its own help output, trust that command's flags over repo folklore

For clean local instances, pass `--data-dir` on the command you run:

```sh
pnpm paperclipai run --data-dir ./tmp/paperclip-dev
```

## Context Profiles

Store defaults to avoid repeating flags:

```sh
# Set defaults
pnpm paperclipai context set --api-base http://localhost:3100 --company-id <id>

# View current context
pnpm paperclipai context show

# List profiles
pnpm paperclipai context list

# Switch profile
pnpm paperclipai context use default
```

To avoid storing secrets in context, use an env var:

```sh
pnpm paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

Context is stored at `~/.paperclip/context.json`.

## Command Categories

The CLI has three practical categories:

1. **[Setup commands](/cli/setup-commands)** — instance bootstrap, diagnostics, configuration
2. **[Control-plane commands](/cli/control-plane-commands)** — issues, agents, approvals, activity
3. **Runtime / triad diagnostics** — runtime health and triad mission-loop helpers such as `runtime status` and `triad status`
