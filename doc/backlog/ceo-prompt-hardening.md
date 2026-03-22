# Backlog: CEO Prompt Hardening

**Status:** backlog (nicht priorisiert)
**Erstellt:** 2026-03-22
**Trigger:** Nach Sprint P (Assignment-Logik), als gebuendeltes Prompt-Update

## Kontext

Brainstorming-Session David + Perplexity (Planer) + Claude (Planer), 2026-03-22.
Drei CEO-Prompt-Schwaechen identifiziert die zusammen gefixt werden sollten.

## Tweak 1 — Flexible Packet-Zahl

**Problem:** CEO hat starre Regel "Create exactly 3-5 bounded packets".
Einfache Tasks werden kuenstlich aufgeblaeht, komplexe zusammengequetscht.

**Fix:** Proportionale Einschaetzung statt fester Zahl:
```
Create as few packets as the mission requires — typically 1-3 for simple
tasks, up to 5-8 for complex ones. Never more than 8 without escalating
to David. Each packet must have a clear doneWhen.
```

## Tweak 2 — Mission-Typen erkennen

**Problem:** CEO ist auf "baue Packets zum Bauen" getrimmt.
Aber Missionen koennen auch Research, Analyse oder Review sein.

**Fix:**
```
Not every mission requires building. Missions can be:
- research (answer a question)
- analysis (evaluate feasibility)
- build (create something)
- review (check existing work)
Determine the mission type before creating packets.
```

## Tweak 3 — Direkt-Antwort vs. Kette

**Problem:** CEO zerlegt IMMER in Packets, auch wenn er die Frage
direkt beantworten koennte. Das ist unnoetig teuer.

**Fix:** Routing-Entscheidung VOR der Zerlegung:
```
Bevor du zerlegst, entscheide: Braucht diese Mission eine Kette?

DIREKT BEANTWORTEN wenn:
- Die Frage mit Nachdenken + vorhandenem Wissen beantwortbar ist
- Kein externer Output noetig (kein Code, kein File, kein Bild)
- Zeitaufwand < 1 Packet

IN PACKETS ZERLEGEN wenn:
- Mehrere unabhaengige Arbeitsschritte noetig sind
- Externer Output erwartet wird (Files, Templates, Bilder)
- Verschiedene Skills/Tools gebraucht werden
```

## Tweak 4 — CEO Selbst-Reflection (statt separatem Reflect-Agent)

**Problem:** Wer kontrolliert den CEO? Ein separater Reflect-Subagent
waere ein Rekursions-Problem (wer kontrolliert den Reflect-Agent?).

**Loesung:** Eingebackener Selbst-Check im CEO-Prompt (null extra Tokens):
```
Bevor du deine Entscheidung finalisierst, pruefe:
- Wuerde David das so absegnen?
- Ist das die billigste Variante die funktioniert?
- Habe ich etwas uebersehen das die Aufgabe einfacher macht?
Wenn unsicher bei einer dieser Fragen: Entscheidung an David eskalieren.
```

**Spaeter (nach Smoke Customer Run):** Reflect-Skill als horizontales Tool
das jede Rolle aufrufen kann. Guardrails:
- Pflicht-Reflect: Budget-Schwelle, Scope-Erweiterung, Eskalation
- Optional-Reflect: Agent ist unsicher
- Kein Reflect: Standard-Packets (schema-fill, template-apply etc.)

Details zur Reflect-Skill-Vision: `doc/backlog/reflect-skill.md` (noch nicht erstellt)

## Umsetzung

Alle 4 Tweaks sind Aenderungen in `server/config/role-templates/ceo.json`.
Kein Architektur-Change. Kein neues Feature. Nur Prompt-Verbesserung.
Geschaetzter Aufwand: 1 Mini-Sprint, ~15 Minuten.

## Nicht jetzt

Sprint P (Assignment-Logik) darf nicht aufgeblaeht werden.
Dieses Update kommt danach als eigener kleiner Sprint.
