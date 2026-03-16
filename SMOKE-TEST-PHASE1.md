# Sprint 3b Phase 1 – Smoke-Test Dokumentation

**Datum:** 2026-03-16  
**Status:** ✅ Typecheck: OK | 🧪 Smoke-Test: Ready for Manual Testing  
**Verantwortung:** Nutzer führt Browser-Tests durch

---

## Vorbereitung (von der Dev-Umgebung)

```bash
# Terminal 1: Start dev server
cd c:\Users\holyd\DGDH\worktrees\paperclip-codex
pnpm install  # falls noch nicht geschehen
pnpm --filter @paperclipai/ui dev

# Terminal 2 (optional): Start backend server (if running locally)
pnpm --filter @paperclipai/server dev
```

**Expected output:**

- UI dev server: `VITE v... ready in X ms → Local: http://localhost:XXXX/`
- Browser: Automatisch oder manuell zur URL navigieren

---

## Test-Szenarien

### 1. Route-Zugriff und Laden

**URL:** `http://localhost:XXXX/ABC/memory` (ersetze `ABC` mit aktueller companyPrefix)

**Erwartung:**

- ✅ Seite lädt ohne 404-Fehler
- ✅ Header zeigt "Memory Viewer"
- ✅ Scope-Tabs sichtbar (All, Company, Project, Personal, Social)
- ✅ Filter-Bar mit Eingabefeldern vorhanden
- ✅ Speicher-Liste auf der linken Seite rendert (oder ist leer, falls keine Daten)
- ✅ Rechtes Panel zeigt Platzhalter oder Reflection-Kandidaten-Bereich

**Browser-Konsole Checks:**

- ⚠️ **WARNUNG:** Achte auf 404-Fehler von `/api/companies/ABC/memory/viewer` (Backend muss laufen)
- ⚠️ **WARNUNG:** Achte auf `Cannot find name 'X'` oder `undefined is not an object` Fehler
- ❌ FAIL: Wenn React/Vite Rendering-Fehler `Error: ...` zeigt

**Beispiel OK-Szenario:**

```
GET http://localhost:5173/api/companies/ABC/memory/viewer?page=1&limit=50
GET http://localhost:5173/api/companies/ABC/memory/viewer/stats
→ 200 OK (oder 404 wenn Backend nicht läuft)
```

---

### 2. Scope-Tabs durchklicken

**Schritte:**

1. Klick auf Tab "Company"
2. Beobachte: Filter wird angewendet (`scope=company`)
3. Wiederhole für: Project, Personal, Social
4. Klick auf "All" → Reset auf alle Scopes

**Erwartung:**

- ✅ Tab-Styling ändert sich visuell (aktiver Tab hervorgehoben)
- ✅ URL oder Query-State ändert sich
- ✅ Liste wird neu geladen (ggf. mit neuen Daten oder leere Liste)

**Bekannte Eckstelle:**

- Wenn Backend-Liste leer ist → alle Tabs zeigen leere Liste (ist OK)

---

### 3. Filter-Bar: Einzelne Filter testen

#### 3a. Text-Search

**Input:** Gib einen Text ein (z.B. "decision" oder "agent")

**Erwartung:**

- ✅ Input wird erfasst
- ✅ Nach ~300ms wird Liste neu geladen (Debounce)
- ✅ API-Request enthält `?text=...`

#### 3b. Kind-Dropdown

**Input:** Wähle "lesson" oder "decision"

**Erwartung:**

- ✅ Dropdown zeigt Optionen
- ✅ Nach Auswahl wird Filter angewendet
- ✅ API-Request enthält `?kind=lesson`

#### 3c. Agent-Dropdown

**Input:** Wähle einen Agent aus der Liste

**Erwartung:**

- ✅ Agent-List wird geladen (braucht Backend-Daten)
- ✅ Nach Auswahl: API-Request enthält `?agentId=...`

#### 3d. Project-Dropdown

**Input:** Wähle ein Project

**Erwartung:**

- ✅ Project-List wird geladen
- ✅ Nach Auswahl: API-Request enthält `?projectId=...`

#### 3e. Archived-Toggle

**Input:** Klick auf Checkbox "Show Archived"

**Erwartung:**

- ✅ Checkbox-State ändert sich
- ✅ API-Request enthält `?includeArchived=true`

**Beispiel kombinierter Filter:**

```
Scope: Company
Text: "decision"
Kind: lesson
Agent: claude-blue
Project: feature-X
→ GET /api/companies/ABC/memory/viewer?scope=company&text=decision&kind=lesson&agentId=claude-blue&projectId=feature-X&page=1
```

