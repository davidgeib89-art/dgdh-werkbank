import {
  type PromptResolverInput,
  type ResolverDecision,
  type ResolverLayerName,
  type ResolverReasonCode,
  validatePromptResolverInput,
} from "./prompt-resolver-schema.js";

export interface PromptResolverPreflightAuditMeta {
  ruleSetVersion: "stage1-draft";
  normalizedLayerOrder: ResolverLayerName[];
  hardFailure: boolean;
  layerCount: number;
}

export interface PromptResolverPreflightResult {
  resolverDecision: ResolverDecision;
  reasonCodes: ResolverReasonCode[];
  auditMeta?: PromptResolverPreflightAuditMeta;
}

export function runPromptResolverPreflight(
  input: PromptResolverInput,
  options?: { includeAuditMeta?: boolean },
): PromptResolverPreflightResult {
  const validation = validatePromptResolverInput(input);
  const reasonCodes = [...validation.reasonCodes];
  const hardFailure = reasonCodes.some(
    (code) => code !== "SCOPE_EXPANSION_OUTSIDE_ALLOWED_TARGETS",
  );

  if (options?.includeAuditMeta) {
    return {
      resolverDecision: validation.resolverDecision,
      reasonCodes,
      auditMeta: {
        ruleSetVersion: "stage1-draft",
        normalizedLayerOrder: [...validation.normalizedLayerOrder],
        hardFailure,
        layerCount: validation.normalizedLayerOrder.length,
      },
    };
  }

  return {
    resolverDecision: validation.resolverDecision,
    reasonCodes,
  };
}
