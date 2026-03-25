import path from "node:path";
import type {
  IssueExecutionPacketArtifactKind,
  IssueExecutionPacketReasonCode,
  IssueExecutionPacketTruth,
} from "@paperclipai/shared";

const BLANKISH_VALUES = new Set([
  "",
  "n/a",
  "na",
  "none",
  "null",
  "unknown",
  "tbd",
  "[needs input]",
]);

const FILE_LIKE_ARTIFACT_KINDS = new Set<IssueExecutionPacketArtifactKind>([
  "code_patch",
  "doc_update",
  "config_change",
  "test_update",
]);

const FOLDER_OK_ARTIFACT_KINDS = new Set<IssueExecutionPacketArtifactKind>([
  "multi_file_change",
  "folder_operation",
]);

const IMPLEMENT_LIKE_INTENTS = new Set([
  "execute",
  "fix",
  "git",
  "implement",
  "merge",
  "operate",
  "review",
  "write",
]);

const EXECUTION_PACKET_TYPES = new Set([
  "deterministic_tool",
  "free_api",
  "premium_model",
]);

const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]);
const CONFIG_EXTENSIONS = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".env",
  ".conf",
]);
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".css",
  ".scss",
  ".html",
  ".sql",
]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripWrappingQuotes(value: string) {
  let next = value.trim();
  while (
    (next.startsWith("`") && next.endsWith("`")) ||
    (next.startsWith("\"") && next.endsWith("\"")) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

function normalizeLineValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const stripped = stripWrappingQuotes(value).replace(/\s+/g, " ").trim();
  if (BLANKISH_VALUES.has(stripped.toLowerCase())) return null;
  return stripped.length > 0 ? stripped : null;
}

function normalizeRepoPath(value: string | null | undefined): string | null {
  const normalized = normalizeLineValue(value);
  if (!normalized) return null;
  const withoutUrl = normalized.replace(/^file:\/\//i, "");
  const withSlashes = withoutUrl.replace(/\\+/g, "/").replace(/^\.\//, "");
  const collapsed = withSlashes.replace(/\/+/g, "/").replace(/\/$/, "");
  if (!collapsed || BLANKISH_VALUES.has(collapsed.toLowerCase())) return null;
  return collapsed;
}

function readMetadataField(
  description: string | null | undefined,
  fields: string[],
): string | null {
  if (typeof description !== "string" || description.trim().length === 0) return null;
  for (const field of fields) {
    const match = description.match(
      new RegExp(`(?:^|\\n)\\s*${escapeRegExp(field)}\\s*:\\s*([^\\n]+)`, "i"),
    );
    const value = normalizeLineValue(match?.[1] ?? null);
    if (value) return value;
  }
  return null;
}

function readBooleanField(
  description: string | null | undefined,
  fields: string[],
): boolean | null {
  const value = readMetadataField(description, fields)?.toLowerCase();
  if (!value) return null;
  if (["true", "yes", "required"].includes(value)) return true;
  if (["false", "no", "optional"].includes(value)) return false;
  return null;
}

function normalizeLowerField(value: string | null | undefined): string | null {
  const normalized = normalizeLineValue(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeArtifactKind(
  value: string | null | undefined,
): IssueExecutionPacketArtifactKind | null {
  const normalized = normalizeLineValue(value)?.toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return null;
  if (
    normalized === "code_patch" ||
    normalized === "doc_update" ||
    normalized === "config_change" ||
    normalized === "test_update" ||
    normalized === "multi_file_change" ||
    normalized === "folder_operation"
  ) {
    return normalized;
  }
  if (["docs", "doc", "documentation", "markdown_update"].includes(normalized)) {
    return "doc_update";
  }
  if (["config", "configuration", "config_update"].includes(normalized)) {
    return "config_change";
  }
  if (["tests", "test", "test_patch"].includes(normalized)) {
    return "test_update";
  }
  if (["code", "implementation", "patch"].includes(normalized)) {
    return "code_patch";
  }
  if (["folder", "directory"].includes(normalized)) {
    return "folder_operation";
  }
  if (["multi_file", "multiple_files", "multifile"].includes(normalized)) {
    return "multi_file_change";
  }
  return null;
}

function extractPathCandidates(text: string): string[] {
  const candidates = new Set<string>();
  const regex = /(?:^|[\s("'`])((?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+(?:\.[A-Za-z0-9._-]+)?)/g;
  for (const match of text.matchAll(regex)) {
    const candidate = normalizeRepoPath(match[1]);
    if (!candidate || candidate.includes("://")) continue;
    candidates.add(candidate);
  }
  return [...candidates];
}

function isFileLikePath(value: string) {
  const base = path.posix.basename(value);
  return /\.[A-Za-z0-9]{1,8}$/.test(base);
}

function inferTargetFile(text: string, targetFolder: string | null): string | null {
  const fileCandidates = extractPathCandidates(text).filter(isFileLikePath);
  if (fileCandidates.length === 0) return null;
  if (targetFolder) {
    const matchingFolder = fileCandidates.filter((candidate) =>
      candidate === targetFolder || candidate.startsWith(`${targetFolder}/`),
    );
    if (matchingFolder.length === 1) return matchingFolder[0];
  }
  return fileCandidates.length === 1 ? fileCandidates[0] : null;
}

function collectBoundedMultiFileTargets(
  text: string,
  targetFolder: string | null,
): string[] {
  if (!targetFolder) return [];

  return extractPathCandidates(text)
    .filter(isFileLikePath)
    .filter((candidate) => candidate.startsWith(`${targetFolder}/`));
}

function inferTargetFolder(text: string): string | null {
  const candidates = extractPathCandidates(text).filter((candidate) => !isFileLikePath(candidate));
  return candidates.length === 1 ? candidates[0] : null;
}

function inferArtifactKindFromTargetFile(
  targetFile: string | null,
): IssueExecutionPacketArtifactKind | null {
  if (!targetFile) return null;
  const lowerPath = targetFile.toLowerCase();
  const ext = path.posix.extname(lowerPath);
  if (/(?:^|\/).+\.(?:test|spec)\.[a-z0-9]+$/.test(lowerPath) || /(?:^|\/)(?:__tests__|tests?)\//.test(lowerPath)) {
    return "test_update";
  }
  if (DOC_EXTENSIONS.has(ext) || /(readme|runbook|plan|spec)\./.test(lowerPath)) {
    return "doc_update";
  }
  if (CONFIG_EXTENSIONS.has(ext) || /(config|settings|policy)\./.test(lowerPath)) {
    return "config_change";
  }
  if (CODE_EXTENSIONS.has(ext)) {
    return "code_patch";
  }
  return null;
}

function hasExecutionCue(text: string) {
  return /\b(implement|fix|update|edit|write|refactor|change|create|add|remove|rename|modify|build)\b/i.test(text)
    && /\b(file|folder|directory|endpoint|route|component|test|doc|document|readme|config|schema|migration|runbook)\b/i.test(text);
}

function isBroadTargetFolder(targetFolder: string | null) {
  if (!targetFolder) return true;
  const normalized = targetFolder.trim().toLowerCase();
  return normalized === "." || normalized === "/" || normalized === "root" || normalized === "repo";
}

export function resolveIssueExecutionPacketTruth(input: {
  title?: string | null;
  description?: string | null;
}): IssueExecutionPacketTruth {
  const title = normalizeLineValue(input.title) ?? "";
  const description = input.description ?? null;
  const joinedText = [title, description ?? ""].filter(Boolean).join("\n");

  const packetType = normalizeLowerField(
    readMetadataField(description, ["packetType", "packet type", "packet_type"]),
  );
  const executionIntent = normalizeLowerField(
    readMetadataField(description, ["executionIntent", "execution intent", "execution_intent"]),
  );
  const reviewPolicy = normalizeLowerField(
    readMetadataField(description, ["reviewPolicy", "review policy", "review_policy"]),
  );
  const needsReview = readBooleanField(description, ["needsReview", "needs review", "needs_review"]);

  const explicitTargetFile = normalizeRepoPath(
    readMetadataField(description, ["targetFile", "target file", "target_file"]),
  );
  const explicitTargetFolder = normalizeRepoPath(
    readMetadataField(description, ["targetFolder", "target folder", "target_folder"]),
  );
  const targetFile = explicitTargetFile ?? inferTargetFile(joinedText, explicitTargetFolder);
  const targetFolder =
    explicitTargetFolder ??
    (targetFile ? normalizeRepoPath(path.posix.dirname(targetFile)) ?? "." : inferTargetFolder(joinedText));
  const boundedMultiFileTargets = collectBoundedMultiFileTargets(
    joinedText,
    targetFolder,
  );

  const rawDoneWhen = readMetadataField(description, ["doneWhen", "done when", "done_when"]);
  const doneWhen = rawDoneWhen && rawDoneWhen.trim().length >= 12 ? rawDoneWhen.trim() : null;

  const artifactKind =
    normalizeArtifactKind(
      readMetadataField(description, ["artifactKind", "artifact kind", "artifact_kind"]),
    ) ?? inferArtifactKindFromTargetFile(targetFile);

  const scopeMode = targetFile && targetFolder
    ? "mixed"
    : targetFile
      ? "file"
      : targetFolder
        ? "folder"
        : "none";

  const executionHeavy =
    (executionIntent ? IMPLEMENT_LIKE_INTENTS.has(executionIntent) : false) ||
    (packetType ? EXECUTION_PACKET_TYPES.has(packetType) : false) ||
    Boolean(targetFile || targetFolder || artifactKind || doneWhen) ||
    hasExecutionCue(joinedText);

  const reasonCodes: IssueExecutionPacketReasonCode[] = [];
  if (executionHeavy) {
    if (!doneWhen) reasonCodes.push("donewhen_missing");
    if (!artifactKind) reasonCodes.push("artifact_kind_missing");
    if (!targetFolder) reasonCodes.push("target_folder_missing");

    const hasBoundedExplicitMultiFileScope = boundedMultiFileTargets.length >= 2;
    const targetFileRequired =
      !hasBoundedExplicitMultiFileScope &&
      (!artifactKind ||
        FILE_LIKE_ARTIFACT_KINDS.has(artifactKind) ||
        isBroadTargetFolder(targetFolder) ||
        !FOLDER_OK_ARTIFACT_KINDS.has(artifactKind));
    if (targetFileRequired && !targetFile) {
      reasonCodes.push("target_file_missing");
    }

    if (!targetFile && (!targetFolder || isBroadTargetFolder(targetFolder))) {
      reasonCodes.push("execution_scope_ambiguous");
    }
  }

  return {
    packetType,
    executionIntent,
    reviewPolicy,
    needsReview,
    targetFile,
    targetFolder,
    doneWhen,
    artifactKind,
    scopeMode,
    executionHeavy,
    ready: executionHeavy ? reasonCodes.length === 0 : true,
    status: executionHeavy
      ? reasonCodes.length === 0
        ? "ready"
        : "not_ready"
      : "not_applicable",
    reasonCodes,
  };
}