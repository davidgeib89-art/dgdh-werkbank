import { z } from "zod";
import { MEMORY_KINDS, MEMORY_SCOPES } from "../types/memory.js";

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
