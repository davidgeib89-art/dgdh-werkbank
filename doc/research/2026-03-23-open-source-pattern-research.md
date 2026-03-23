# Open-Source Pattern Research & Reflexion

Status: Research abgeschlossen
Datum: 2026-03-23
Auftraggeber: David (CEO) / Planer
Rolle: Researcher (Gemini CLI)

## 1. Executive Summary
Diese Untersuchung bewertet, wie DGDH Open-Source-Muster (insbesondere aus `huggingface/skills` und angrenzenden Agenten-Workflows) strategisch nutzen kann.
**Kernurteil:** DGDH hat den grundlegenden Architektur-Pfad (CEO -> Worker -> Reviewer) bereits exakt richtig gewaehlt, was durch aktuelle OSS-Muster (z.B. GitHub Agentic Workflows, "Drop-box"-Pattern) stark validiert wird. Das `huggingface/skills`-Pattern der "Progressive Disclosure" (Wissen nur laden, wenn getriggert) ist hochrelevant, um Prompt-Token-Kosten niedrig zu halten.
**Aber:** Die Implementierung solcher Skill-Systeme ist aktuell **LATER/BACKLOG**, da sie den "Focus Freeze" (Firmenloop boringly reliable machen) nicht direkt bedienen. Hoher Hebel liegt jetzt stattdessen im "Drop-box"-Kommunikationsmuster (strukturierte Markdown-Handoffs), welches den Review-Loop sofort stabilisiert.

## 2. Ausgangslage DGDH
Gemaess `INIT.md`, `MEMORY.md`, dem `Focus Freeze` und dem `Leitdokument` befindet sich DGDH in der Prototyping-Phase der Firmenfaehigkeit.
- **Ziel:** Der Firmenloop (`Mission -> CEO -> Worker -> Reviewer -> Merge -> Summary`) muss "boringly reliable" werden.
- **Regel:** Echte Entlastung > Agenten-Theater.
- **Restriktion:** Keine neue Meta-Architektur, wenn sie den aktuellen Loop nicht robuster macht (Anti-Drift).

## 3. Was ist `huggingface/skills`?
Es ist ein Repository von Hugging Face, das standardisierte "Expertisen" fuer AI-Agenten (wie Claude Code, Cursor, Gemini CLI) bereitstellt.
Jeder Skill (z.B. Datensatzerstellung, Modeltraining) ist ein in sich geschlossener Ordner, der enthaelt:
- `SKILL.md`: Ein Manifest mit Metadaten (Wann triggern?), Anweisungen und Best Practices.
- Ausfuehrbare Skripte (z.B. Python/Shell) zur Automatisierung.
- Referenzdokumentationen fuer Edge-Cases.

## 4. Analyse: Pattern vs. Spezialfall
- **Der Spezialfall (NICHT fuer DGDH):** Der inhaltliche Fokus auf Machine Learning, vLLM, GGUF-Konvertierung oder Hugging Face Jobs. Das ist reiner Domaenen-Inhalt.
- **Das echte Pattern (Fuer DGDH relevant):** *Progressive Disclosure* (Schrittweise Offenlegung).
  Anstatt einen Agenten (Worker) mit einem gigantischen System-Prompt vollzustopfen, der alle moeglichen Werkzeuge und Konventionen enthaelt, bleibt der Basis-Prompt schlank. Erst wenn der Agent eine spezifische Aufgabe erkennt, laedt er via Manifest (`SKILL.md`) das spezifische prozedurale Wissen (z.B. "Wie befuelle ich ein Keystatic-Schema bei DGDH richtig?").

## 5. Weitere relevante Open-Source-Referenzen
- **`AGENTS.md` (Emerging Standard):** Ein Repository-weites Manifest, das als "README fuer Agenten" fungiert (Tech-Stack, Code-Conventions, Test-Commands). DGDH macht dies bereits hervorragend mit `INIT.md` und `MEMORY.md`.
- **Squad / GitHub Agentic Workflows / OAC (OpenAgentsControl):** Frameworks, die exakt das DGDH "Trinity"-Modell (Planner -> Worker -> Reviewer) nutzen, um Halluzinationen zu minimieren und sichere Git-Operationen (Safe Outputs via Branches/Worktrees) zu gewaehrleisten.

## 6. Speziell: Git-/PR-/Merge-/Review-/Agent-Workflow-Muster
Zwei Muster aus der OSS-Welt sind fuer DGDH extrem validierend und direkt anwendbar:

1.  **Das "Drop-box"-Pattern (Asynchrone State-Uebergabe):**
    OSS-Agent-Systeme weichen von endlosen Chat-Verlaeufen ab. Stattdessen kommunizieren Rollen (Planner -> Worker), indem sie strukturierte Markdown-Bloecke (z.B. `plan.md`, `decisions.md`) in das Repo oder Issue schreiben und lesen.
    *DGDH-Bezug:* Das entspricht genau der Idee des strukturierten Handoff-Summaries (Goal, Result, Files, Blockers) aus der `North Star Roadmap` (inspiriert durch ReMe/PentAGI).
