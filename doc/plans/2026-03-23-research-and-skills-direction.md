# DGDH Research, Skills & Guardrail Direction

Datum: 2026-03-23
Status: Kanonische Richtungslesart (gewollter Zielpfad, kein sofortiger Sprint-Umbau)
Zweck: Sichert ab, dass gewollte Konzepte (Skills, OSS-Muster, Guardrail-Logik) nicht vergessen werden, waehrend DGDH operativ im Focus Freeze den Firmenloop absichert.

## 1. Generelle RESEARCHER-Haltung
DGDH arbeitet verstaerkt in einer proaktiven Researcher-Haltung.
- Wir suchen aktiv in Open-Source-Repos (wie GitHub Agentic Workflows, HuggingFace, etc.) nach Mustern, die Probleme bereits gut loesen.
- Schwerpunkte fuer OSS-Lernen: Git/PR-Workflows, Agent-Skills, Review-Muster, Drop-box/Handoff-Kommunikation.
- Prinzip: Nichts blind kopieren. Wir uebernehmen nur Muster, die reale Firmenfaehigkeit erhoehen oder Zeit sparen. Das Rad wird nicht neu erfunden.

## 2. Skills & Progressive Disclosure (Gewollte spaetere Richtung)
Der Einsatz von Skills (im Stil von `huggingface/skills`) ist strategisch gewollt.
- **Warum:** Der allgemeine Worker darf nicht mit endlosen Domaenen-Regeln (z.B. spezifischen Keystatic-Mustern) im Main-Prompt ueberladen werden, soll aber in seinem allgemeinen Arbeitsvermoegen offen bleiben.
- **Progressive Disclosure:** Spezifisches prozedurales Wissen und feste Ablaeufe werden in Skills (`SKILL.md` oder aehnliche Artefakte) ausgelagert. Diese werden nur dann geladen, wenn eine Aufgabe es wirklich erfordert.
- **Vorteil:** Haelts Tokens niedrig, erhoeht den Fokus des Workers und standardisiert wiederkehrende Spezialaufgaben.

## 3. Semantisches Codebase-Verstaendnis (Auf dem Radar)
Muster wie `SocratiCode` (search before reading, Shared-Index-Denken, Kontext-Artefakte) duerfen nicht aus dem Blick geraten.
- Das ist ein gewollter spaeterer Hebel, um das Repo-Verstaendnis der AI-Rollen zu skalieren.
- Keine sofortige Implementierung, aber als wichtige Architektur-Perspektive fuer spaeter gesetzt.

## 4. Guardrail-Logik der Firma
Guardrails sind in DGDH nicht ueberall gleich stark, sondern asymmetrisch verteilt – wie in einer echten Firma:
- **Oben (CEO / Planer):** Mehr Urteilsraum, Offenheit fuer strategische Abwaegung, Forschung und Richtungsdenken. Weniger starre Fesseln.
- **Mitte (Worker):** Enger gefuehrt. Klarer, begrenzter Aufgabenrahmen.
- **Unten / Spezial (Skills):** Wiederkehrende Spezialroutinen werden in Skills mit festen, hoch-spezifischen Guardrails und automatisierten Ablaeufen gebuendelt.

## 5. CEO-Modell-Richtung
Die gewuenschte operative Prioritaet fuer die CEO-Rolle lautet aktuell:
1. **Gemini Pro** (bevorzugt, fuer bestes Planungs- und Urteilsvermoegen)
2. **Gemini Flash** (erster Fallback, wenn Pro-Quota erschoepft ist)
3. **Gemini Flash-Lite** (letzter Fallback)

*Ausblick:* Mittelfristig ist es plausibel und gewollt, starke Modelle wie Claude oder Codex als CEO einzusetzen. Dies ist eine spaetere Richtungsentscheidung, wird hier aber schon als plausibler Pfad markiert.

## 6. Operative Einordnung (Anti-Drift)
- Der aktuelle Fokus liegt weiterhin zu 100% auf **Firmenloop / E2E Zuverlaessigkeit** (`Focus Freeze`).
- Die hier dokumentierten Richtungen (Skills, Codebase-Intelligenz, OSS-Adaption) sind *nicht* als Ausrede gedacht, jetzt in Architektur-Drift zu verfallen.
- Sie sind hier sicher verwahrt, damit alle AIs wissen: "Ja, das ist der gewollte Weg, aber wir bauen es erst, wenn das Fundament (der Loop) absolut verlaesslich traegt."