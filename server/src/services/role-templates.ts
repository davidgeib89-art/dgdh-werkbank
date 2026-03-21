import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface CanonicalRoleTemplate {
  id: string;
  version: string;
  label: string;
  description: string;
  systemPrompt: string;
  operatingMode?: string;
  defaultExecutionIntent?: string;
  defaultNeedsReview?: boolean;
  constraints?: string[];
}

export interface ResolvedAssignedRoleTemplate {
  template: CanonicalRoleTemplate;
  sourcePath: string;
  roleAppendPrompt: string | null;
  prompt: string;
}

export interface RoleTemplateSummary {
  id: string;
  version: string;
  label: string;
  description: string;
}

export type AssignedRoleTemplateResolution =
  | {
      requestedRoleTemplateId: null;
      assigned: null;
      error: null;
    }
  | {
      requestedRoleTemplateId: string;
      assigned: null;
      error: string;
    }
  | {
      requestedRoleTemplateId: string;
      assigned: ResolvedAssignedRoleTemplate;
      error: null;
    };

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeRoleTemplateId(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(normalized) ? normalized : null;
}

function roleTemplatesDir(): string {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(serviceDir, "../../config/role-templates");
}

function validateTemplate(
  raw: unknown,
  sourcePath: string,
): CanonicalRoleTemplate | null {
  const parsed = asObject(raw);
  const id = normalizeRoleTemplateId(parsed.id);
  const version = asString(parsed.version);
  const label = asString(parsed.label);
  const description = asString(parsed.description);
  const systemPrompt = asString(parsed.systemPrompt);
  if (!id || !version || !label || !description || !systemPrompt) {
    return null;
  }

  return {
    id,
    version,
    label,
    description,
    systemPrompt,
    ...(asString(parsed.operatingMode)
      ? { operatingMode: asString(parsed.operatingMode)! }
      : {}),
    ...(asString(parsed.defaultExecutionIntent)
      ? { defaultExecutionIntent: asString(parsed.defaultExecutionIntent)! }
      : {}),
    ...(typeof parsed.defaultNeedsReview === "boolean"
      ? { defaultNeedsReview: parsed.defaultNeedsReview }
      : {}),
    ...(asStringArray(parsed.constraints).length > 0
      ? { constraints: asStringArray(parsed.constraints) }
      : {}),
  };
}

function loadRoleTemplateById(
  roleTemplateId: string,
): { template: CanonicalRoleTemplate | null; sourcePath: string; error: string | null } {
  const sourcePath = path.join(roleTemplatesDir(), `${roleTemplateId}.json`);
  if (!fs.existsSync(sourcePath)) {
    return {
      template: null,
      sourcePath,
      error: `Role template "${roleTemplateId}" was not found at ${sourcePath}.`,
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as unknown;
    const template = validateTemplate(parsed, sourcePath);
    if (!template) {
      return {
        template: null,
        sourcePath,
        error: `Role template "${roleTemplateId}" is invalid at ${sourcePath}.`,
      };
    }
    return { template, sourcePath, error: null };
  } catch (error) {
    return {
      template: null,
      sourcePath,
      error: `Role template "${roleTemplateId}" could not be loaded: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export function listRoleTemplateSummaries(): RoleTemplateSummary[] {
  const dir = roleTemplatesDir();
  if (!fs.existsSync(dir)) return [];

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const roleTemplateId = normalizeRoleTemplateId(
        entry.name.replace(/\.json$/i, ""),
      );
      if (!roleTemplateId) return null;
      const loaded = loadRoleTemplateById(roleTemplateId);
      if (!loaded.template) return null;
      return {
        id: loaded.template.id,
        version: loaded.template.version,
        label: loaded.template.label,
        description: loaded.template.description,
      } satisfies RoleTemplateSummary;
    })
    .filter((entry): entry is RoleTemplateSummary => entry !== null);

  return entries.sort((left, right) => left.label.localeCompare(right.label));
}

function renderRoleTemplatePrompt(input: {
  template: CanonicalRoleTemplate;
  roleAppendPrompt: string | null;
}): string {
  const { template, roleAppendPrompt } = input;
  const lines = [
    `Canonical role template: ${template.label} (${template.id}@${template.version})`,
    `Role purpose: ${template.description}`,
    "",
    template.systemPrompt,
  ];

  if (roleAppendPrompt) {
    lines.push("", "Operator add-on:", roleAppendPrompt);
  }

  return lines.join("\n").trim();
}

export function resolveAssignedRoleTemplate(
  adapterConfig: Record<string, unknown> | null | undefined,
): AssignedRoleTemplateResolution {
  const config = asObject(adapterConfig);
  const requestedRoleTemplateId = normalizeRoleTemplateId(config.roleTemplateId);
  if (!requestedRoleTemplateId) {
    return {
      requestedRoleTemplateId: null,
      assigned: null,
      error: null,
    };
  }

  const roleAppendPrompt = asString(config.roleAppendPrompt);
  const loaded = loadRoleTemplateById(requestedRoleTemplateId);
  if (!loaded.template) {
    return {
      requestedRoleTemplateId,
      assigned: null,
      error: loaded.error ?? `Role template "${requestedRoleTemplateId}" could not be resolved.`,
    };
  }

  return {
    requestedRoleTemplateId,
    assigned: {
      template: loaded.template,
      sourcePath: loaded.sourcePath,
      roleAppendPrompt,
      prompt: renderRoleTemplatePrompt({
        template: loaded.template,
        roleAppendPrompt,
      }),
    },
    error: null,
  };
}
