export interface AssetImage {
  assetId: string;
  companyId: string;
  provider: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  originalFilename: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contentPath: string;
}

export type RevenueImageVariantName = "hero" | "gallery" | "thumb";
export type RevenueImageOutputFormat = "webp" | "jpg";
export type RevenueContentDraftSource = "gemini_flash_lite" | "no_input";

export interface RevenueImagePipelineOutput {
  variant: RevenueImageVariantName;
  format: RevenueImageOutputFormat;
  path: string;
  width: number;
  height: number;
  byteSize: number;
  quality: number;
}

export interface RevenueImagePipelineAsset {
  id: string;
  sourceFilename: string;
  sourcePath: string;
  sourceWidth: number | null;
  sourceHeight: number | null;
  outputs: RevenueImagePipelineOutput[];
}

export interface RevenueImagePipelineResult {
  sourceDir: string;
  outputDir: string;
  manifestPath: string;
  imageCount: number;
  targetBytes: number;
  generatedAt: string;
  assets: RevenueImagePipelineAsset[];
}

export interface RevenueContentPricing {
  priceText: string | null;
  currency: string | null;
  period: string | null;
  notes: string | null;
}

export interface RevenueContentLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface RevenueContentContact {
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
}

export interface RevenueContentDraftFields {
  name: string | null;
  tagline: string | null;
  description: string | null;
  highlights: string[] | null;
  amenities: string[] | null;
  pricing: RevenueContentPricing | null;
  location: RevenueContentLocation | null;
  contact: RevenueContentContact | null;
}

export interface RevenueContentDraft extends RevenueContentDraftFields {
  source: RevenueContentDraftSource;
  sourceDir: string;
  manifestPath: string;
  outputPath: string;
  sourceFiles: string[];
  generatedAt: string;
}

export type RevenueSchemaFillGeneratedFileKind = "content" | "asset";

export interface RevenueSchemaFillGeneratedFile {
  kind: RevenueSchemaFillGeneratedFileKind;
  path: string;
}

export interface RevenueSchemaFillResult {
  manifestPath: string;
  contentDraftPath: string;
  outputDir: string;
  templateRepoPath: string;
  assetCount: number;
  placeholderCount: number;
  generatedAt: string;
  generatedFiles: RevenueSchemaFillGeneratedFile[];
}

export interface RevenueTemplateApplyResult {
  siteOutputDir: string;
  templateRepoPath: string;
  managedRoots: string[];
  appliedCount: number;
  deletedCount: number;
  generatedAt: string;
  appliedPaths: string[];
  deletedPaths: string[];
}