---

### 4. Pagination

**Input:** Wenn Liste > 50 Items: Klick auf Seite 2 / Next

**Erwartung:**

- ✅ API-Request: `?page=2&limit=50`
- ✅ Liste zeigt neue Items
- ✅ Pagination-Controls aktualisieren sich

---

### 5. Memory-List-Item: Interaktion und Badges

**Input:** Hovere über einen Memory-Eintrag in der linken Liste

**Erwartung:**

- ✅ Badges sichtbar (Scope-Badge, Kind-Badge, ApprovalStatus-Badge)
- ✅ Scope-Badge Farben korrekt:
  - Blue: company
  - Purple: project
  - Green: personal
  - Orange: social
- ✅ ApprovalStatus-Badge Farben:
  - Green: approved
  - Yellow: pending_review
  - Red: rejected
  - Gray: draft

**Input:** Klick auf einen Memory-Eintrag

**Erwartung:**

- ✅ Rechtes Panel wird aktualisiert
- ✅ Detail-Ansicht zeigt ausgewählten Memory

---

### 6. Detail-Panel: Memory-Information

**Vorbedingung:** Ein Memory-Eintrag ist ausgewählt

**Erwartung:**

- ✅ Detailbereich zeigt:
  - Summary
  - Detail
  - Tags (als Badges)
  - Importance-Score
  - Confidence-Score
  - Created/Updated/Approved At Timestamps
  - Owner (Agent/Nutzer)
  - Approval Status
  - Archived Status

**Governance-Fields sollten sichtbar sein:**

- approvedBy: Nutzer/System, der Memory approviert hat
- approvedAt: Timestamp
- archivedBy / archivedAt (falls archiviert)

---

### 7. Reflection-Kandidaten-Panel

**Vorbedingung:** Agent ist über Agent-Filter ausgewählt

**Input:** Klick auf "Run Reflection" Button (falls vorhanden)

**Erwartung:**

- ✅ Loading-Spinner ist kurz sichtbar
- ✅ Nach ~2s: Kandidaten-Liste wird angezeigt
- ✅ Für jeden Kandidaten sind sichtbar:
  - `suggestedSummary` (Titel)
  - `suggestedDetail` (Beschreibung)
  - `suggestedTags` (als Badges)
  - `sourceEpisodeIds` (Quellen-IDs von Episodes, die diesen Kandidaten erzeugt haben)
  - `suggestedImportance` / `suggestedConfidence` (Score-Info)

**API-Request:**

```
POST /api/companies/ABC/memory/reflect
Body: { agentId: "...", projectId: "...", lookbackDays: 1 }
→ 200 OK mit ReflectionReport
```

---

### 8. Browser-Konsole: Error-Checks

**Öffne DevTools:** F12 → Console Tab

**Achte auf diese Fehler:**

| Fehler                                               | Ursache                                                                  | Action                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| `TypeError: Cannot read property 'xxx' of undefined` | Falsche Property-Namen (z.B. `sourceMemoryIds` statt `sourceEpisodeIds`) | ✅ Bereits gefixt in Phase 1      |
| `GET .../memory/viewer 404`                          | Backend API nicht erreichbar                                             | Start Backend / Node Server       |
| `CORS error`                                         | Backend läuft auf anderer Origin                                         | Proxy-Konfiguration Vite checken  |
| `[React] unhandled error in effect hook`             | Query/State-Problem                                                      | Detaillierter Error-Stack checken |
| Warnings (gelb): OK, solange keine roten Fehler      | Minor issues                                                             | ✅ Ignorierbar für Phase 1        |

---

## Testfall-Kombinationen

### Test A: Minimal Path

1. Route: `http://localhost:5173/ABC/memory`
2. Erwartung: Page rendert, keine Fehler
3. **Status:** ✅ / ⚠️ / ❌

### Test B: Company Scope + Text Filter

1. Klick Tab "Company"
2. Text eingeben: "decision"
3. Erwartung: Liste filtert sich, API-Request hat `scope=company&text=decision`
4. **Status:** ✅ / ⚠️ / ❌

### Test C: Agent Selection + Reflection

1. Tab "Project" auswählen
2. Agent-Dropdown: "claude-blue" wählen
3. Klick "Run Reflection" Button
4. Erwartung: Reflection-Kandidaten laden und werden angezeigt
5. **Status:** ✅ / ⚠️ / ❌

### Test D: Memory Selection + Detail Panel

