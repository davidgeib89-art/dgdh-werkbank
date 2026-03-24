# DGDH Research, Skills & Guardrail Direction

Datum: 2026-03-23
Status: Kanonische Richtungslesart (gewollter Zielpfad, kein sofortiger Sprint-Umbau)
Zweck: Sichert ab, dass gewollte Konzepte wie Skills, OSS-Muster, Guardrail-Logik und ein spaeterer Research-Spezialpfad nicht vergessen werden, waehrend DGDH operativ im Focus Freeze den Firmenloop absichert.

## 1. Generelle RESEARCHER-Haltung

DGDH arbeitet verstaerkt in einer proaktiven Researcher-Haltung.

- Wir suchen aktiv in Open-Source-Repos nach Mustern, die Probleme bereits gut loesen.
- Schwerpunkte fuer OSS-Lernen: Git/PR-Workflows, Agent-Skills, Review-Muster, Drop-box/Handoff-Kommunikation.
- Prinzip: Nichts blind kopieren. Wir uebernehmen nur Muster, die reale Firmenfaehigkeit erhoehen oder Zeit sparen.

## 1.1 Researcher als spaeterer Spezialpfad

Neu kanonisiert:

- Research ist fuer DGDH spaeter wahrscheinlich nicht nur eine Haltung
- sondern auch ein bewusst nutzbarer Spezialpfad / Spezialmitarbeiter in der Firmenlogik
- andere Rollen sollen wissen, dass sie Research gezielt einschalten koennen

Der ausfuehrlichere Richtungsanker dazu steht in:

- `doc/plans/2026-03-23-research-role-and-skill-invocation-direction.md`

## 1.2 OSS-Filter statt Copycat-Reflex

Neu geschaerft durch die 724-office-Reflexion:

- DGDH untersucht fremde Repos nicht, um ganze Produktformen zu kopieren
- sondern um Primitive zu extrahieren, die ein echtes DGDH-Problem loesen
- die wichtigste Frage ist immer: `jetzt / bald / spaeter / nicht dran`

Das aktuelle Beispiel dafuer ist:

- `company-hq/research/2026-03-24-724-office-dgdh-transfer-matrix.md`
- `company-hq/research/2026-03-24-airweave-dgdh-transfer-matrix.md`

Die dortige Verdichtung bestaetigt vor allem:

- file-layered identity ist stark
- visible primitives sind wertvoller als neue Framework-Magie
- Memory ist als Kompressions- und Retrieval-Pipeline relevant
- Scheduler und Diagnostics sind spaetere Operator-Hebel
- Retrieval ist als spaetere Capability-Schicht relevant, aber nicht als neuer Plattform-Sprint
- Domain / Adapter / Protocol-Trennung ist nicht Architekturdeko, sondern Schutz gegen spaetere Systemmasse

Und gleichzeitig:

- `self-evolving` als Leitnarrativ ist fuer DGDH jetzt nicht dran
- runtime tool creation ist aktuell zu driftgefaehrlich
- personal-assistant-first ist nicht DGDHs Hauptform
- retrieval-platform-first ist nicht DGDHs Hauptform

## 2. Skills & Progressive Disclosure

Der Einsatz von Skills (im Stil von `huggingface/skills`) ist strategisch gewollt.

- **Warum:** Der allgemeine Worker darf nicht mit endlosen Domaenen-Regeln im Main-Prompt ueberladen werden, soll aber in seinem allgemeinen Arbeitsvermoegen offen bleiben.
- **Progressive Disclosure:** Spezifisches prozedurales Wissen und feste Ablaeufe werden in Skills (`SKILL.md` oder aehnliche Artefakte) ausgelagert. Diese werden nur dann geladen, wenn eine Aufgabe es wirklich erfordert.
- **Vorteil:** Haelt Tokens niedrig, erhoeht den Fokus des Workers und standardisiert wiederkehrende Spezialaufgaben.

Wichtige Klarstellung:

- Skills sind nicht dasselbe wie ein `Researcher`
- ein `Researcher` waere spaeter eine Rolle / ein invokebarer Spezialpfad mit Urteilsraum
- Skills sind das spaetere Zuhause fuer standardisierte Spezialprozeduren innerhalb dieses Pfads
- Skills sind fuer DGDH spaeter vor allem prozedurale Promotion von bewaehrten Mustern - nicht das Lernen selbst und nicht Ersatz fuer Firmengedachtnis

## 3. Semantisches Codebase-Verstaendnis

Muster wie `SocratiCode` (search before reading, Shared-Index-Denken, Kontext-Artefakte) duerfen nicht aus dem Blick geraten.

- Das ist ein gewollter spaeterer Hebel, um das Repo-Verstaendnis der AI-Rollen zu skalieren.
- Keine sofortige Implementierung, aber als wichtige Architektur-Perspektive fuer spaeter gesetzt.

## 4. Guardrail-Logik der Firma

Guardrails sind in DGDH nicht ueberall gleich stark, sondern asymmetrisch verteilt wie in einer echten Firma:

- **Oben (CEO / Planer):** Mehr Urteilsraum, Offenheit fuer strategische Abwaegung, Forschung und Richtungsdenken.
- **Mitte (Worker):** Enger gefuehrt. Klarer, begrenzter Aufgabenrahmen.
- **Unten / Spezial (Skills):** Wiederkehrende Spezialroutinen werden in Skills mit festen, hochspezifischen Guardrails und automatisierten Ablaeufen gebuendelt.

Zwischen Worker und Skill ist spaeter ein zusaetzlicher Spezialpfad plausibel:

- **Researcher / Research-Pfad:** offener als ein enger Skill, aber gezielter und research-lastiger als der allgemeine Worker
- zustaendig fuer OSS-Muster, externe Quellen, Dokumentation, offene Spezialfragen und Verdichtung in brauchbare Handoffs

## 5. CEO-Modell-Richtung

Die gewuenschte operative Prioritaet fuer die CEO-Rolle lautet aktuell:

1. **Gemini Pro** (bevorzugt, fuer bestes Planungs- und Urteilsvermoegen)
2. **Gemini Flash** (erster Fallback, wenn Pro-Quota erschoepft ist)
3. **Gemini Flash-Lite** (letzter Fallback)

Ausblick:

- Mittelfristig ist es plausibel und gewollt, starke Modelle wie Claude oder Codex als CEO einzusetzen.
- Das ist eine spaetere Richtungsentscheidung, kein aktueller Umbauauftrag.

## 6. Operative Einordnung (Anti-Drift)

- Der aktuelle Fokus liegt weiterhin zu 100% auf **Firmenloop / E2E-Zuverlaessigkeit** (`Focus Freeze`).
- Die hier dokumentierten Richtungen (Skills, Research-Spezialpfad, Codebase-Intelligenz, OSS-Adaption) sind nicht als Ausrede gedacht, jetzt in Architektur-Drift zu verfallen.
- Sie sind hier sicher verwahrt, damit alle AIs wissen: "Ja, das ist der gewollte Weg, aber wir bauen es erst, wenn das Fundament absolut verlaesslich traegt."

Fuer den neuen Researcher-Gedanken gilt ausdruecklich:

- jetzt sauber dokumentieren und einplanen: **ja**
- sofort als neuen Multi-Agent-Sprint operationalisieren: **nein**

Und fuer OSS-Research allgemein:

- Primitive uebernehmen: **ja**
- ganze Produktidentitaeten nachspielen: **nein**
