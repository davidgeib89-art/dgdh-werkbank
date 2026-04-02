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
