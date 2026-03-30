---
name: paperclip-runtime
description: Ensure exactly one shared Paperclip runtime is alive on port 3100 for the current Factory mission.
---

# paperclip-runtime

Use this skill when a Factory mission depends on the live local Paperclip runtime.

Purpose:
- start or attach to one shared runtime on `:3100`
- avoid duplicate server starts across worker sessions
- give later mission features one canonical API base

## Rules

- Prefer one shared runtime per mission, not one runtime per worker
- Default startup mode is `watch`
- Use `once` only when watch-mode churn would make verification less trustworthy
- Do not use direct DB checks as runtime proof

## Procedure

1. Ensure runtime:

```powershell
node .factory/hooks/ensure-paperclip-runtime.mjs --mode watch
```

2. Verify runtime truth:

```powershell
Invoke-RestMethod http://127.0.0.1:3100/api/health
Invoke-RestMethod http://127.0.0.1:3100/api/companies
```

3. If triad work is involved, verify readiness:

```powershell
Invoke-RestMethod http://127.0.0.1:3100/api/companies/<companyId>/agents/triad-preflight
```

4. If the runtime does not become healthy, read:
- `.factory/runtime/paperclip-runtime-3100.out.log`
- `.factory/runtime/paperclip-runtime-3100.err.log`

## Output requirements

Always report:
- startup mode used (`watch` or `once`)
- whether runtime was reused or started fresh
- exact verification commands run
- whether the runtime is healthy enough for the rest of the mission
