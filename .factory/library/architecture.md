# Architecture

## Overview

The `packages/shared` package contains shared types, validators, and constants used across the Paperclip monorepo.

## Key Components

- **validators/** - Zod validation schemas for API contracts
  - `issue.ts` - Issue-related validation schemas (CreateIssue, UpdateIssue, etc.)
- **types/** - Shared TypeScript types
- **constants.ts** - Shared constants (statuses, enums, etc.)
- **index.ts** - Main exports

## Data Flow

- Validators in `issue.ts` are used by server routes and API clients
- Types are inferred from Zod schemas where possible
- Constants define domain values (ISSUE_STATUSES, ISSUE_PRIORITIES, etc.)

## Current State

The `packages/shared` package has no test infrastructure configured (not in vitest workspace).
Validators are tested indirectly through server/CLI tests.

## What This Mission Adds

- `validateIssueStatusTransition()` helper for business rule validation
- Direct test coverage for issue validators
- Vitest configuration for the shared package

## Mission Closeout Truth

Mission completion must be mechanically verified, not inferred from one green step.

- Do not claim mission completion while `state.json.state` is not `completed`
- Do not claim mission completion while any feature in `features.json` is still `pending` or `in_progress`
- Do not claim `all assertions fulfilled` when `validation-state.json` still shows assertions as `pending` or inconsistent
- Do not claim `user-testing passed` unless a corresponding user-testing feature exists and is actually completed
- A generic system message such as `mission is done` does not override feature-graph truth, validation-state truth, or git truth
