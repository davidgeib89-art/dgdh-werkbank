import { z } from "zod";

export const createAssetImageMetadataSchema = z.object({
  namespace: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9/_-]+$/)
    .optional(),
});

export type CreateAssetImageMetadata = z.infer<typeof createAssetImageMetadataSchema>;

export const runImagePacketPipelineSchema = z.object({
  sourceDir: z.string().trim().min(1).max(260),
  outputDir: z.string().trim().min(1).max(260).optional(),
  targetBytes: z.number().int().min(50_000).max(500_000).default(200_000),
});

export type RunImagePacketPipeline = z.infer<typeof runImagePacketPipelineSchema>;

