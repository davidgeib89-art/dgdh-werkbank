# PROMPT-RESOLVER-MILESTONE-NOTE

Status: draft
Date: 2026-03-17
Scope: Technischer Meilensteinabschluss fuer Resolver-Schema, Validator, Preflight-Utility und beobachtenden Dry-Run-Hook

## 1. Milestone summary

- [confirmed] Resolver-Schema als typsicheres Input/Output-Modell ist implementiert.
- [confirmed] Validator-Pipeline fuer Stage-1-Regeln ist implementiert.
- [confirmed] Preflight-Utility erzeugt nur resolverDecision, reasonCodes und optional auditMeta.
- [confirmed] Dry-Run-Hook ist an einem engen Prompt-Erzeugungspunkt angebunden und bleibt beobachtend.

## 2. Implemented components

- [confirmed] Resolver schema/types: `server/src/services/prompt-resolver-schema.ts`
- [confirmed] Validator: `validatePromptResolverInput(...)`
- [confirmed] Preflight utility: `server/src/services/prompt-resolver-preflight.ts`
- [confirmed] Kontrollierter Dry-Run-Hook: `applyIssuePromptContext(...)` in `server/src/services/heartbeat.ts`

## 3. Technical guarantees currently enforced

- [confirmed] Pflichtfelder werden geprueft; Verstoesse fuehren zu hard fail.
- [confirmed] Layer-Reihenfolge wird geprueft.
- [confirmed] Tool-Konflikte (`allowedTools` vs `blockedTools`) fuehren zu hard fail.
- [confirmed] Non-overridable Governance-Felder duerfen nicht aus Role-Addon ueberschrieben werden.
- [confirmed] Scope-Erweiterung ausserhalb erlaubter Targets fuehrt zu escalated.
- [confirmed] Dry-Run-Hook aendert den Prompt-String nicht.
- [confirmed] Dry-Run-Hook steuert keine Heartbeat-/Adapter-/Modell-Ausfuehrung.

## 4. Validation status

- [confirmed] Gezielte Resolver-Tests gruen.
- [confirmed] Gezielte Heartbeat-Governance-Tests (inkl. observational hook assertions) gruen.
- [confirmed] Server-Typecheck gruen.

## 5. Remaining risks / open points

- [open question] AuditMeta ist aktuell minimal; spaetere Telemetrie-Normalisierung auf Run-Event-Schema steht aus.
- [open question] Dry-Run-Hook sitzt aktuell in einem Heartbeat-Prompt-Kontext, noch nicht in einem adapter-nahen Prompt-Builder.
- [open question] Noch keine kontrollierte, read-only Telemetrie-Ausleitung auf dedizierten Event-Typ.

## 6. Next safe integration step (proposal only)

- [confirmed] Naechster kleiner Schritt ist ein read-only Adapter-naher Dry-Run-Aufruf vor Prompt-Uebergabe im Gemini-Local-Execute-Pfad.
- [confirmed] Dieser Schritt darf nur Telemetrie mitschreiben (`resolverDecision`, `reasonCodes`, optional `auditMeta`) und keinerlei Prompt-/Execution-Branching ausloesen.
- [confirmed] Umsetzung erfolgt erst nach separater Freigabe; in diesem Meilenstein nicht implementiert.
