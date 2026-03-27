import { z } from "zod";

const missionCellIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
    "missionCellId must use lowercase letters, numbers, dot, underscore, or dash",
  );

const nonEmptyStringArray = z.array(z.string().trim().min(1)).min(1);

export const missionCellCharterSchema = z.object({
  objective: z.string().trim().min(10),
  primaryMetric: z.string().trim().min(10),
  guardMetrics: nonEmptyStringArray,
  budget: z.string().trim().min(3),
  runtime: z.string().trim().min(3),
  blastRadius: nonEmptyStringArray,
  allowedZones: nonEmptyStringArray,
  forbiddenZones: nonEmptyStringArray,
});

export const missionCellDecisionPolicySchema = z.object({
  type2Autonomy: nonEmptyStringArray,
  type1Escalations: nonEmptyStringArray,
  escalationPath: nonEmptyStringArray,
});

export const missionCellRiskGateSchema = z.object({
  oberreviewerTriggers: nonEmptyStringArray,
  requiredEvidence: nonEmptyStringArray,
  stopReasons: nonEmptyStringArray,
});

export const missionCellEvalSchema = z.object({
  replayChecks: nonEmptyStringArray,
  guardChecks: nonEmptyStringArray,
  successSignals: nonEmptyStringArray,
});

export const missionCellPromotionSchema = z.object({
  defaultTargets: nonEmptyStringArray,
  promoteWhen: nonEmptyStringArray,
  stayExperimentalWhen: nonEmptyStringArray,
  demoteWhen: nonEmptyStringArray,
});

export const missionCellBoundarySchema = z.object({
  firmBound: nonEmptyStringArray,
  carrierBound: nonEmptyStringArray,
});

export const missionCellStarterPathSchema = z.object({
  trigger: z.string().trim().min(10),
  issueTemplate: nonEmptyStringArray,
  startupSequence: nonEmptyStringArray,
  firstProbe: nonEmptyStringArray,
});

export const missionCellContractSchema = z.object({
  schemaVersion: z.literal("v1"),
  missionCellId: missionCellIdSchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  owners: nonEmptyStringArray,
  status: z.enum(["draft", "active", "retired"]),
  updatedAt: z.string().datetime(),
  charter: missionCellCharterSchema,
  decisionPolicy: missionCellDecisionPolicySchema,
  riskGate: missionCellRiskGateSchema,
  eval: missionCellEvalSchema,
  promotion: missionCellPromotionSchema,
  boundaries: missionCellBoundarySchema,
  starterPath: missionCellStarterPathSchema,
});

export type MissionCellCharterInput = z.infer<typeof missionCellCharterSchema>;
export type MissionCellDecisionPolicyInput = z.infer<
  typeof missionCellDecisionPolicySchema
>;
export type MissionCellRiskGateInput = z.infer<typeof missionCellRiskGateSchema>;
export type MissionCellEvalInput = z.infer<typeof missionCellEvalSchema>;
export type MissionCellPromotionInput = z.infer<
  typeof missionCellPromotionSchema
>;
export type MissionCellBoundaryInput = z.infer<typeof missionCellBoundarySchema>;
export type MissionCellStarterPathInput = z.infer<
  typeof missionCellStarterPathSchema
>;
export type MissionCellContractInput = z.infer<typeof missionCellContractSchema>;