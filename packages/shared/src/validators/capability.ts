import { z } from "zod";
import {
  CAPABILITY_MATURITY_STATES,
  CAPABILITY_VERIFY_METHODS,
} from "../constants.js";

const capabilityIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
    "capabilityId must use lowercase letters, numbers, dot, underscore, or dash",
  );

const nonEmptyStringArray = z.array(z.string().trim().min(1)).min(1);

export const capabilityPrimitiveSchema = z.object({
  id: capabilityIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  required: z.boolean().optional().default(true),
  evidenceMarkers: nonEmptyStringArray,
});

export const capabilityContractBodySchema = z.object({
  intent: z.string().trim().min(10),
  scopeIn: nonEmptyStringArray,
  scopeOut: z.array(z.string().trim().min(1)).optional().default([]),
  inputsRequired: nonEmptyStringArray,
  allowedActions: nonEmptyStringArray,
  forbiddenActions: nonEmptyStringArray,
  successCriteria: nonEmptyStringArray,
  failureModes: nonEmptyStringArray,
  rollbackPlan: z.string().trim().min(10),
});

export const capabilityVerificationSchema = z
  .object({
    method: z.enum(CAPABILITY_VERIFY_METHODS),
    runIds: z.array(z.string().uuid()).min(1),
    requiredMarkers: z.array(z.string().trim().min(3)).optional().default([]),
    requiredPrimitiveIds: z.array(capabilityIdSchema).optional().default([]),
    minDistinctRuns: z.number().int().positive().optional().default(1),
    notes: z.string().trim().min(1).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.minDistinctRuns > value.runIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minDistinctRuns"],
        message: "minDistinctRuns cannot exceed the number of runIds",
      });
    }
  });

export const capabilitySkillContractSchema = z
  .object({
    schemaVersion: z.literal("v1"),
    capabilityId: capabilityIdSchema,
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    owners: nonEmptyStringArray,
    maturity: z.enum(CAPABILITY_MATURITY_STATES),
    updatedAt: z.string().datetime(),
    contract: capabilityContractBodySchema,
    primitives: z.array(capabilityPrimitiveSchema).min(1),
    verify: capabilityVerificationSchema,
  })
  .superRefine((value, ctx) => {
    const primitiveIds = new Set<string>();
    for (const primitive of value.primitives) {
      if (primitiveIds.has(primitive.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["primitives"],
          message: `Duplicate primitive id '${primitive.id}'`,
        });
      }
      primitiveIds.add(primitive.id);
    }

    for (const primitiveId of value.verify.requiredPrimitiveIds) {
      if (primitiveIds.has(primitiveId)) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verify", "requiredPrimitiveIds"],
        message: `Unknown primitive id '${primitiveId}' in verify.requiredPrimitiveIds`,
      });
    }
  });

export type CapabilityPrimitiveInput = z.infer<typeof capabilityPrimitiveSchema>;
export type CapabilityContractBodyInput = z.infer<
  typeof capabilityContractBodySchema
>;
export type CapabilityVerificationInput = z.infer<
  typeof capabilityVerificationSchema
>;
export type CapabilitySkillContractInput = z.infer<
  typeof capabilitySkillContractSchema
>;
