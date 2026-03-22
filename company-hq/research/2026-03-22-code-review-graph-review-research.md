# Research: code-review-graph fuer schnellere DGDH Code Reviews

Date: 2026-03-22
Context: Analyzed the external repository `tirth8205/code-review-graph` for DGDH review acceleration and reviewer-context reduction.
Trigger: Consider as a pilot only when Paperclip/DGDH infrastructure reviews are burning too many tokens or scanning too much repo context. Not a Phase-1 core integration for Revenue Lane #1.

## Repo

- URL: `https://github.com/tirth8205/code-review-graph`
- Type: Python tool / Claude Code plugin / MCP server
- Core stack: Tree-sitter + SQLite + incremental git-based graph updates
- License: MIT
- Maturity snapshot at review time: active, Beta, tests present, multiple recent security hardening fixes

## Was es macht - ein Satz

Es baut einen lokalen Code-Graphen aus Funktionen, Klassen, Imports und Calls, damit ein LLM fuer Reviews nur geaenderte Teile plus deren Blast Radius lesen muss statt das halbe Repo.

## Direkter Einsatz - nutzbar as-is? Warum / warum nicht?

Teilweise ja, aber nur als lokales Experiment fuer das DGDH/Paperclip-Repo.

Warum es brauchbar ist:
- DGDH/Paperclip ist ein code-lastiges Repo mit vielen Beziehungen zwischen `server`, `packages/shared`, `ui` und Adaptern.
- Das Tool unterstuetzt Python, TypeScript, JavaScript, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, Solidity und C/C++.
- Die Kernidee "changed files -> impact radius -> minimal review context" passt direkt zu unserem Ziel, nur den kleinsten sinnvollen Kontext zu laden.

Warum es nicht einfach as-is Firmenstandard werden sollte:
- Die Produktform ist stark auf Claude Code, MCP-Slash-Commands und lokale Hook-Integration zugeschnitten.
- Es ist nicht fuer unsere Paperclip-Reviewer-Lane oder unseren Engine/Role-Template-Ansatz gebaut.
- `.astro` wird nicht unterstuetzt; fuer Revenue Lane #1 ist der Nutzen daher begrenzt.
- Embeddings, VS Code Extension und Visualisierung sind Zusatzschichten, die fuer DGDH aktuell keinen zwingenden Kernnutzen haben.

## Pattern Harvest - welche Code-Patterns oder Architektur-Ideen lohnen sich?

### 1. Lokaler, inkrementeller Sidecar-Graph

Das Tool legt einen lokalen SQLite-Graphen im Repo ab und aktualisiert ihn per `git diff`, File-Hash und Watch-Events nur dort, wo Aenderungen oder Dependents betroffen sind.

Das ist fuer DGDH attraktiv, weil:
- kein externer Dienst noetig ist
- die Daten nah am Repo bleiben
- Review-Kontext billig aktualisierbar wird

### 2. Blast-Radius-Analyse fuer Reviewer

Die eigentlich starke Idee ist nicht "Knowledge Graph" als Buzzword, sondern:
- geaenderte Knoten finden
- 1-2 Hop Nachbarn ueber `calls`, `imports`, `inherits`, `implements` traversieren
- daraus Review-Risiko und Minimal-Kontext ableiten

Das passt direkt zu DGDHs spaeterer Reviewer-Haertung:
- nicht nur Diff lesen
- sondern blast radius sehen
- und Tests / Evidence gegen diese Reichweite pruefen

### 3. Minimaler Review-Context statt Full-Repo-Lesen

`get_review_context` baut aus Graph + Snippets einen kleinen, fokussierten Review-Kontext. Genau dieses Pattern passt zu unserem North-Star-Satz:

> retrieve the smallest useful memory slice, not the broadest possible history

### 4. Sicherheitsdenken fuer lokale Tooling-Schichten

Das Repo zeigt brauchbare Sicherheitsmuster fuer lokale AI-Helfer:
- `repo_root` validieren
- Symlinks skippen
- Namen in Tool-Antworten sanitizen
- Visualisierung gegen XSS haerten

Fuer DGDH wichtig: Auch "nur lokales Review-Tooling" muss als Angriffsoberflaeche ernst genommen werden.

## DGDH Fit - konkreter Bezug zu North Star / Vision / Revenue Lane

