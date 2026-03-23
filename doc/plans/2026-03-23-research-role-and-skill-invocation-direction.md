# DGDH Research Role and Skill Invocation Direction

Datum: 2026-03-23
Status: Kanonische spaetere Richtungslesart, nicht aktueller Hauptsprint
Zweck: Hellt fuer spaetere AIs sauber auf, dass DGDH Research nicht nur als lose Haltung denkt, sondern wahrscheinlich als bewusst nutzbaren Spezialpfad / Spezialmitarbeiter mit spaeteren Skills.

## 1. Warum dieses Dokument existiert

DGDH hat bereits eine aktive Researcher-Haltung und eine dokumentierte Skills-Richtung.
Neu hinzu kommt eine wichtigere Klarstellung:

- Research soll spaeter nicht nur "etwas sein, das jeder ein bisschen macht"
- sondern wahrscheinlich ein bewusst nutzbarer Spezialpfad in der Firmenlogik
- andere Rollen sollen wissen, dass sie Research gezielt einschalten koennen
- Skills bleiben das spaetere Mittel, um Teile davon zu standardisieren

Ausloeser war unter anderem das Repo `K-Dense-AI/k-dense-byok`.

Die Frage ist nicht: "Sollen wir K-Dense kopieren?"

Die richtige Frage ist:

> Welche Firmenlogik ist darin fuer DGDH relevant, und wie uebersetzen wir sie sauber in unsere eigene Rollenwelt?

## 2. Was an `k-dense-byok` fuer DGDH wirklich relevant ist

Die relevanten Muster sind nicht die ganze Produktwelt, sondern nur wenige klare Punkte:

### 2.1 Hauptagent + bewusst einschaltbare Spezialisten

K-Dense nutzt einen Hauptagenten, der:

- einfache Dinge direkt beantwortet
- komplexere oder spezialisierte Arbeit gezielt an Experten delegiert

Das relevante Muster fuer DGDH ist:

- nicht jeder Agent muss alles selbst koennen
- spezialisierte Arbeit darf bewusst an einen passenden Spezialpfad gehen

### 2.2 Spezialisten bekommen Ziel und Deliverable, nicht Mikro-Anweisungen

Im K-Dense-Muster soll der Hauptagent den Experten sagen:

- was das Ziel ist
- welches Ergebnis gebraucht wird

aber nicht:

- welche Hilfsbibliothek sie genau benutzen sollen
- welche improvisierte Fallback-Methode sie waehlen sollen

Das ist fuer DGDH wichtig:

- CEO / Planer sollen Spezialpfade nicht tot-mikro-managen
- gute Spezialisten brauchen Richtung und Abnahmekriterium, nicht dauernd Implementation-Rauschen

### 2.3 Skills sind dort nicht Deko, sondern Verfahrenswissen

Im K-Dense-Muster sind Skills:

- getestete Prozeduren
- wiederverwendbare Integrationen
- feste Vorgehensweisen

Der relevante Punkt fuer DGDH:

- Skills sind nicht "extra Prompttext"
- Skills sind spaeter das richtige Zuhause fuer standardisierte Spezialablaeufe

### 2.4 Der Generalist traegt nicht die ganze Spezialwelt im Hauptprompt

Das ist einer der staerksten Punkte.
Der Hauptagent muss nicht alle wissenschaftlichen / technischen Spezialdetails selbst tragen.

Uebersetzt fuer DGDH:

- der allgemeine Worker soll nicht endlos mit Domainwissen, OSS-Wissen, Web-Recherche-Mustern und Sonderprozessen ueberladen werden
- stattdessen braucht die Firma spaeter bewusstere Spezialpfade

## 3. DGDH-Uebersetzung: Researcher als Spezialpfad

Fuer DGDH ist die richtige Uebersetzung nicht:

- ein chaotisches Experten-Schwarm-System
- oder sofort ein neuer Multi-Agent-Ausbau

Die richtige Uebersetzung ist:

### 3.1 Research ist spaeter ein bewusster Spezialpfad

Research bedeutet in DGDH kuenftig:

- OSS-Muster sichten
- Docs / APIs / Standards / Libraries sauber nachschlagen
- fremde Repos oder Papers einordnen
- Vergleiche, Optionen, Risiken und relevante Pattern verdichten
- einen brauchbaren Handoff fuer CEO / Worker / Reviewer erzeugen

Research ist damit weder bloss "ein bisschen googeln" noch automatisch Coding.

### 3.2 Researcher ist spaeter wahrscheinlich Rolle UND Pfad

Die saubere Lesart fuer DGDH ist:

- **als Rolle:** ein eigener Spezialmitarbeiter / Spezialagent ist plausibel
- **als Pfad:** andere Rollen muessen wissen, dass es diesen Research-Pfad gibt und ihn bewusst ansteuern koennen

Das heisst:

- spaeter kann es einen echten `Researcher`-Rollentyp geben
- davor kann Research bereits als bewusst gedachte Packet-/Invokationslogik existieren

## 4. Rolle vs Skill: die saubere Trennung

Das ist der wichtigste Architekturpunkt.

### Rolle

Eine Rolle ist:

- ein Mitarbeiter mit Urteilsraum
- verantwortlich fuer einen Aufgabenraum
- faehig, offene Situationen einzuordnen

Ein `Researcher` als Rolle waere spaeter gut fuer:

