# Claude Code – Implementierungsplan: Gemini Routing Engine

> Auftrag von David Geib (CEO)
> Erstellt: 2026-03-20

---

## Ziel

Baue die **Gemini Routing Engine** fertig, damit das System vor jedem Run intelligent entscheidet:

- **Welche Quota-Bucket-Lane?** (`pro`, `flash`, `flash-lite`)
- **Ob Gemini-Quota genutzt werden soll**
- **Welche Skills/Tools explizit erlaubt sind**
- **Warum diese Entscheidung getroffen wurde**

Die Entscheidung basiert auf:
- **Live Quota Snapshot** (Quota % + State)
- **Art/Schwierigkeit der Aufgabe** (leicht vs schwer)
- **Token-Disziplin / minimaler Overkill**
- **Drift-Vermeidung durch enge Tool-Freigabe**

---

## Leitplanken

✅ **Machen:**
- Harte, operative Routing-Engine bauen
- Quota Producer für echte Quota-Daten
- Skill-Gating-Logik für Tool-Einschränkung
- Deterministische + founder-readable Entscheidungen

❌ **Nicht machen:**
- Kein UI zuerst
- Keine neue Meta-Architektur
- Keine neue Lane-Familie
- Keine manuelle Pro-Agent-Konfiguration im UI

---

## Ausgangslage (bereits vorhanden)

### Existierende Dateien:

1. **`server/src/services/gemini-flash-lite-router.ts`**
   - Nimmt `quotaSnapshot + taskText` als Input
   - Liefert: `taskClass`, `budgetClass`, `chosenBucket`, `chosenModelLane`, `riskLevel`, `needsApproval`, `rationale`
   - Hat Cache + Circuit Breaker
   - **Fehlt:** Live Quota Producer, Skill-Matrix Integration

2. **`server/src/services/gemini-quota-snapshot.ts`**
   - Parst `runtimeConfig.routingPolicy` für Quota-Daten
   - Liefert: bucket states, usagePercent, isStale
   - **Fehlt:** Produziert keine eigenen Quota-Daten

3. **`server/src/services/gemini-control-plane.ts`**
   - Finales Routing: Modell + Bucket + WorkPacket
   - Enforce WorkPacket (taskType, riskLevel, needsApproval)
   - **Fehlt:** Skill-Matrix Integration

---

## Phase 1: Quota Producer

### Ziel
Ein Service, der **aktuelle Gemini-Quota live abfragt** und als Snapshot bereitstellt.

### Deliverables

#### 1.1 Neue Datei: `server/src/services/gemini-quota-producer.ts`

```typescript
interface GeminiQuotaProducerResult {
  ok: boolean;
  source: "gemini_cli" | "cached" | "none";
  snapshotAt: string | null;
  accountLabel: string | null;
  buckets: {
    pro?: { usagePercent: number | null; state: "ok" | "cooldown" | "exhausted" | "unknown"; resetAt?: string | null };
    flash?: { usagePercent: number | null; state: "ok" | "cooldown" | "exhausted" | "unknown"; resetAt?: string | null };
    "flash-lite"?: { usagePercent: number | null; state: "ok" | "cooldown" | "exhausted" | "unknown"; resetAt?: string | null };
  };
  errorCode?: "cli_missing" | "timeout" | "parse_failed" | "empty";
  errorMessage?: string;
}
```

#### 1.2 Implementierung

- Führe `gemini --stats` oder äquivalenten CLI-Befehl aus
- Output robust parsen (JSON bevorzugen, Text-Fallback)
- In normales Quota-Snapshot-Format überführen
- **Fehlerbehandlung:** CLI fehlt, Timeout, unparsbarer Output, leere Daten

#### 1.3 Cache-Verhalten

- TTL: 60-180 Sekunden
- Force refresh optional
- Bei Fehler: letzten validen Snapshot als stale markieren
- Snapshot darf nie "frisch" wirken, wenn er es nicht ist

#### 1.4 Integration mit bestehendem Parser

Der Producer-Output muss kompatibel sein mit `ingestGeminiQuotaSnapshot()` aus `gemini-quota-snapshot.ts`.

---