1. Klick auf einen Memory-Eintrag in der Liste
2. Erwartung: Rechtes Panel zeigt alle Governance-Fields
3. Achte auf Timestamps, Approval Status, Tags
4. **Status:** ✅ / ⚠️ / ❌

---

## Bekannte UI-Ecken und Schwächen (Phase 1)

### ✅ Gelöst

- Import-Fehler (client → api)
- Property-Namen (sourceMemoryIds → sourceEpisodeIds)
- URL-Konstruktion (`${companyId}` statt `${params.agentId}`)
- Typecheck: Alle 19 Packages OK

### ⚠️ Bekannte Schwächen (tolerant für Phase 1)

1. **Keine Write-Buttons:** Promote, Correct, Reinforce sind noch nicht wired (Phase 2)
2. **Label-Text:** Deutsche vs. Englische Labels gemischt (z.B. "Kind", "Scope") – optionale Cleanup
3. **Reflection Auto-Trigger:** Reflection lädt nicht automatisch bei Agent-Auswahl – braucht manuellen Click (ist OK)
4. **Pagination:** Wenn Backend > 50 Items liefert, ist Pagination vorhanden aber wenig getestet
5. **Error Handling:** Wenn API 500 returned → generic Error Toast (nicht spezifisch)
6. **Mobile:** UI ist Desktop-first, Mobile-Responsiveness limitiert

### ❌ Bekannte Blocker (für Phase 2)

- **Keine Mutation-Hooks:** POST mutations für promote/correct/reinforce nicht wired
- **Keine Optimistic Updates:** Schreibvorgänge haben kein immediate UI-Feedback
- **Keine Permission-Checks:** UI zeigt Write-Buttons für alle (braucht Backend-Auth)

---

## Phase 2 Vorbereitung: Write Operations

Für Phase 2 müssen diese UI-Patterns implementiert werden:

### Pattern: Controlled Mutation + Optimistic Update

```tsx
// Beispiel-Struktur für Phase 2
const promoteMutation = useMutation({
  mutationFn: (input: PromoteReflectionInput) =>
    memoryApi.promoteReflection(companyId, input),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.memory.viewerList(companyId),
    });
    toast.success("Memory promoted successfully");
  },
  onError: (error) => {
    toast.error(`Promotion failed: ${error.message}`);
  },
});
```

### Governance-Actions für Phase 2

1. **Promote Reflection Candidate** → Create new Memory from candidate
2. **Correct Memory** → PATCH einzelne Felder (summary, detail, tags, importance, confidence)
3. **Reinforce Memory** → POST endpoint mit +importance, +confidence
4. **Approve/Reject/Archive** → Approval-Mutation mit optional reason

### UI-Flow Beispiel (Phase 2)

```
1. Reflection-Kandidat auswählen
2. Klick "Promote" Button
3. Modal öffnet sich: "Review + Promote"
   - Show suggestedSummary / Detail / Tags
   - Felder editable vor Promotion
   - "Promote" Button (disabled während loading)
4. Nach Promotion:
   - Kandidat verschwindet aus Liste
   - Neue Memory erscheint in der Hauptliste
   - Success Toast
```

---

## Nächste Schritte

### Für Phase 1 (noch zu testen):

- [ ] Nutzer führt Smoke-Test oberhalb durch
- [ ] Dokumentiert: OK / Warnung / Problem
- [ ] Berichtet kritische Fehler zurück

### Für Phase 2:

- [ ] API-Mutations wiring (promote, correct, reinforce, approve/reject/archive)
- [ ] Mutation UI-Flows implementieren
- [ ] Optimistic Updates + Error Handling
- [ ] Permission-Checks integrieren (falls Backend vorhanden)
- [ ] Write-Operation Tests schreiben

---

## Zusammenfassung Phase 1

| Komponente                 | Status            | Anmerkung                                         |
| -------------------------- | ----------------- | ------------------------------------------------- |
| Memory API Client          | ✅ OK             | 4 Read-Endpoints (list, stats, reflection, trace) |
| Query Keys                 | ✅ OK             | Memory namespace mit allen Keys                   |
| MemoryViewer Page          | ✅ OK             | ~440 LOC, alle Filter + Detail-Panel              |
| Routing                    | ✅ OK             | Route `/memory` integriert                        |
| Sidebar Nav                | ✅ OK             | Memory Link mit Brain-Icon                        |
| Typecheck                  | ✅ OK             | Alle 19 Packages grün                             |
| **Manuelle Browser-Tests** | 🧪 **AUSSTEHEND** | Nutzer führt durch                                |