- offene Recherchefragen
- OSS-Mustervergleiche
- Quellengewichtung
- unklare Problemfelder
- erste Verdichtung von "was ist hier wirklich relevant?"

### Skill

Ein Skill ist:

- standardisierte Spezialprozedur
- feste Guardrails
- wiederverwendbarer Ablauf
- wenig oder kein breiter Urteilsraum

Skills waeren spaeter gut fuer:

- definierte Rechercheschritte
- feste Datenbank-/API-Abfragen
- wiederkehrende Repo-Scans
- standardisierte Dokumentextraktion
- Spezial-Workflows mit klaren Scripts und Regeln

### DGDH-Regel

> Researcher und Skill sind nicht dasselbe.

Die richtige Richtung ist:

- **Researcher** fuer offene, urteilslastige Spezialarbeit
- **Skills** fuer standardisierte Teilroutinen innerhalb dieses Research-Pfads

## 5. Wie andere Rollen sich des Researchers bewusst sein sollen

Spaetere AIs sollen verstehen:

- nicht jede Rolle muss alles selbst recherchieren
- Research ist bewusst nutzbar
- wenn externe Muster, neue Quellen oder ungewohnte Spezialfragen auftauchen, ist Research ein legitimer Eskalations- und Handoff-Pfad

Praktisch bedeutet das spaeter:

### CEO / Planer

- darf bewusst Research-Packages schneiden
- darf vor Architektur- oder Richtungsentscheidungen einen Researcher einschalten
- soll offene Fragen nicht blind vom Worker improvisieren lassen

### Worker

- soll nicht alles selbst neu erfinden
- darf bei echten externen Unklarheiten oder unbekannten Mustern ein Research-Handoff benoetigen
- soll aber nicht dauernd selbst Subagenten losschicken

### Reviewer

- darf spaeter bei externen Behauptungen, Pattern-Vergleichen oder riskanten Annahmen einen Research-Bedarf sichtbar machen
- ist aber nicht der Primaer-Rechercheur

## 6. Wie das smart guided werden soll

Der heikle Punkt ist: Das darf nicht in Multi-Agent-Theater kippen.

Darum gilt fuer DGDH spaeter:

### 6.1 Nicht jeder darf alles frei delegieren

Bevorzugte Logik:

- CEO / Planer steuert Research bewusst
- Worker fordert Research eher an, statt beliebig selbst Spezialisten zu starten

### 6.2 Erst ein Spezialpfad, nicht zehn

Der erste sinnvolle Schritt waere spaeter nicht:

- Bio-Experte
- API-Experte
- OSS-Scout
- Wettbewerbsanalyst
- Juristischer Spezialist

Sondern:

- erst ein klarer `Researcher` / `Research-Pfad`
- spaeter nur dann weitere Aufspaltung, wenn wiederholte Evidenz das rechtfertigt

### 6.3 Deliverables statt lose Recherche

Research muss in DGDH immer etwas Abgebbares liefern, zum Beispiel:

- Pattern-Vergleich
- Quellenliste
- Entscheidungsmemo
- Repo-Einordnung
- Optionsmatrix
- klarer Handoff fuer den naechsten Worker-/CEO-Schritt

## 7. Was davon echter Hebel ist und was Overkill waere

### Echter Hebel fuer DGDH

- Generalisten nicht mit allem Spezialwissen ueberladen
- bewusste Eskalation in einen Research-Pfad
- spaetere Standardisierung ueber Skills
- OSS- und Quellenarbeit als eigene Firmenfaehigkeit denken
- Spezialwissen als Packet-/Role-/Skill-Logik strukturieren

### Overkill fuer DGDH jetzt

- sofort neue Research-Agenten implementieren
- Multi-Agent-Schwarm fuer jede Frage
- riesige Skill-Bibliothek als Hauptprojekt
- automatische Expertenspinups fuer normale Routineaufgaben
- sofortige semantische Superintelligenz ueber die ganze Codebase

## 8. Operative Einordnung: jetzt, bald, spaeter

### Jetzt

- nur als Richtung dokumentieren
- den aktuellen Firmenloop-Fokus nicht verwischen
- die Idee fuer spaetere Rollen / Skills / Packet-Logik sauber verankern

### Bald

- sobald der sichtbare komplette Firmenlauf stabiler ist, kann ein erster schmaler `Researcher`-Pfad als Rollen- oder Packet-Konzept sinnvoll werden
- nicht als Multi-Agent-Ausbau, sondern als gezielte Spezialfaehigkeit

### Spaeter

- echter `Researcher`-Rollentyp
- invokebare Research-Packages
- Skills fuer wiederkehrende Spezialrecherche
- spaeter evtl. semantische Repo-/Dokumenten-Intelligenz als Research-Unterbau

## 9. Kanonische DGDH-Lesart ab jetzt

Spaetere AIs sollen es so verstehen:

> DGDH will nicht nur allgemein "mehr Research", sondern wahrscheinlich einen bewusst nutzbaren Research-Spezialpfad in der Firmenlogik.

Und:

> Skills sind spaeter das Mittel, um Teile dieses Spezialwissens und dieser Spezialablaeufe zu standardisieren.

Und gleichzeitig:

> Das ist bewusst eingeplant, aber ausdruecklich nicht der aktuelle Hauptsprint. Erst muss der sichtbare Firmenloop tragen.
