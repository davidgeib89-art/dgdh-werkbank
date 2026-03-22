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

const nullableTrimmedStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(4000)
  .nullable();

const nullableStringArraySchema = z
  .array(z.string().trim().min(1).max(280))
  .min(1)
  .max(50)
  .nullable();

export const revenueContentPricingSchema = z
  .object({
    priceText: nullableTrimmedStringSchema,
    currency: z.string().trim().min(1).max(40).nullable(),
    period: z.string().trim().min(1).max(80).nullable(),
    notes: nullableTrimmedStringSchema,
  })
  .strict()
  .nullable();

export const revenueContentLocationSchema = z
  .object({
    address: nullableTrimmedStringSchema,
    city: z.string().trim().min(1).max(160).nullable(),
    region: z.string().trim().min(1).max(160).nullable(),
    postalCode: z.string().trim().min(1).max(32).nullable(),
    country: z.string().trim().min(1).max(160).nullable(),
  })
  .strict()
  .nullable();

export const revenueContentContactSchema = z
  .object({
    name: z.string().trim().min(1).max(200).nullable(),
    email: z.string().trim().email().max(320).nullable(),
    phone: z.string().trim().min(1).max(80).nullable(),
    website: z.string().trim().url().max(2048).nullable(),
  })
  .strict()
  .nullable();

export const revenueContentDraftFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(200).nullable(),
    tagline: z.string().trim().min(1).max(280).nullable(),
    description: nullableTrimmedStringSchema,
    highlights: nullableStringArraySchema,
    amenities: nullableStringArraySchema,
    pricing: revenueContentPricingSchema,
    location: revenueContentLocationSchema,
    contact: revenueContentContactSchema,
  })
  .strict();

export const revenueImagePipelineOutputSchema = z
  .object({
    variant: z.enum(["hero", "gallery", "thumb"]),
    format: z.enum(["webp", "jpg"]),
    path: z.string().trim().min(1).max(520),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    byteSize: z.number().int().positive(),
    quality: z.number().int().min(1).max(100),
  })
  .strict();

export const revenueImagePipelineAssetSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    sourceFilename: z.string().trim().min(1).max(260),
    sourcePath: z.string().trim().min(1).max(520),
    sourceWidth: z.number().int().positive().nullable(),
    sourceHeight: z.number().int().positive().nullable(),
    outputs: z.array(revenueImagePipelineOutputSchema).min(1).max(32),
  })
  .strict();

export const revenueImagePipelineResultSchema = z
  .object({
    sourceDir: z.string().trim().min(1).max(520),
    outputDir: z.string().trim().min(1).max(520),
    manifestPath: z.string().trim().min(1).max(520),
    imageCount: z.number().int().min(1),
    targetBytes: z.number().int().min(50_000).max(500_000),
    generatedAt: z.string().datetime(),
    assets: z.array(revenueImagePipelineAssetSchema).min(1).max(512),
  })
  .strict();

export const revenueContentDraftSchema = revenueContentDraftFieldsSchema
  .extend({
    source: z.enum(["gemini_flash_lite", "no_input"]),
    sourceDir: z.string().trim().min(1).max(520),
    manifestPath: z.string().trim().min(1).max(520),
    outputPath: z.string().trim().min(1).max(520),
    sourceFiles: z.array(z.string().trim().min(1).max(520)).max(512),
    generatedAt: z.string().datetime(),
  })
  .strict();

export const runRevenueContentExtractorSchema = z.object({
  sourceDir: z.string().trim().min(1).max(260),
  manifestPath: z.string().trim().min(1).max(260),
});

export const revenueSchemaFillGeneratedFileSchema = z
  .object({
    kind: z.enum(["content", "asset"]),
    path: z.string().trim().min(1).max(520),
  })
  .strict();

export const revenueSchemaFillResultSchema = z
  .object({
    manifestPath: z.string().trim().min(1).max(520),
    contentDraftPath: z.string().trim().min(1).max(520),
    outputDir: z.string().trim().min(1).max(520),
    templateRepoPath: z.string().trim().min(1).max(520),
    assetCount: z.number().int().min(0),
    placeholderCount: z.number().int().min(0),
    generatedAt: z.string().datetime(),
    generatedFiles: z.array(revenueSchemaFillGeneratedFileSchema).min(1).max(2048),
  })
  .strict();

export const runRevenueSchemaFillSchema = z.object({
  manifestPath: z.string().trim().min(1).max(260),
  contentDraftPath: z.string().trim().min(1).max(260),
  templateRepoPath: z.string().trim().min(1).max(520),
});

export type RevenueContentDraftFields = z.infer<
  typeof revenueContentDraftFieldsSchema
>;
export type RunRevenueContentExtractor = z.infer<
  typeof runRevenueContentExtractorSchema
>;
export type RunRevenueSchemaFill = z.infer<typeof runRevenueSchemaFillSchema>;

