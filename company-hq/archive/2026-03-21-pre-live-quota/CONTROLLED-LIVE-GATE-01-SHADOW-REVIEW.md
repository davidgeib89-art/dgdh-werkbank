# CONTROLLED-LIVE-GATE-01-SHADOW-REVIEW

Status: draft
Date: 2026-03-17
Scope: Board-review baseline for one narrow controlled-live probe

## Required Shadow Signals

- promptResolverDryRunPreflight must be present for reviewed dry-run/test probe samples.
- promptResolverShadow must be present for reviewed dry-run/test probe samples.
- Comparison signals must include:
  - promptsEquivalent
  - legacyPromptSha256
  - resolvedPromptSha256
- Decision signals must include:
  - resolverDecision distribution
  - reasonCode distribution
- Audit signals must include:
  - dryRunObserved
  - mode=shadow
  - readOnly=true
  - source=gemini_local.execute

## Gate Outcome Rules

GO

- Compared sample count is at or above approved minimum.
- Parity rate is at or above approved threshold.
- No fail decisions in reviewed shadow/preflight distributions.
- No readOnly violations.

WARNUNG

- Minimum compared sample count not yet reached.
- No parity/readOnly/fail-decision hard breaches present.

NO-GO

- Parity below threshold.
- Any fail decision detected.
- Any readOnly violation detected.

## Controlled-Live Probe Invariants

- Probe scope is exactly one narrow prompt path.
- No automatic enforcement switch.
- No execution branching from shadow/gate helpers.
- No prompt rewrite in default production path.
- Runtime behavior remains unchanged except read-only telemetry recording.
- Manual board approval remains mandatory before controlled-live probe start.

## Operational Note

- This gate definition is review-only and readiness-only.
- Enabling a controlled-live probe still requires explicit board decision and separate implementation approval.
- Board decision packet for Probe-01 is captured in CONTROLLED-LIVE-PROBE-01-BOARD-PACKET.md.
