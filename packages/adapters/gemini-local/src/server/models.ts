import type { AdapterModel } from "@paperclipai/adapter-utils";
import { models as fallbackGeminiModels } from "../index.js";

const EXTRA_GEMINI_MODELS_ENV_KEYS = [
  "PAPERCLIP_GEMINI_MODELS",
  "GEMINI_MODELS",
] as const;

function dedupeModels(models: AdapterModel[]): AdapterModel[] {
  const seen = new Set<string>();
  const deduped: AdapterModel[] = [];
  for (const model of models) {
    const id = model.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push({ id, label: model.label.trim() || id });
  }
  return deduped;
}

function parseDelimitedModelIds(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseExtraModelsFromEnvValue(raw: string): AdapterModel[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => {
            if (typeof entry === "string") return { id: entry, label: entry };
            if (
              typeof entry === "object" &&
              entry !== null &&
              typeof (entry as { id?: unknown }).id === "string"
            ) {
              const id = ((entry as { id: string }).id ?? "").trim();
              const labelRaw = (entry as { label?: unknown }).label;
              const label =
                typeof labelRaw === "string" && labelRaw.trim().length > 0
                  ? labelRaw
                  : id;
              return id ? { id, label } : null;
            }
            return null;
          })
          .filter((entry): entry is AdapterModel => Boolean(entry));
      }
    } catch {
      // Fall back to delimited parsing below.
    }
  }

  return parseDelimitedModelIds(trimmed).map((id) => ({ id, label: id }));
}

function readExtraModelsFromEnv(): AdapterModel[] {
  const collected: AdapterModel[] = [];
  for (const key of EXTRA_GEMINI_MODELS_ENV_KEYS) {
    const raw = process.env[key];
    if (!raw || raw.trim().length === 0) continue;
    collected.push(...parseExtraModelsFromEnvValue(raw));
  }
  return collected;
}

export async function listGeminiModels(): Promise<AdapterModel[]> {
  const extras = readExtraModelsFromEnv();
  return dedupeModels([...fallbackGeminiModels, ...extras]);
}