## Phase 2: Skill/Tool Selection Matrix

### Ziel
Der Router soll nicht nur Modell/Bucket entscheiden, sondern **welche Fähigkeiten konkret erlaubt sind**.

### Deliverables

#### 2.1 Neue Datei: `server/src/services/gemini-skill-matrix.ts`

##### Task-Class Taxonomie (kleine, operative Klassifikation):

```typescript
type TaskClass = 
  | "read-only-review"    // txt lesen, kurzer review
  | "bounded-edit"        // kleine gezielte Änderung
  | "research-light"      // kurze Recherche
  | "research-write"      // Recherche + schreiben
  | "multi-step-implementation"  // mehrstufige Implementierung
  | "high-risk-governed"  // braucht Approval
```

##### Skill-Matrix:

| Task Class | Erlaubte Skills | Nicht erlaubt |
|------------|-----------------|---------------|
| `read-only-review` | `repo-read`, `status-summary` | `repo-write`, `web-search` |
| `bounded-edit` | `repo-read`, `repo-write`, `status-summary` | `web-search` |
| `research-light` | `repo-read`, `web-search`, `status-summary` | - |
| `research-write` | `repo-read`, `repo-write`, `web-search`, `status-summary` | - |
| `multi-step-implementation` | `repo-read`, `repo-write`, `test-runner`, `status-summary` | - |
| `high-risk-governed` | Starke Begrenzung + Approval-Pflicht | - |

##### Output Contract:

```typescript
interface SkillSelectionResult {
  allowedSkills: string[];
  skillPolicy: {
    policyName: string;
    taskClass: string;
    rationale: string;
  };
  toolConstraints?: {
    readOnly?: boolean;
    allowWeb?: boolean;
    allowWrite?: boolean;
    allowTests?: boolean;
  };
}
```

---

## Phase 3: Flash-Light Router Erweiterung

### Ziel
Den bestehenden Router erweitern für **quota-bewusste + skill-beschränkte** Entscheidungen.

### Deliverables

#### 3.1 Erweitertes Routing-Entscheidungsobjekt

```typescript
interface GeminiRoutingDecision {
  taskClass: string;
  difficultyClass: "light" | "medium" | "heavy";
  budgetClass: "minimal" | "standard" | "premium";
  useGeminiQuota: boolean;
  quotaConfidence: "high" | "medium" | "low";
  chosenBucket: "flash-lite" | "flash" | "pro" | "none";
  chosenModelLane: string | null;
  allowedSkills: string[];
  riskLevel: "low" | "medium" | "high";
  needsApproval: boolean;
  rationale: string;
}
```

#### 3.2 Entscheidungsheuristik

**Leichte Tasks** (txt lesen, quick review):
1. `flash-lite`, wenn gesund + genug Luft (0-60% genutzt)
2. sonst `flash`
3. sonst `pro`
4. sonst `useGeminiQuota = false`

**Mittlere Tasks** (bounded edit, kurze Recherche):
1. `flash`
2. `pro`, wenn Komplexität höher
3. `flash-lite` nur wenn wirklich knapp

**Schwere Tasks** (research + synthesis, multi-step coding):
1. `pro`
2. `flash`, wenn Pro exhausted und vertretbar
3. `flash-lite` fast nie

#### 3.3 Quota-Schwellen operationalisieren

| Usage | State |
|-------|-------|
| 0-60% | **healthy** |
| 61-80% | **watch** |
| 81-95% | **conserve** |
| >95% | **avoid** |
| cooldown/exhausted | **unavailable** |
| stale/unknown | nur mit Vorsicht |

#### 3.4 Rationale founder-readable

**Gut:**
> "Task wirkt read-only review. Flash-lite hat ausreichende Luft und niedrige Kosten. Web-Zugriff nicht nötig, daher nur repo-read + status-summary freigegeben."

**Schlecht:**
> "Considering the multidimensional interplay of quota utilization and task semantics..."

---

## Phase 4: Integration in Heartbeat / Invocation Path

### Ziel
Die Entscheidung soll **tatsächlich benutzt** werden.

### Deliverables

#### 4.1 Integrationspunkt finden

