# DGDH Re-Sync State

## 1. Zielbild

- DGDH baut eine menschlich gefuehrte, governance-basierte AI-Operationsplattform: auditierbar, token-diszipliniert, rollenbasiert und klar stoppbar.
- Paperclip ist darin das technische Substrat: Runtime, Adapter-Orchestrierung, Heartbeats, Events, Governance- und Kostenmechanik. Es ist die Basis, nicht die DGDH-Identitaet.
- David bzw. das Board ist die finale Autoritaet fuer Richtung, Budget, Freigaben, Stop/Kill und GO/WARNUNG/NO-GO-Entscheidungen.
- Die spaetere Agentenfirma ist als klar getrennte Rollenarchitektur gedacht: Strategy/Planner, Builder/Executor, Research/Review plus Board-Kontrolle.
- Das Zielbild ist nicht "freie Agentenautonomie", sondern Mensch-Maschine-Symbiose mit expliziter Governance.

## 2. Was Paperclip als Basis bereits mitbringt

- Runtime- und Ausfuehrungsbasis mit Agent-Profilen, Session-/Run-Kontext, Adapter-Execution und kontrollierter Prozessausfuehrung.
- Heartbeat-Lifecycle mit Run-Historie, Event-Stream und Logs; inklusive adapter.invoke-Events und Lifecycle-Stages.
- Governance- und Control-Faehigkeiten als bestehende Plattformfunktion: Budgets, Freigabelogik, Board-nahe Steuerung, Stop/Pause-Muster.
- Adapter-Oekosystem (u. a. Gemini-local) mit standardisierter Meta-Telemetrie.
- Beobachtbarkeit und Nachvollziehbarkeit als vorhandene Basis (Events, Usage, Audit-Spuren), plus Build/Test-Infrastruktur.

## 3. Was wir darueber neu aufgebaut haben

- DGDH-Governance- und Strategie-Stack in company-hq: Constitution, Autonomy/Budget/Idle/Escalation, Platform Vision, Token Economy, Role Routing.
- Minimal-Core-Idee als verbindlicher Prompt-Vertrag mit Layer-Reihenfolge und Delta-Prinzip (kleiner stabiler Core, kleine taskbezogene Deltas).
- Rollen-/Routing-Vertrag als Architekturziel: Role -> Adapter -> Model -> Budget -> Approval, mit klaren Scope- und Tool-Grenzen.
- Shared-Memory-Pilot als spaeterer Baustein spezifiziert: Rechte, Proposal-vs-Promotion, Board-Freigabe fuer kanonisches Company Memory.
- Resolver-/Preflight-/Shadow-Arbeit konkretisiert und teilweise technisch angeschlossen: Schema/Validator, Single-File-Preflight, promptResolverDryRunPreflight und promptResolverShadow.
- Gate-/Board-/Ops-Dokumente fuer genau einen kontrollierten Live-Probe vorbereitet (inkl. Schwellenwerte, Stop-Trigger, Readout-Template).

## 4. Was aktuell schon live wirksam ist

- Wirklich live/wirksam:
  - Paperclip-Basisbetrieb (Runtime, Adapter-Execution, Heartbeat/Event-Observability, bestehende Governance-Kontrollen).
  - Mensch + Copilot als aktuelle Build-Lane.
- Wirklich shadow/read-only:
  - Prompt-Resolver-bezogene Telemetrie im Gemini-nahen Pfad (Preflight/Shadow) wird erhoben, aber steuert keine produktive Enforcement-Umschaltung.
  - Gate-Auswertung ist als Entscheidungs-/Review-Helfer vorhanden, nicht als automatische Runtime-Umschaltung.
- Nur dokumentiert/vorbereitet:
  - Controlled-Live-Probe-01 Board Packet, Ops Checklist, Decision Brief, Gate-Regeln und Stop-Bedingungen.
- Bewusst noch nicht aktiviert:
  - Keine automatische Shadow->Enforcement-Schaltung.
  - Kein Default-Path-Prompt-Rewrite im produktiven Standardpfad.
  - Keine breite autonome Multi-Agent-Live-Architektur.
  - Kein Shared Memory als live-kanonische Plattformfunktion.
  - Kein Probe-Start in diesem Sprint laut Decision Brief.

