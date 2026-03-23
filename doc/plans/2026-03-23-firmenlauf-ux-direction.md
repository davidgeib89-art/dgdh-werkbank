# DGDH Firmenlauf UX Direction

Datum: 2026-03-23
Status: Spaetere Produkt-/UX-Richtung, nicht aktueller Hauptsprint
Zweck: Haelt fest, dass das eigentliche UI-Problem bei Agentenlaeufen nicht primaer Reaktivitaet oder Library-Wahl ist, sondern Lesestruktur und Betriebsverstaendnis.

## 1. Kurzurteil

ArrowJS ist als kleine reaktive Library interessant.
Fuer DGDH ist das aber aktuell nicht der eigentliche Punkt.

Die richtige Uebersetzung ist:

> Nicht `ArrowJS einbauen`, sondern `Firmenlauf lesbar machen`.

## 2. Was das Problem wirklich ist

Agentenverlaeufe wirken schnell unlesbar, wenn sie wie Chat oder roher Transcript-Strom dargestellt werden.

Das eigentliche Problem ist fuer DGDH eher:

- zu wenig klare Phasen
- zu wenig Rollentrennung
- zu wenig sichtbarer Status
- zu wenig Trennung zwischen Ergebnis und Rohdetails
- zu wenig Orientierung fuer David als Operator

Anders gesagt:

- nicht primar Reaktivitaet
- primar Informationsarchitektur

## 3. Warum ein ArrowJS-Sprint jetzt falsch waere

### 3.1 Falscher Hebel

Das aktuelle Problem ist nicht, dass React zu schwer oder zu langsam waere.
Das aktuelle Problem ist, dass Firmenlaeufe noch nicht klar genug gelesen werden koennen.

### 3.2 Falsches Ziel

Ein Sprint namens `ArrowJS testen` wuerde die Library zur Hauptsache machen.
Fuer DGDH ist die Hauptsache aber:

- den Firmenlauf operativ lesbar machen
- nicht ein neues UI-Framework ausprobieren

### 3.3 Falscher Zeitpunkt

Aktuell ist der Hauptpfad:

- kanonischer Firmenlauf
- Delegation Guardrails
- sichtbarer kompletter Firmenlauf

Ein Library-Wechsel oder UI-Experiment darf das nicht ueberfahren.

## 4. Was spaeter der richtige UX-Schnitt ist

Der sinnvolle spaetere Sprinttitel lautet:

> Firmenlauf lesbar machen

Nicht:

> ArrowJS einbauen

## 5. Was dieser spaetere Sprint loesen soll

### 5.1 Run-Timeline statt Chat-Gefuehl

Der Verlauf soll sich wie ein Betriebsprotokoll / Firmenlauf lesen lassen, nicht wie alle Mitarbeiter in einem Chatraum.

### 5.2 Rollengruppierung

Mindestens sichtbar getrennt nach:

- CEO
- Worker
- Reviewer

### 5.3 Status und Phasen

Zentral sichtbar:

- geplant
- laeuft
- blocked
- accepted
- merged
- done

### 5.4 Ergebnis oben, Rohlog unten

David braucht zuerst:

- Ziel
- aktueller Status
- letzter Schritt
- naechster Schritt
- Ergebnis / Artefakt / Link / PR

Erst danach:

- Transcript
- Tool-Calls
- Commands
- stderr/stdout

### 5.5 Einklappbare Tiefenebenen

Sinnvoll waeren spaeter:

- kompakte Summary oben
- Details aufklappbar
- Rohlog noch tiefer

### 5.6 Filter

Nuetzliche Sichtweisen:

- nur CEO
- nur Reviewer
- nur Fehler
- nur Git / PR / Merge
- nur Blocker

## 6. Wie ArrowJS dabei einzuordnen ist

ArrowJS kann als Denkanstoss fuer kleine reaktive Oberflaechen okay sein.

Fuer DGDH gilt aber:

- ArrowJS ist hoechstens ein moegliches Mittel
- nicht das Ziel
- nicht der aktuelle Sprint
- nicht der primaere Hebel

Die eigentliche UX-Richtung ist framework-unabhaengig:

- Firmenlauf lesbar machen
- Ergebnisorientierung
- klare Rollen und Status
- progressive disclosure

## 7. Kanonische DGDH-Lesart

Spaetere AIs sollen es so verstehen:

- DGDH hat bei Run-UI primaer ein Lesbarkeits- und Operator-Orientierungsproblem, nicht primaer ein Library-Problem
- ein spaeterer UX-Sprint darf sich nicht auf `ArrowJS` als Selbstzweck fokussieren
- der richtige spaetere Hebel ist `Firmenlauf lesbar machen`
- bis dahin bleibt der Hauptfokus beim Firmenlauf selbst, nicht bei seiner Oberflaechen-Politur