Vor Agent-/Heartbeat-Invocation dort, wo heute Modell/Bucket/Runtime-Config gesetzt wird.

#### 4.2 Laufzeit-Pipeline

1. Aktuellen Prompt/Issue-Kontext sammeln
2. Quota Producer ausführen oder Cache lesen
3. Snapshot normalisieren
4. Router aufrufen mit Task-Class-Detection
5. `chosenBucket`, `chosenModelLane`, `allowedSkills`, `needsApproval`, `rationale` erhalten
6. Invocation-Konfig entsprechend anpassen

#### 4.3 Allowed Skills durchreichen

`allowedSkills` muss in die tatsächliche Run-Konfiguration gelangen:
- runtimeConfig skill filter
- adapter config override
- invocation payload field

#### 4.4 Persistenz / Observability

Mindestens in Run-Kontext speichern:
- quota snapshot timestamp
- chosen bucket
- chosen model lane
- task class
- allowed skills
- rationale
- confidence

---

## Phase 5: Tests

### 5.1 Unit Tests für Quota Producer
- parse success
- partial bucket data
- unknown format
- stale snapshot
- cooldown/exhausted handling
- CLI failure / timeout mapping

### 5.2 Unit Tests für Skill-Matrix
- jede Task-Class gibt definierte Skills zurück
- keine leere/ungültige Policy
- riskantere Tasks erweitern Skills gezielt

### 5.3 Unit Tests für Router-Heuristik

| Szenario | Erwartung |
|----------|-----------|
| Leichte Aufgabe + flash-lite gesund | `flash-lite` |
| Leichte Aufgabe + flash-lite knapp + flash gesund | `flash` |
| Mittlere Aufgabe + flash gesund | `flash` |
| Schwere Aufgabe + pro gesund | `pro` |
| Schwere Aufgabe + pro exhausted + flash gesund | `flash` mit lower confidence |
| Snapshot stale | konservativer Output + markierte Unsicherheit |
| Research-Task | `web-search` erlaubt |
| Read-only review | kein `repo-write`, kein `web-search` |

### 5.4 Integration Tests
- Input: Issue/heartbeat prompt + quota snapshot
- Erwartung: finaler run context enthält bucket/model/allowedSkills/rationale

---

## Done-Kriterien

Die Arbeit ist erst fertig, wenn:

1. ✅ Vor einem Gemini-Run wird ein aktueller oder als stale markierter Quota Snapshot bestimmt
2. ✅ Der Router entscheidet aus Prompt + Quota:
   - Task-Class
   - Bucket
   - Model lane
   - allowedSkills
   - rationale
3. ✅ Allowed Skills werden tatsächlich an den Run durchgereicht
4. ✅ Leichte Tasks landen bevorzugt in `flash-lite` / `flash`
5. ✅ Schwere Tasks landen bevorzugt in `pro`, solange sinnvoll
6. ✅ Unknown/stale quota führt zu vorsichtigerer Entscheidung
7. ✅ Tests decken Quota, Skill-Matrix und Routing-Heuristik ab
8. ✅ Kein UI wurde voreilig gebaut
9. ✅ Das Ergebnis ist founder-readable und reduziert Tokenverschwendung

---

## Empfohlene Reihenfolge

1. Bestehende Integrationspunkte lesen
2. **Phase 1:** Quota Producer bauen
3. **Phase 2:** Skill-Matrix bauen
4. **Phase 3:** Router erweitern
5. **Phase 4:** In Invocation Path integrieren
6. **Phase 5:** Tests schreiben
7. Kurze Doku ergänzen

---

## Wichtige Produktentscheidung

**NICHT** die perfekte allgemeine KI-Routing-Theorie bauen.

**SONDERN:**
- **kleine operative Klassifikation**
- **klare Schwellen**
- **harte Skill-Freigabe**
- **gute Fallbacks**
- **kurze rationale**

Das Ziel ist nicht maximale Eleganz.
Das Ziel ist:

> **Google AI Pro Quota maximal smart ausnutzen bei minimalem Tokenverbrauch und weniger Drift.**

---

*Zuletzt aktualisiert: 2026-03-20 – DGDH Werkbank*