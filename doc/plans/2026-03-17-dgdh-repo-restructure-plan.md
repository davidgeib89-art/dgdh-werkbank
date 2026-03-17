# DGDH Repo Restructure Plan

Date: 2026-03-17
Status: Draft approved for safe local execution
Owner: David + Copilot

## 1. Ist-Zustands-Audit

### 1.1 Gefundene Verzeichnisse unter DGDH

- Root: `C:/Users/holyd/DGDH`
- Hauptkandidaten:
  - `repos/paperclip-main`
  - `worktrees/paperclip-codex`
  - `worktrees/paperclip-claude`
  - `worktrees/paperclip-gemini`
- Außendoku (nicht in Git):
  - `company-hq`

### 1.2 Git-Typklassifizierung

- Echtes Git-Hauptrepo (worktree root):
  - `repos/paperclip-main`
- Registrierte Git-Worktrees desselben Repos:
  - `worktrees/paperclip-codex` (branch `codex-work`)
  - `worktrees/paperclip-claude` (branch `claude-work`)
  - `worktrees/paperclip-gemini` (branch `gemini-work`)
- Nicht versionierte Außendoku:
  - `company-hq`

### 1.3 Remotes (konsistent in allen Worktrees)

- `origin`: `https://github.com/davidgeib89-art/paperclip.git`
- `upstream`: `https://github.com/paperclipai/paperclip.git`
- weitere Remotes: keine gefunden

### 1.4 Paperclip-Referenzen (operativ relevant)

#### Runtime/Config

- `.paperclip/config.json` in aktivem Worktree vorhanden:
  - Pfad: `worktrees/paperclip-codex/.paperclip/config.json`
  - nutzt `~/.paperclip-worktrees/instances/codex-work/...`
  - enthält Paperclip-spezifische runtime keys (Datenverzeichnisse, Ports, Logging)

#### Env / Deploy / Start

- `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID`, `PAPERCLIP_PORT` tief im Runtime- und CLI-Stack verankert.
- `docker-compose.*`, `doc/DEVELOPING.md`, `docs/deploy/*` referenzieren dieselben Variablen.
- Diese Referenzen sind technisch korrekt und sollen kurzfristig nicht umbenannt werden.

#### Struktur-/Pfadnennung

- Top-Level-Docs außerhalb des Repos benennen noch `paperclip-*` Layout:
  - `README.md`
  - `SETUP-COMPLETE.md`
- Außendoku `company-hq/*` referenziert teils `../worktrees/paperclip-codex/...`.

## 2. Empfohlene Zielstruktur

```text
~/DGDH/
  repos/
    dgdh-platform/              <- kanonisches Hauptrepo (aus heutigem paperclip-main)
  worktrees/
    dgdh-gemini/                <- optional aktiv
    dgdh-codex-dormant/         <- optional dormant
    dgdh-claude-dormant/        <- optional dormant
  archive/
    paperclip-legacy/           <- optionale Altablage (nur bei Bedarf)
```

Pragmatische Zwischenstruktur (sofort, ohne riskante Moves):

```text
~/DGDH/
  repos/
    paperclip-main/             <- ab jetzt kanonisches DGDH-Hauptrepo (nur Name legacy)
      company-hq/               <- versionierte Governance- und Strategy-Quelle
  worktrees/
    paperclip-gemini/           <- optional aktiv
    paperclip-codex/            <- dormant
    paperclip-claude/           <- dormant
```

## 3. Warum diese Basis

1. `repos/paperclip-main` ist das echte Git-Hauptrepo mit kompletter Historie.
2. Alle existierenden Worktrees sind bereits daran registriert.
3. `origin` und `upstream` sind sauber vorhanden; Upstream-Bindung bleibt erhalten.
4. Keine riskante Historienmigration notwendig, um sofort Ordnung zu schaffen.

## 4. Migrationsplan (schrittweise, risikoarm)

### Phase A: Sofort (safe, minimal-invasiv)

1. Kanonisches Hauptrepo definieren: `repos/paperclip-main`.
2. `company-hq` in dieses Repo integrieren (kopieren/spiegeln, nicht verschieben/löschen).
3. Betriebsnotiz erstellen: aktiv/dormant/legacy eindeutig dokumentieren.
4. Top-Level-Doku angleichen, damit nur noch ein aktives Zentrum sichtbar ist.

### Phase B: Kontrolliert manuell (potenziell riskant)

1. Lokales Verzeichnis optional umbenennen:
   - `repos/paperclip-main` -> `repos/dgdh-platform`
2. Worktree-Pfade optional konsolidieren:
   - z. B. `paperclip-gemini` -> `dgdh-gemini`
3. Nur nach Backup und verifiziertem `git worktree repair` / Re-Register-Schritt.

### Phase C: Remote/Identity

1. GitHub-Repo-Strategie entscheiden:
   - Option 1: bestehendes Repo umbenennen (Historie bleibt)
   - Option 2: neues `dgdh-platform` Repo, Mirror-Migration mit Historie
2. `upstream` auf `paperclipai/paperclip` beibehalten.
3. `origin` auf DGDH-Identität umstellen, sobald bereit.

## 5. Was aktiv / dormant / legacy sein soll

### Aktiv

- Kanonische Heimat: `repos/paperclip-main` (bis zur expliziten Umbenennung)
- Kontrollierte Live-Lane: Gemini

### Dormant

- Worktrees `paperclip-codex` und `paperclip-claude`
- keine autonomen Heartbeats, keine Zuweisungsautomation

### Legacy

- Paperclip-Namensreste in Pfaden/Dokus sind Legacy-Labels, nicht mehr Produktidentität
- top-level `company-hq` wird als Übergangsquelle betrachtet, nicht als zukünftige Wahrheit

## 6. Risikominimierung

1. Keine destruktiven Deletes in diesem Sprint.
2. Kein physisches Umbenennen des Git-Hauptordners in einem automatischen Schritt.
3. Keine stillschweigende Worktree-Entfernung.
4. Alle riskanten Schritte als manuell auszuführend markieren.

## 7. Definition of Done Mapping

1. Audit dokumentiert: ja (dieses Dokument)
2. Ein kanonisches Hauptrepo benannt: ja (`repos/paperclip-main` als sofortige Kanonik)
3. `company-hq` versioniert im Hauptrepo: umgesetzt (`worktrees/paperclip-codex/company-hq`)
4. Paperclip nur als Upstream/Herkunft: durch Zielstruktur und Betriebsnotiz festgelegt
5. Dormant-/Archive-Strategie: enthalten
6. Verständlichkeit für spätere AIs: durch Betriebsnotiz + klare Statuslisten
