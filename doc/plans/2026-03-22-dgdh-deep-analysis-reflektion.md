# DGDH Deep Analysis & Reflection

Date: 2026-03-22
Status: Research & Strategy Blueprint
Context: Deep dive into 3 benchmark repositories (`Understand-Anything`, `autoresearch`, `alphaclaw`) to extract architectural patterns for the DGDH Paperclip Engine.

## 1. Worum es geht

Wir haben uns externe "State of the Art"-Agenten-Systeme angesehen, um herauszufinden, was DGDH fehlt, um von "funktioniert prinzipiell" zu "läuft monatelang stabil und entlastet David real" zu kommen.

Die wichtigste Erkenntnis: **Autonomie entsteht nicht durch klügere Modelle, sondern durch ein gnadenlos fehlertolerantes System-Design (Guardrails, Rollbacks, Memory-Struktur).**

Hier sind die extrahierten Patterns und wie/wann wir sie in DGDH einbauen.

---

## 2. Pattern 1: Der "Blast Radius" & Typed Memory
*Inspiriert von: `Lum1104/Understand-Anything`*

**Das Konzept:**
Statt dem LLM zu sagen "Lies den Code", wird die Codebase in einen maschinenlesbaren JSON-Knowledge-Graph (AST-basiert) übersetzt. Der Agent nutzt `jq`, um diesen Graphen extrem token-effizient abzufragen. Bei Code-Änderungen errechnet ein Tool den "Blast Radius" (wie viele Schichten/Knoten sind downstream betroffen?).

**Warum das für DGDH wichtig ist:**
Sobald wir Multi-Agent-Koordination starten, kollidieren Worker unweigerlich. Ein "Blast Radius Analyzer" gibt dem Reviewer-Agenten knallharte, quantitative Daten (*"Du hast 1 Datei geändert, aber 7 Komponenten sind affected und wurden nicht getestet"*), statt sich auf qualitative LLM-Vibes zu verlassen.

**Wann wir es bauen:**
**LATER (Phase 5).** Erst wenn die DGDH-Infrastruktur komplexer wird oder Multi-Agent-Arbeit startet. Für die flachen Astro-Templates der Ferienwohnungen ist es aktuell Over-Engineering.

---

## 3. Pattern 2: Der "Rollback-Loop" & Bounded Execution
*Inspiriert von: `karpathy/autoresearch`*

**Das Konzept:**
Ein Agent iteriert endlos, aber immer unter zwei harten Constraints:
1. Er darf nur exakt **eine einzige Datei** (`train.py`) ändern.
2. Wenn das Ergebnis nach der Änderung schlechter ist (oder abstürzt), erzwingt das System einen sofortigen `git reset --hard` auf den Startpunkt.

**Warum das für DGDH wichtig ist:**
Aktuell verbrennen unsere Worker-Agenten Tokens, weil sie versuchen, fehlerhaften Code "kaputt zu reparieren". Ein gescheiterter Ansatz führt oft zu einem Rabbit-Hole.

**Wann wir es bauen:**
**NEXT (Worker-Loop Schärfung).** 
- **Rollback:** Wenn der Reviewer-Agent ein Work-Packet mit `needs_revision` ablehnt (oder ein lokaler Build-Check fehlschlägt), muss die Paperclip-Engine den State via Git reverten, bevor der Worker den nächsten Versuch startet.
- **Simplicity Criterion:** Wir übernehmen Karpathys Regel in den Reviewer-Prompt: *"Ein winziger Fix, der 50 Zeilen Boilerplate erzeugt, wird abgelehnt. Simplicity wins."*

---

## 4. Pattern 3: Watchdog & Anti-Drift Injection
*Inspiriert von: `chrysb/alphaclaw`*

**Das Konzept:**
Ein "Zero-SSH"-Harness um die eigentliche Agenten-Engine. Ein Watchdog-Prozess killt Loops, repariert Crashs und sendet kurze Telegram-Pings. Zudem nutzt es "Prompt Hardening": Die Kernregeln werden dem Agenten bei jedem einzelnen Run hart in den System-Prompt injiziert ("Anti-Drift"), damit er seine Constraints nicht vergisst.

**Warum das für DGDH wichtig ist:**
David soll Operator bleiben, nicht Babysitter. Wenn die Maschine hängen bleibt (z.B. PowerShell `&&` Fehler), darf sie nicht blind Quota verbrennen, sondern muss abbrechen und sich melden.

**Wann wir es bauen:**
**NOW / NEXT.**
- **Anti-Drift:** Beim Aufbau des CEO V1 und der Reviewer-Matrix injizieren wir die Governance-Regeln hart in jeden Run.
- **Watchdog / Zero-SSH:** (Phase 4: Operator Surface). Das Dashboard bekommt eine Diff-View für Reviews. Push-Notifications (z.B. via Telegram/Discord) für blockierte Runs.

---

## 5. Fazit & Handlungsanweisung für die nächsten Sprints

Die Roadmap (`company-hq/ROADMAP.md`) bleibt bestehen, wird aber durch diese taktischen Hebel massiv aufgewertet:

1. **Worker-Loop (NOW):** Einbau eines "Git-Reset bei Failure"-Mechanismus, um Token-Ruinierung durch kaputtreparieren zu stoppen.
2. **Reviewer-Matrix (NOW):** Das "Simplicity Criterion" wird als hartes Abnahmekriterium etabliert.
3. **CEO V1 (NEXT):** Strikte "Bounded Execution" – der CEO weist den Worker an, *nur* im `targetFolder` zu operieren. Alle anderen Aktionen führen zum sofortigen Abbruch.
4. **Dashboard (LATER):** Watchdog-Alerts und In-Browser Diff-Views, um das Terminal als Operator endgültig obsolet zu machen.

> **Leitsatz aus der Analyse:** Die Intelligenz eines Agenten-Systems skaliert nicht primär durch das LLM, sondern durch die Gnadenlosigkeit seiner Sandbox (Constraints, Resets, Watchdogs).