## 5. Richtige Reihenfolge

- Schritt 1 (jetzt): Basis token-effizient und governance-fest machen (Minimal-Core, Prompt-Layering, Scope/Tool/Approval-Regeln, Resolver-/Preflight-/Shadow-Readiness).
- Schritt 2 (jetzt): Board- und Ops-Readiness fuer genau einen engen Controlled-Live-Probe finalisieren.
- Schritt 3 (erst nach explizitem Board-GO): genau ein Probe innerhalb harter Scope-Box (ein Agent, eine Lane, ein Task-Typ, ein Zeitfenster).
- Schritt 4 (direkt danach): Readout nach fixem Schema und Entscheidung GO-kompatibel/WARNUNG/NO-GO.
- Shared Memory steht bewusst nicht am Anfang: es ist Prioritaet 2 nach Stabilisierung des token-effizienten Minimal-Core.
- Live-Probes stehen vor breiter Architektur-Aktivierung, aber nur als kontrollierte Einzelprobe.
- Stage 2+ ist erst danach: breitere Lane-Aktivierung, staerkere Automation, Promotion-Automatik, erweitertes Multi-Agent-Betriebsmodell.

## 6. Warum wir das so machen

- Nicht einfach live umbauen, weil sonst Governance und Audit nicht vorauslaufen, sondern hinterherlaufen wuerden.
- Token-Effizienz entsteht zuerst durch stabilen Minimal-Core und Delta-Kontext, nicht durch fruehe Ausweitung autonomer Laufzeit.
- Shadow-first reduziert Risiko: erst messen und vergleichen, dann erst kontrolliert Verhalten freigeben.
- Board-Gates erzwingen klare Freigabe, Stop-Bedingungen und Rollback-Faehigkeit statt impliziter Expansion.
- Rollen-/Routing-Disziplin ist Voraussetzung fuer eine spaetere Multi-Agent-Firma; ohne diese Basis steigen Drift, Kosten und Steuerungsverlust.

## 7. Aktueller Meilenstein

- Aktueller Architektur-/Technik-Meilenstein: Resolver-/Preflight-/Shadow-Faehigkeiten sind im relevanten Pfad verankert, inkl. Gate-Review-Logik und notwendiger Telemetrieform.
- Aktueller operativer Meilenstein: Probe-01 Governance-Paket ist board-ready als Entscheidungsgrundlage.
- Groesste offene operative Luecke: startkritische Fill-ins fuer Probe-01 sind noch offen (finale Schwellenwerte, finale Agent/Lane/Window-IDs, Stop-Owner, Readout-Owner und Due-Time).
- Naechste sinnvolle Board-Entscheidung: WARNUNG aktiv halten, bis alle Fill-ins verbindlich eingetragen und sign-off-faehig sind; danach explizite GO/WARNUNG/NO-GO-Startentscheidung fuer genau eine Probe.

## 8. Kurzfassung fuer David

- Wir bauen DGDH als menschlich gefuehrte, governance-basierte Plattform, nicht nur als "Paperclip nutzen".
- Paperclip ist unser technisches Fundament, aber DGDH ist die darueberliegende Firmen- und Governance-Architektur.
- Shared Memory bauen wir jetzt noch nicht live; das kommt spaeter als Stage-1-Pilot nach der Basisstabilisierung.
- Ja, aktuell kommt zuerst Token-Effizienz und Kontrollierbarkeit der Basis.
- Wir bauen den Paperclip-Core derzeit nicht breit live um, sondern arbeiten mit resolver-/preflight-/shadow-faehiger Schicht in read-only Form.
- Die neue Architektur wird noch nicht breit live getestet; vorbereitet ist ein einzelner kontrollierter Probe unter Board-Gate.
- Board-Status bleibt WARNUNG, bis alle startkritischen Fill-ins sauber gesetzt sind.
- Erst dann darf genau ein enger Probe gestartet werden.
- Danach entscheidet ein fixes Readout ueber GO-kompatibel, WARNUNG oder NO-GO.
- Kurz: Reihenfolge ist Basis stabilisieren -> einen Probe kontrolliert fahren -> erst danach schrittweise ausweiten.
