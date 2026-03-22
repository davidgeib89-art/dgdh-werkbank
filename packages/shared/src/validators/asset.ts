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

export const runRevenueContentExtractorSchema = z.object({
  sourceDir: z.string().trim().min(1).max(260),
  manifestPath: z.string().trim().min(1).max(260),
});

export type RevenueContentDraftFields = z.infer<
  typeof revenueContentDraftFieldsSchema
>;
export type RunRevenueContentExtractor = z.infer<
  typeof runRevenueContentExtractorSchema
>;

