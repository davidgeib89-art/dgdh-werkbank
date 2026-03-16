import { z } from "zod";
import { MEMORY_KINDS, MEMORY_SCOPES } from "../types/memory.js";
import type { MemoryApprovalStatus } from "../types/memory.js";

export const memoryScopeSchema = z.enum(MEMORY_SCOPES);
export const memoryKindSchema = z.enum(MEMORY_KINDS);

export const createMemoryItemSchema = z.object({
  scope: memoryScopeSchema,
  kind: memoryKindSchema,
  agentId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  relatedAgentIds: z.array(z.string().uuid()).optional().default([]),
  summary: z.string().trim().min(1).max(280),
  detail: z.string().trim().min(1).max(12000),
  tags: z
    .array(z.string().trim().min(1).max(64))
    .max(30)
    .optional()
    .default([]),
  importance: z.number().int().min(0).max(100).optional().default(50),
  confidence: z.number().int().min(0).max(100).optional().default(50),
  sourceRefs: z
    .array(z.string().trim().min(1).max(256))
    .max(50)
    .optional()
    .default([]),
  lastUsedAt: z.coerce.date().nullable().optional(),
});

export const searchMemorySchema = z.object({
  text: z.string().trim().max(300).default(""),
  scope: z.array(memoryScopeSchema).optional(),
  agentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const correctMemorySchema = z
  .object({
    scope: memoryScopeSchema.optional(),
    kind: memoryKindSchema.optional(),
    agentId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    relatedAgentIds: z.array(z.string().uuid()).optional(),
    summary: z.string().trim().min(1).max(280).optional(),
    detail: z.string().trim().min(1).max(12000).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
    importance: z.number().int().min(0).max(100).optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    sourceRefs: z.array(z.string().trim().min(1).max(256)).max(50).optional(),
    lastUsedAt: z.coerce.date().nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export type CreateMemoryItem = z.infer<typeof createMemoryItemSchema>;
export type SearchMemory = z.infer<typeof searchMemorySchema>;
export type CorrectMemory = z.infer<typeof correctMemorySchema>;

// ─── Sprint 2: Reflection Engine ─────────────────────────────────────────────

export const runReflectionSchema = z.object({
  agentId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  lookbackDays: z.number().int().min(1).max(90).optional().default(30),
});

export const promoteReflectionSchema = z.object({
  items: z.array(createMemoryItemSchema).min(1).max(20),
});

export type RunReflection = z.infer<typeof runReflectionSchema>;
export type PromoteReflection = z.infer<typeof promoteReflectionSchema>;

// ─── Sprint 3: Governance ─────────────────────────────────────────────────────

export const MEMORY_APPROVAL_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
] as const satisfies MemoryApprovalStatus[];

export const memoryApprovalStatusSchema = z.enum(MEMORY_APPROVAL_STATUSES);

export const approveMemorySchema = z.object({
  approvedBy: z.string().trim().min(1).max(200),
});

export const rejectMemorySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const runRetentionSchema = z.object({
  maxAgeDaysSucceeded: z.number().int().min(1).max(365).optional().default(30),
  maxAgeDaysFailed: z.number().int().min(1).max(365).optional().default(90),
  importanceThreshold: z.number().int().min(0).max(100).optional().default(35),
  dryRun: z.boolean().optional().default(false),
});

export const viewerFilterSchema = z.object({
  scope: z.array(memoryScopeSchema).optional(),
  kind: z.array(memoryKindSchema).optional(),
  agentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  approvalStatus: z.array(memoryApprovalStatusSchema).optional(),
  includeArchived: z.boolean().optional().default(false),
  text: z.string().trim().max(300).optional().default(""),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(25),
});

export type ApproveMemory = z.infer<typeof approveMemorySchema>;
export type RejectMemory = z.infer<typeof rejectMemorySchema>;
export type RunRetention = z.infer<typeof runRetentionSchema>;
export type ViewerFilter = z.infer<typeof viewerFilterSchema>;
