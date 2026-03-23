# Backlog: stage1-classifier Rename (Architektur-Klarstellung)

**Status:** backlog (nicht priorisiert)
**Erstellt:** 2026-03-22
**Trigger:** Nach Sprint T (Merge-Orchestrator)
**Prio:** niedrig — kein Bug, aber verhindert Architektur-Drift bei zukünftigen AIs

## Kontext

Brainstorming-Session David + Perplexity (Planer) + Claude (Planer), 2026-03-22.

`gemini-flash-lite-router.ts` ist irreführend benannt. Der Name impliziert:
- "Quota-Entscheider"
- "Gemini-spezifisch"
- "Flash-Lite ist das Modell"

Was die Datei wirklich ist: ein **semantischer Packet-Klassifizierer**.
Er analysiert ein eingehendes Packet und schlägt `taskClass`, `budgetClass`,
`executionIntent`, `riskLevel`, `doneWhen`, `allowedSkills` vor.

Das Konzept ist provider-unabhängig. "Cheap Classifier → Smart Executor" gilt für:
- Gemini → Flash-Lite/Flash klassifiziert
- OpenAI/Codex → gpt-4o-mini klassifiziert
- MiniMax → kleinstes MiniMax-Modell klassifiziert
- Claude → Haiku klassifiziert

## Scope

- `server/src/services/gemini-flash-lite-router.ts`
  → umbenennen zu `stage1-classifier.ts`
  → Provider als Parameter, nicht hardcoded
- Alle Imports die auf `gemini-flash-lite-router` zeigen anpassen
- CLAUDE.md Quelltabelle updaten

## doneWhen

- Datei heisst `stage1-classifier.ts`
- Kein Import mehr auf den alten Namen
- Verhalten ist identisch, kein funktionales Refactor
- Zukünftige AIs die den Code lesen verstehen sofort: das ist der Classifier-Layer,
  nicht ein Gemini-spezifisches Quota-Tool

## Wichtig: das ist kein Refactor

Nur umbenennen + Provider als Parameter. Keine Logik-Änderungen.
Perplexity: "Das Umbenennen ist eine Architektur-Klarstellung die Drift bei
zukünftigen AIs verhindert."

## Nicht jetzt

Erst nach Sprint T. Kann auch mit `stage1-skip-heavy-architecture` gebündelt werden
da beide die gleichen Dateien berühren.
