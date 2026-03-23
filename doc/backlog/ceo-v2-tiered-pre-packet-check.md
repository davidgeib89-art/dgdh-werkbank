# CEO V2: Tiered Pre-Packet-Check

## Idee
Bevor der CEO Packets schreibt, laeuft ein Qualitaets-Check
dessen Tiefe vom riskLevel der Mission abhaengt.

## Tiering

| riskLevel | Check | Kosten |
|-----------|-------|--------|
| low / standard | CEO Self-Check (Tweak 4 aus ceo-prompt-hardening.md) - intern, 0 extra Tokens | 0 |
| high / heavy-architecture | Multi-Perspektiv-Check: 3x Flash-Lite parallel - Skeptiker, Architekt, Pragmatiker | ~3x Flash-Lite |

## Multi-Perspektiv-Prompts (Inspiration: PolyClaude)
- Skeptiker: "Was kann an dieser Mission schiefgehen?"
- Architekt: "Welche Dependencies oder Risiken uebersieht der CEO?"
- Pragmatiker: "Ist der Scope realistisch fuer einen Sprint?"

CEO aggregiert die 3 Antworten -> schaerft Packets bevor
Worker losgeschickt werden.

## Verbindung zu bestehendem Backlog
- Ersetzt/erweitert: ceo-prompt-hardening.md Tweak 4
- Konsistent mit: Stage-1-Classifier Tiering
  (riskLevel=high -> Control Plane uebernimmt)

## Trigger fuer Umsetzung
- CEO V1 (Packet-Zerlegung) ist in echten Laeufen bewiesen
- Mindestens 1 high-risk Mission ist durch die Kette gelaufen
- CEO Self-Check reicht nachweislich nicht mehr

## Explizit NICHT jetzt
- Kein neues Plugin, kein externes Tool
- Kein separater Perspektiv-Agent-Service
- Erst nach stabilem End-to-End-Lauf
