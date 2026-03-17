# DGDH Task Brief Template

Use this template for every governed work packet.
A run should not start if required fields are missing.

## 1. Identity

- workPacketId:
- missionLink:
- backlogItemRef:
- requestedBy:
- assignedAgentRole: Claude | Codex | Gemini
- autonomyMode: Supervised Build | Bounded Autonomy | Mission Operations

## 2. Goal

- objective:
- expectedOutput:
- doneCriteria:

## 3. Scope

- inScope:
- outOfScope:
- allowedFiles:
- forbiddenAreas:
- externalSystemsAllowed:

## 4. Execution Plan

- phaseARequired: yes/no
- phaseAQuestions:
- phaseBAllowedWhen:
- implementationConstraints:

## 5. Budget and Limits

- tokenBudgetDiagnose:
- tokenBudgetImplementation:
- tokenBudgetVerification:
- hardTokenCapRun:
- maxRuntimeMinutes:
- maxFilesChanged:

## 6. Verification

- requiredChecks:
- smokeTests:
- acceptanceEvidence:
- minimalEvidenceOnly: yes

## 7. Stop and Escalation

- stopConditions:
- escalationTrigger:
- escalationTarget: Claude | Gemini | David

## 8. Run Metadata (filled by executor)

- runId:
- phaseReached:
- tokenUsedEstimate:
- status:
- escalationOccurred: yes/no
- summary:
