import type { CreateConfigValues } from "@paperclipai/adapter-utils";

export function withRoleTemplateAdapterConfig(
  adapterConfig: Record<string, unknown>,
  values: Pick<CreateConfigValues, "roleTemplateId" | "roleAppendPrompt">,
): Record<string, unknown> {
  const next = { ...adapterConfig };
  const roleTemplateId = values.roleTemplateId?.trim();
  const roleAppendPrompt = values.roleAppendPrompt?.trim();

  if (roleTemplateId) {
    next.roleTemplateId = roleTemplateId;
  }
  if (roleAppendPrompt) {
    next.roleAppendPrompt = roleAppendPrompt;
  }

  return next;
}
