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

