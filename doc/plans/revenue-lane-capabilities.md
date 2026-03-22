# Revenue Lane Capabilities

Stand: 2026-03-22  
Zweck: ehrliche Faehigkeits- und Gap-Analyse fuer den Schritt von Prototyp zu wiederverwendbarer Plattform.

## 1) Image Pipeline (`deterministic_tool`)

Heute vorhanden:
- deterministic Verarbeitung mit `sharp`
- smarte Ausschnitte (`hero` 16:9, `gallery` 4:3, `thumb` 1:1)
- Format-Matrix (`webp` primaer, `jpg` fallback)
- Zielgroesse unter 200 KB
- manifest-basiertes, maschinenlesbares Output-Artefakt

Generische Nutzung ueber Ferienwohnung hinaus:
- Friseur: Teamfotos, Salon-Interior, Before/After-Galerie
- Restaurant: Gerichte, Ambiente, Team, Events
- Handwerk: Referenzprojekte, Werkstatt, Team, Material

Aktuelle Gaps:
- keine inhaltssensitive Priorisierung (z. B. "wichtigstes Bild" pro Branche)
- keine QA-Regeln fuer Unschaerfe/Belichtung
- keine Varianten fuer Social/Ads-Formate

## 2) Content Extractor (`free_api`, Gemini Flash-Lite)

Heute vorhanden:
- liest Textquellen aus Kundenordnern
- extrahiert in strukturierte Draft-Felder (`name`, `description`, `highlights`, `amenities`, `pricing`, `location`, `contact`)
- halluziniert nicht; fehlende Werte bleiben `null`
- `no_input`-Fallback ohne Crash

Generische Nutzung:
- Friseur: Leistungen, Oeffnungszeiten, Standort, Kontakt
- Restaurant: Speisekonzept, Zeiten, Lage, Reservierungskontakt
- Handwerk: Leistungsportfolio, Einsatzgebiet, Kontaktwege

Aktuelle Gaps:
- PDF/OCR-/Scan-Robustheit begrenzt
- keine priorisierte Quellengewichtung (z. B. Website-Text vs. WhatsApp-Notizen)
- keine automatische Widerspruchserkennung zwischen Quellen

## 3) Schema Fill (`deterministic_tool`)

Heute vorhanden:
- deterministisches Mapping von `manifest.json` + `content-draft.json` auf Template-Content
- Platzhalter statt leerer Felder
- `site-output` als isoliertes, reviewbares Artefakt

Generische Nutzung:
- kann fuer jede Branche wiederverwendet werden, wenn Feld-Mapping/Section-Profil vorhanden ist

Aktuelle Gaps:
- aktuell stark auf Ferienwohnungsprofil zugeschnitten
- keine branchebasierte Mapping-Bibliothek
- keine automatische Priorisierung optionaler vs. Pflichtfelder je Profil

## 4) Template Apply (`deterministic_tool`)

Heute vorhanden:
- kontrolliertes Apply aus `site-output` in den sicheren Template-Workspace
- klarer Managed-Roots-Ansatz (nur definierte Bereiche werden angefasst)
- stale-managed-content wird aufgeraeumt
- idempotentes Verhalten im Operator-Lauf bewiesen

Generische Nutzung:
- funktioniert fuer andere Branchen, solange sie auf demselben Template-Core aufsetzen

Aktuelle Gaps:
- kein Dry-Run-Diff-Report fuer menschliches Pre-Approval
- kein profilabhaengiger Apply-Scope
- keine eingebaute Rollback-Funktion auf Dateiebene

## 5) Was fehlt fuer "Friseur/Restaurant/Handwerk laufen genauso"

Pflichtbausteine:
- Profil-Layer: eindeutige Branchenprofile mit Pflicht-/Optionalfeldern
- Mapping-Katalog: Feld-zu-Schema-Mapping pro Profil
- Section-Komposition: welche Sections je Profil aktiv sind
- Quality Gates: automatisierte Plausibilitaet (Kontakt, Preise, Oeffnungszeiten, Adresse)
- Packet -> Lane Routing: automatische Lane-Wahl je Packet-Typ (kosten- und risikobewusst)

Operative Reifestufe:
- Ziel ist nicht "ein Kundenprojekt fertig", sondern "derselbe Auftragstyp ist fuer neue Kunden reproduzierbar".
- Jede neue Branchenfaehigkeit gilt erst als stabil, wenn sie als Packet-Typ dokumentiert, getestet und ueber mindestens einen echten Operator-Lauf bewiesen ist.
