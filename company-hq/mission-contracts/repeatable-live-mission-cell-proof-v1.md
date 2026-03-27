# Repeatable Live Mission Cell Proof V1

Status: active bounded phase-3 proving contract
Authority: David
Lane: mission autonomy mode
Mission Cell: `repeatable-live-mission-cell-proof-v1`

## Purpose

Prove that a mission-cell hardening cut really carries by running the same path again.

This contract exists because one good live proof plus one hardening cut is still not enough.
The firm needs one second live pass on the same bounded path, or else it has only a plausible
improvement story instead of a repeatable self-learning cycle.

## Bounded Self-Improvement Target

Carry the same Eidan/Copilot long-autonomy continuity target through:

1. live run A
2. proof-born hardening
3. live run B on the same path
4. promotion

The point is not more architecture.
The point is to prove the hardened path actually needs less mission restating and carries clearer continuity truth on the second pass.

## Strong Success

`strong success` means all of these are true:

- live run A happened on the bounded target
- a proof-born hardening cut landed because of live run A
- live run B happened on the same root path
- live run B proves the same friction was reduced
- the result was promoted into durable truth

## Truthful Partial

`truthful partial` means:

- live run A and hardening landed
- the rerun blocker is real, narrow, and honestly prevents live run B in the same container
- or live run B happened but promotion still lacks one narrow truthful proof

## Hard Stop

`hard stop` means:

- a true Type-1 boundary is reached
- a required live rerun needs an external dependency that is not honestly available
- or the next step would widen into a new program instead of the same bounded path

## Guard Metrics

- no first-green closure
- no AppData / workspaceStorage / chat-session-resources forensics unless explicitly requested
- no unrelated platform work
- no treating commit/push as automatic stop signals
- no promotion before the second live pass

## First repeatable proof result

The first real repeatability container is now carried.

Live run A used `missionCell: repeatable-live-mission-cell-proof-v1` on `DAV-160`
and exposed the remaining continuity seam in the real runtime path:
starter-path fields were present, but `contractFile` and `validate` still drifted with server `cwd`
to `../company-hq/...` instead of repo-stable `company-hq/...` truth.

The proof-born hardening cut landed on `main` in commit `3b9b473e`.
`server/src/services/mission-cell-contracts.ts` now derives mission-cell contract paths from repo root,
and the targeted mission-cell continuity slice passed after the fix.

Live run B replayed the same path on `DAV-163` / heartbeat run `fce157ad-8fab-4a86-bb1e-1cc38c9abb36`.
The live run record now carries `paperclipMissionCellReferences[0].filePath = company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json`.
The corresponding live run A record still shows the old drifted path
`../company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json`.

That before/after pair is the bounded repeatability proof:
the same friction was reduced on the second live pass, without falling back into editor-internal archaeology.

## One sentence

If the path has not run twice, the learning has not fully landed.
