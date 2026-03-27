function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function readField(description: string | null, field: string): string | null {
  if (!description) return null;
  const match = description.match(
    new RegExp(`(?:^|\\n)\\s*${field}\\s*:\\s*([^\\n]+)`, "i"),
  );
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}

function splitNamedTruthSurfaces(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\s*,\s*|\s+and\s+/i)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readNamedTruthSurfaces(text: string | null): string[] {
  if (!text) return [];
  const onlyMatch = text.match(/(?:inspect|read|use)\s+only\s+([^\.\n]+)/i);
  return splitNamedTruthSurfaces(onlyMatch?.[1]?.trim() ?? null);
}

export interface DirectAnswerAuditTruth {
  bounded: boolean;
  directAnswerOnly: boolean;
  requiresChildStatusRead: boolean;
  namedTruthSurfaces: string[];
  forbidChildCreation: boolean;
  forbidRepoReads: boolean;
  forbidGit: boolean;
  forbidArchaeology: boolean;
  forbidResumeTriggerChase: boolean;
}

export function resolveDirectAnswerAuditTruth(input: {
  title?: string | null;
  description?: string | null;
}): DirectAnswerAuditTruth | null {
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const scope = readField(description, "Scope");
  const doneWhen = readField(description, "doneWhen");
  const searchText = [scope, doneWhen, description, title].filter(Boolean).join("\n");
  if (searchText.length === 0) return null;

  const directAnswerOnly = /direct answer only/i.test(searchText);
  const requiresChildStatusRead = /read child(?: issue)? status first/i.test(
    searchText,
  );
  const namedTruthSurfaces = readNamedTruthSurfaces(scope ?? description ?? null);
  const forbidChildCreation = /no child creation/i.test(searchText);
  const forbidRepoReads = /no repo reads?/i.test(searchText);
  const forbidGit = /no git(?: work)?/i.test(searchText);
  const forbidArchaeology =
    /(?:without|no) archaeology/i.test(searchText) ||
    /no broad project\/activity\/dashboard archaeology/i.test(searchText);
  const forbidResumeTriggerChase = /no resume-trigger chase/i.test(searchText);

  if (
    !directAnswerOnly &&
    namedTruthSurfaces.length === 0 &&
    !forbidRepoReads &&
    !forbidChildCreation &&
    !forbidArchaeology
  ) {
    return null;
  }

  return {
    bounded:
      directAnswerOnly &&
      namedTruthSurfaces.length > 0 &&
      (forbidChildCreation ||
        forbidRepoReads ||
        forbidGit ||
        forbidArchaeology ||
        forbidResumeTriggerChase),
    directAnswerOnly,
    requiresChildStatusRead,
    namedTruthSurfaces,
    forbidChildCreation,
    forbidRepoReads,
    forbidGit,
    forbidArchaeology,
    forbidResumeTriggerChase,
  };
}
