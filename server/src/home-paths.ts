import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseEnvFileContents } from "dotenv";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;
const WORKTREE_ENV_RE = /^(1|true|yes|on)$/i;
const PAPERCLIP_DIRNAME = ".paperclip";
const PAPERCLIP_CONFIG_BASENAME = "config.json";
const PAPERCLIP_ENV_BASENAME = ".env";

type LocalPaperclipContext = {
  dirPath: string;
  configPath: string | null;
  envPath: string | null;
  envEntries: Record<string, string>;
};

function readEnvEntries(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return parseEnvFileContents(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function findLocalPaperclipContext(startDir = process.cwd()): LocalPaperclipContext | null {
  let currentDir = path.resolve(startDir);

  while (true) {
    const dirPath = path.resolve(currentDir, PAPERCLIP_DIRNAME);
    const configPath = path.resolve(dirPath, PAPERCLIP_CONFIG_BASENAME);
    const envPath = path.resolve(dirPath, PAPERCLIP_ENV_BASENAME);
    const hasConfig = fs.existsSync(configPath);
    const hasEnv = fs.existsSync(envPath);
    if (hasConfig || hasEnv) {
      return {
        dirPath,
        configPath: hasConfig ? configPath : null,
        envPath: hasEnv ? envPath : null,
        envEntries: hasEnv ? readEnvEntries(envPath) : {},
      };
    }

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

function isTruthyEnv(value: string | undefined): boolean {
  return WORKTREE_ENV_RE.test(value ?? "");
}

function getLocalEnvValue(key: string, startDir = process.cwd()): string | null {
  const value = findLocalPaperclipContext(startDir)?.envEntries[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function findPaperclipLocalConfigPath(startDir = process.cwd()): string | null {
  return findLocalPaperclipContext(startDir)?.configPath ?? null;
}

export function shouldIgnoreAmbientWorktreePaperclipEnv(
  startDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isTruthyEnv(env.PAPERCLIP_IN_WORKTREE) && !findLocalPaperclipContext(startDir);
}

export function normalizePaperclipRuntimeEnvironment(
  startDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): { ignoredAmbientWorktreeEnv: boolean; localPaperclipDir: string | null } {
  const localContext = findLocalPaperclipContext(startDir);
  if (localContext) {
    for (const [key, value] of Object.entries(localContext.envEntries)) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) continue;

      if (key === "PAPERCLIP_HOME") {
        env[key] = path.resolve(expandHomePrefix(trimmed));
        continue;
      }
      if (key === "PAPERCLIP_CONFIG" || key === "PAPERCLIP_CONTEXT") {
        env[key] = path.resolve(expandHomePrefix(trimmed));
        continue;
      }

      env[key] = trimmed;
    }
    return {
      ignoredAmbientWorktreeEnv: false,
      localPaperclipDir: localContext.dirPath,
    };
  }

  const ignoredAmbientWorktreeEnv = shouldIgnoreAmbientWorktreePaperclipEnv(startDir, env);
  if (ignoredAmbientWorktreeEnv) {
    delete env.PAPERCLIP_HOME;
    delete env.PAPERCLIP_INSTANCE_ID;
    delete env.PAPERCLIP_CONFIG;
    delete env.PAPERCLIP_CONTEXT;
    delete env.PAPERCLIP_IN_WORKTREE;
    delete env.PAPERCLIP_WORKTREE_NAME;
    delete env.PAPERCLIP_WORKTREE_COLOR;
  }

  return {
    ignoredAmbientWorktreeEnv,
    localPaperclipDir: null,
  };
}

function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function resolvePaperclipHomeDir(
  startDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const localHome = getLocalEnvValue("PAPERCLIP_HOME", startDir);
  if (localHome) return path.resolve(expandHomePrefix(localHome));

  const envHome = shouldIgnoreAmbientWorktreePaperclipEnv(startDir, env)
    ? undefined
    : env.PAPERCLIP_HOME?.trim();
  if (envHome) return path.resolve(expandHomePrefix(envHome));
  return path.resolve(os.homedir(), ".paperclip");
}

export function resolvePaperclipInstanceId(
  override?: string,
  options?: { startDir?: string; env?: NodeJS.ProcessEnv },
): string {
  const startDir = options?.startDir ?? process.cwd();
  const env = options?.env ?? process.env;
  const raw =
    override?.trim() ||
    getLocalEnvValue("PAPERCLIP_INSTANCE_ID", startDir) ||
    (shouldIgnoreAmbientWorktreePaperclipEnv(startDir, env)
      ? undefined
      : env.PAPERCLIP_INSTANCE_ID?.trim()) ||
    DEFAULT_INSTANCE_ID;
  if (!INSTANCE_ID_RE.test(raw)) {
    throw new Error(`Invalid PAPERCLIP_INSTANCE_ID '${raw}'.`);
  }
  return raw;
}

export function resolvePaperclipInstanceRoot(
  startDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  return path.resolve(
    resolvePaperclipHomeDir(startDir, env),
    "instances",
    resolvePaperclipInstanceId(undefined, { startDir, env }),
  );
}

export function resolveDefaultConfigPath(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "config.json");
}

export function resolveDefaultEmbeddedPostgresDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "db");
}

export function resolveDefaultLogsDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "logs");
}

export function resolveDefaultSecretsKeyFilePath(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "secrets", "master.key");
}

export function resolveDefaultStorageDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "data", "storage");
}

export function resolveDefaultBackupDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "data", "backups");
}

export function resolveDefaultAgentWorkspaceDir(agentId: string): string {
  const trimmed = agentId.trim();
  if (!PATH_SEGMENT_RE.test(trimmed)) {
    throw new Error(`Invalid agent id for workspace path '${agentId}'.`);
  }
  return path.resolve(resolvePaperclipInstanceRoot(), "workspaces", trimmed);
}

export function resolveHomeAwarePath(value: string): string {
  return path.resolve(expandHomePrefix(value));
}