### North Star Fit

Starker konzeptioneller Fit.

Warum:
- Es reduziert Kontext statt ihn aufzublaehen.
- Es hilft dem Reviewer, strukturierter und token-sparsamer zu arbeiten.
- Es ist ein gutes Bruecken-Pattern zwischen "scoped memory" und "blast radius".

Besonders passend ist es fuer:
- spaetere Reviewer-Haertung im DGDH-Infrastruktur-Repo
- komplexere Multi-Packet-Aenderungen im Paperclip-Kern
- Situationen, in denen flaches File-Reading Seiteneffekte nicht mehr sauber sichtbar macht

### Vision Fit

Guter Fit zur Vision "Clarity over complexity" und "Autonomy with Governance":
- kein neuer Agentenschwarm
- kein Meta-Theater
- sondern ein enges Hilfsmittel, das Reviews fokussierter macht

Es entlastet David potentiell real, wenn Reviews dadurch schneller und sicherer werden.

### Revenue Lane #1 Fit

Nur begrenzter Fit.

Fuer das Astro/Keystatic-Template ist heute wichtiger:
- sauberes Content-Schema
- Markdown-/Schema-Befuellung
- Ingestion-Normalisierung

Ein Code-Review-Graph ist dort nicht der naechste Hebel, zumal `.astro` aktuell fehlt.

## Empfehlungen - was koennte den North Star bereichern?

Wenn DGDH etwas aus diesem Research uebernimmt, dann in genau dieser Reihenfolge:

1. **Blast Radius als Reviewer-Vorstufe**
   - Vor einem Review geaenderte Files -> betroffene Knoten -> 1-2 Hop Impact berechnen.
   - Ergebnis als kompakte Reviewer-Context-Injection verwenden.

2. **Lokaler Repo-Graph als Sidecar**
   - Kein Cloud-Service, kein globales Memory.
   - Pro Repo ein lokaler, querybarer Graph / Cache.

3. **Inkrementelle Updates statt Voll-Reparse**
   - Nur geaenderte Dateien + Dependents neu berechnen.
   - Besonders wertvoll fuer das `dgdh-werkbank`-Repo.

4. **Review Guidance aus Struktur ableiten**
   - "Wide blast radius", "cross-layer impact", "changed function lacks test coverage" als harte Reviewer-Hinweise.

5. **Nicht zuerst uebernehmen**
   - keine Claude-Code-Plugin-Huelle
   - keine VS Code Extension
   - keine Embeddings-first-Erweiterung
   - keine Visualisierung als Phase-1-Arbeit

Kurz gesagt:

> Uebernehmen wollen wir den lokalen inkrementellen Graphen, Blast-Radius-Review und minimalen Review-Kontext.
> Nicht uebernehmen wollen wir die tool-spezifische Claude/VS-Code-Huelle und Zusatzkomplexitaet ohne direkten Entlastungshebel.

## Ignorieren - was passt nicht zu DGDH und warum?

- **Claude-Code-zentrierte Produktform**: zu eng an ein einzelnes Tool gebunden; DGDH braucht Muster, keine neue Sonderwelt.
- **VS Code Extension / Graph-Visualisierung**: nett, aber kein operativer Kernnutzen fuer die aktuelle Phase.
- **Embeddings / semantische Suche als erster Schritt**: zu frueh, bevor der einfache strukturelle Blast Radius ueberhaupt im Einsatz ist.
- **Einsatz fuer Revenue Lane #1 als Prioritaet**: der direkte Nutzen ist dort zu klein gegenueber Ingestion- und Content-Automation.

## Kurzfazit

`code-review-graph` ist **kein** "einfach installieren und DGDH ist fertig"-Baustein.

Es ist aber ein **starker Pattern-Spender** fuer eine spaetere DGDH-Reviewer-Haertung:
- lokaler Sidecar-Graph
- inkrementelle Updates
- Blast Radius
- minimaler Review-Kontext

Empfohlene Haltung:

> Nicht integrieren als Produktuebernahme.
> Spaeter gezielt die 2-3 Kernideen in die DGDH-Reviewer-/Engine-Schicht uebersetzen, wenn Review-Tokenverbrauch oder Seiteneffekt-Blindheit im Infrastruktur-Repo wirklich zum Bottleneck werden.