2.  **Evaluator-Optimizer / Critic Gate:**
    Ein "Worker" darf niemals direkt nach Main mergen. OSS-Workflows erzwingen ein "Critic Gate" (Reviewer), das zwingend statische Analyse (Tests/Lint) und einen Diff-Vergleich gegen den Plan durchfuehrt, bevor der PR gemergt wird.
    *DGDH-Bezug:* Dies untermauert die DGDH-Entscheidung, den Reviewer als harten Stopper (`accepted` / `needs_revision`) zu implementieren.

## 7. Was DGDH spaeter uebernehmen sollte
- **Die standardisierte Skill-Architektur (`SKILL.md`):** Sobald die Werkbank viele verschiedene Aufgaben (Revenue Lanes) kann (z.B. Bilder prozessieren, Keystatic befuellen, Scraping), sollten diese Anweisungen aus dem Worker-Prompt in standardisierte Skills ausgelagert werden, die der CEO-Agent dem Worker bei der Delegation mitgibt.
- **Striktes "Drop-box" Handoff via Issues/Git:** Die Kommunikation zwischen CEO, Worker und Reviewer muss rein ueber maschinen- (und menschen-) lesbare Markdown-Artefakte im Issue (oder PR-Kommentaren) laufen, nicht ueber unsichtbare Context-Windows der Engine.

## 8. Was DGDH bewusst NICHT uebernehmen sollte
- **Komplexe Graph-Orchestrierungs-Frameworks (z.B. LangGraph, AutoGen):** DGDH braucht keine dynamischen, sich selbst-organisierenden Graphen, in denen Agenten frei debattieren. Die starre Kette (`CEO -> Worker -> Reviewer`) ueber die bestehende REST-API und GitHub Issues ist deutlich robuster (Boringly Reliable).
- **Das Rad fuer Code-Verstaendnis neu erfinden:** Keine eigenen Embeddings/Vector-DBs bauen, solange Flash-Lite / billige Gemini-Tiers (oder MiniMax) ganze Repos/Worktrees dank grossem Kontextfenster einfach lesen koennen.

## 9. Empfohlene Reihenfolge / Timing
Gemaess Anti-Drift-Regel und Focus Freeze ordnen sich diese Erkenntnisse wie folgt ein:

### GO NOW (Integrierbar in den aktuellen Sprint)
- **Handoff-Struktur haerten:** Sicherstellen, dass der Worker am Ende seines Sprints sein Ergebnis *strikt* im Handoff-Format (`Goal`, `Result`, `Files Changed`, `Blockers`, `Next`) hinterlaesst (Drop-box Pattern). Dies erhoeht die Reviewer-Zuverlaessigkeit (Prioritaet 1 des Focus Freeze) sofort und ohne Architektur-Umbau.

### SOON (Nachdem der Firmenloop E2E fehlerfrei laeuft)
- **Skill-Extraction fuer `verein`:** Wenn die `verein`-Capability ("primitive to better") gebaut wird, packe die spezifischen Mapping-Regeln nicht in den Haupt-Worker-Prompt, sondern teste das `huggingface/skills`-Pattern im Kleinen: Ein Dokument `skills/keystatic-verein/SKILL.md`, das der Worker nur fuer diese Aufgabe liest.

### LATER (Phase der Skalierung)
- **Volle Skill-Creation Engine:** Automatisiertes Erstellen und Katalogisieren von Skills (`SKILL.md`) durch Agenten, wenn ein neuer Use-Case erfolgreich manuell geloest wurde (wie in der North Star Roadmap unter Punkt 19 beschrieben).

### BACKLOG
- Telegram-Notifications, komplexe Multi-Worker-Parallelisierung, dynamische Toolset-Auswahl pro Skill (vorerst reicht das `targetFolder` / Scope-Prinzip).

## 10. Konkreter spaeterer Minimal-Sprint (Pattern Adaption)
**Titel:** "Progressive Disclosure fuer Revenue Lane #1"
**Ziel:** Den Worker-Prompt um 40% kuerzen und domanenspezifisches Wissen dynamisch laden.
**Schritte:**
1. Erstelle `server/config/skills/keystatic-content/SKILL.md`.
2. Lagere alle Astro/Keystatic-spezifischen Befuellungsmuster aus dem Worker-System-Prompt dorthin aus.
3. Der CEO-Agent erhaelt die Anweisung: "Wenn Paket Astro/Keystatic betrifft, setze `requiredSkill: 'keystatic-content'` im Task-Briefing."
4. Die Engine (oder der Worker selbst via Tool) liest dieses `SKILL.md` nur dann ein, wenn es im Briefing gefordert ist.
**Warum gut:** Erhoeht Skalierbarkeit der Firma, spart Tokens, erhoeht Fokus des Workers.
