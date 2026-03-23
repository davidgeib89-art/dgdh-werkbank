# Sprint: Seed-from-Git — DGDH Firma ins Git

**Auftraggeber:** David
**Erstellt:** 2026-03-23
**Priorität:** hoch — verhindert wiederholten Datenverlust durch AI-Drift
**Scope:** `server/` only

---

## Problem

Codex hat beim E2E-Testrun die DB resettet. Dabei wurde die DGDH-Firma mit allen
Agenten gelöscht. Das ist jetzt das zweite Mal passiert.

Ursache: Die Firma lebt nur in der DB — nicht im Git. Wenn die DB weg ist,
ist die Firma weg. Kein Code-Backup, kein automatisches Restore.

---

## Ziel

Beim Serverstart wird geprüft ob die DGDH-Firma existiert.
Falls nicht: automatisch aus der Git-gesicherten Konfiguration wiederherstellen.

**Kein manueller Eingriff mehr nötig nach DB-Reset.**

---

## Was zu bauen ist

### 1. Seed-Konfiguration ins Git

Neue Datei: `server/config/seed/dgdh-firm.json`

```json
{
  "company": {
    "name": "David Geib Digitales Handwerk",
    "status": "active",
    "budgetMonthlyCents": 0
  },
  "agents": [
    {
      "name": "CEO Agent",
      "role": "general",
      "adapterType": "gemini_local",
      "adapterConfig": {
        "model": "auto",
        "roleTemplateId": "ceo"
      }
    },
    {
      "name": "Worker Agent",
      "role": "general",
      "adapterType": "gemini_local",
      "adapterConfig": {
        "model": "auto",
        "roleTemplateId": "worker"
      }
    },
    {
      "name": "Reviewer Agent",
      "role": "general",
      "adapterType": "gemini_local",
      "adapterConfig": {
        "model": "auto",
        "roleTemplateId": "reviewer"
      }
    }
  ]
}
```

### 2. `ensureSeedData()` Funktion

Neue Datei: `server/src/services/ensure-seed-data.ts`

Logik:
```
1. Lade server/config/seed/dgdh-firm.json
2. SELECT companies WHERE name = "David Geib Digitales Handwerk"
3. Existiert? → return (nothing to do)
4. Existiert nicht?
   → INSERT company
   → INSERT agents (alle 3) mit companyId der neuen Company
5. Log: "DGDH seed data restored"
```

**Wichtig:**
- Keine festen IDs erzwingen — die DB vergibt neue UUIDs, das ist ok
- Idempotent: mehrfacher Aufruf ist harmlos
- Nur `name`-Check für Company — kein Vergleich von IDs

### 3. Aufruf in `server/src/index.ts`

Nach der DB-Initialisierung (nach `ensureMigrations`) einmalig aufrufen:

```typescript
await ensureSeedData(db);
```

Genau eine Stelle, direkt nach dem Migrations-Block.

---

## Was NICHT angefasst wird

- `packages/db/src/seed.ts` — das ist der generische Demo-Seed, bleibt unberührt
- Kein Refactor von `index.ts` über das nötige Minimum hinaus
- Keine neuen Abhängigkeiten — nur bestehende Kysely-DB-Imports
- Keine Änderungen an bestehenden Agenten/Firmen in der DB

---

## doneWhen

1. `server/config/seed/dgdh-firm.json` existiert und ist im Git committed
2. `server/src/services/ensure-seed-data.ts` existiert mit `ensureSeedData(db)` Export
3. `server/src/index.ts` ruft `ensureSeedData(db)` nach Migrations-Block auf
4. **Smoke-Test:** DB leeren (oder Company manuell löschen), Server neu starten,
   GET `/api/companies` liefert DGDH-Firma mit 3 Agenten zurück
5. Zweiter Start ohne DB-Änderung: kein Fehler, kein Duplikat
6. Commit-Hash im Sprint-Report

---

## Invarianten (was erhalten bleiben muss)

- Server-Startzeit darf nicht spürbar steigen (ein einzelner SELECT ist vernachlässigbar)
- Kein Breaking Change an bestehenden API-Routen
- Bestehende Daten in der DB werden nicht verändert
- Tests in `server/src/__tests__/` dürfen nicht brechen

---

## Kontext für Codex

DB-Verbindung: embedded PostgreSQL läuft auf Port 54329 (default wenn keine DATABASE_URL gesetzt).
Credentials: `user: paperclip, password: paperclip, database: paperclip`.

Die Firma wird per `name`-Check identifiziert — nicht per ID.
IDs sind nach jedem Restore neu, das ist gewollt.

Verweis: `server/src/index.ts` Zeile ~280 für den Migrations-Block (ensureMigrations-Aufruf).
Verweis: `packages/db/src/schema/index.ts` für Companies/Agents-Schema.
