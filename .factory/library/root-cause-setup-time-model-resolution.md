# Root Cause Analysis: Setup-Time Subagent Model Resolution

## Problem

During mission setup (proposal/validation-contract/artifact creation), spawning Task/subagent helpers with custom model IDs (e.g., `custom:opencode-go/minimax-m2.5`) fails with:

```
Invalid model: custom:opencode-go/minimax-m2.5
```

## Evidence

### 1. Validation Synthesis Reports

From `.factory/validation/evidence-flow/user-testing/synthesis.json`:
> "Flow validator subagent failed to spawn due to model configuration issue (custom:opencode-go/glm-5 not available)"

From `.factory/validation/evidence-flow/user-testing/flows/cli-validator.json`:
> "Flow validator subagent failed to spawn due to model configuration mismatch (custom:opencode-go/glm-5 not available)"

### 2. Mission Documentation

From `mission.md`:
- Error: `Invalid model: custom:opencode-go/minimax-m2.5`
- Also observed: `custom:opencode-go/glm-5`
- Context: Setup-time helper Task spawns during proposal/validation-contract/artifact creation

### 3. Working vs Failing Scenarios

| Scenario | Result |
|----------|--------|
| Kimi mission workers (execution-time) | ✅ Works |
| Main mission execution (fallback to direct work) | ✅ Works |
| Setup-time helper Task spawns (custom models) | ❌ Fails |

### 4. Configuration Context

From `doc/plans/DROID-SETUP-PLAN.md`, custom models are configured in `~/.factory/settings.json`:

```json
{
  "customModels": [
    {
      "model": "gemini-2.5-flash",
      "displayName": "Gemini Worker Flash",
      "baseUrl": "http://localhost:8888/v1",
      "provider": "generic-chat-completion-api"
    }
  ]
}
```

The `custom:` prefix indicates a custom model configuration that should be resolved from `settings.json`.

## Root Cause

**The setup-time Task/subagent spawning code path does not properly resolve custom model IDs with the `custom:` prefix from `~/.factory/settings.json`.**

### Code Path Analysis

1. **Execution-time path (working):**
   - Mission workers use a model resolution path that reads `~/.factory/settings.json`
   - Correctly resolves `custom:opencode-go/minimax-m2.5` to the configured provider/baseUrl
   - Kimi workers work because they use built-in model resolution

2. **Setup-time path (broken):**
   - Helper Task spawns during setup (proposal, validation-contract creation) use a different resolution path
   - This path fails to read or apply `~/.factory/settings.json` custom model configurations
   - When encountering `custom:opencode-go/minimax-m2.5`, it fails with "Invalid model" because it doesn't recognize the `custom:` prefix or can't resolve it

### Why This Happens

The issue is a **harness/model-resolution seam** in the DROID/Factord layer:

- The resolution code path used during setup-time Task spawns is different from the execution-time path
- The setup-time path likely uses a built-in model registry that doesn't include custom models
- The execution-time path properly consults `~/.factory/settings.json` for custom model definitions

## Recommended Fix

### Location
The fix must be in the **DROID/Factord harness layer** (outside this repo), specifically in the Task/subagent spawning code used during mission setup.

### Approach
1. **Unify model resolution:** Make the setup-time Task spawn code use the same model resolution path as execution-time mission workers
2. **Honor settings.json:** Ensure the setup-time path reads and respects `~/.factory/settings.json` custom model configurations
3. **Preserve existing behavior:** Mission worker model resolution should continue working as-is

### Implementation Notes

The fix should be mechanical and narrow:
- Identify where setup-time Task spawning resolves model IDs
- Ensure it uses the same settings.json resolution as execution-time
- No new abstractions or broad redesign needed

### Verification

After fix:
1. Setup-time helper Task spawns with custom models should succeed
2. Normal mission workers (Kimi) should still work
3. Invalid models should still fail with honest error messages (not silent fallbacks)
4. Setup/execution model resolution should produce consistent results

## Related Assertions

This root cause analysis fulfills **VAL-SETUP-002** from the validation contract:
> "Custom model configuration is honored - The Task spawn code path respects `~/.factory/settings.json` custom model configurations during setup phase, not just during execution phase."

## Cross-References

- `mission.md` - Mission proposal with full context
- `validation-contract.md` - Assertion VAL-SETUP-002
- `doc/plans/DROID-SETUP-PLAN.md` - Settings.json configuration format
- `.factory/validation/evidence-flow/user-testing/synthesis.json` - Evidence of failure
