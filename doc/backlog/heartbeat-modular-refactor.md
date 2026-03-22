# Backlog: Heartbeat Modular Refactor

**Status:** backlog (nicht priorisiert)
**Erstellt:** 2026-03-22
**Trigger:** Nach CEO V1 bewiesen und stabil

## Problem

`server/src/services/heartbeat.ts` ist 196 KB groß und trägt zu viel
Logik die nicht zum Ausführungspuls gehört. Zu viele Verantwortlichkeiten
in einer Datei = Risiko bei jedem Sprint.

## Vision

Heartbeat = reiner Ausführungspuls. Keine eigene Intelligenz.
CEO-Logik → eigener `ceo-run-handler.ts`
Engine Thinking Layer → eigene Engine-Services

## Wann angehen

Erst wenn CEO-Loop stabil läuft. Dann ist der Refactor motiviert
durch echten Schmerz, nicht durch Ästhetik.

## Nicht jetzt

Kein Sprint, kein Code-Change. Nur Backlog-Notiz.
