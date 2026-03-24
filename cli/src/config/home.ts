import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseEnvFileContents } from "dotenv";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const WORKTREE_ENV_RE = /^(1|true|yes|on)$/i;
const PAPERCLIP_DIRNAME = ".paperclip";
const PAPERCLIP_CONFIG_BASENAME = "config.json";
const PAPERCLIP_ENV_BASENAME = ".env";

type LocalPaperclipContext = {
  dirPath: string;
  configPath: string | null;
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
    throw new Error(
      `Invalid instance id '${raw}'. Allowed characters: letters, numbers, '_' and '-'.`,
    );
  }
  return raw;
}

export function resolvePaperclipInstanceRoot(instanceId?: string): string {
  const id = resolvePaperclipInstanceId(instanceId);
  return path.resolve(resolvePaperclipHomeDir(), "instances", id);
}

export function resolveDefaultConfigPath(instanceId?: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(instanceId), "config.json");
}

export function resolveDefaultContextPath(): string {
  return path.resolve(resolvePaperclipHomeDir(), "context.json");
}

export function resolveDefaultEmbeddedPostgresDir(instanceId?: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(instanceId), "db");
}

export function resolveDefaultLogsDir(instanceId?: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(instanceId), "logs");
}

export function resolveDefaultSecretsKeyFilePath(instanceId?: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(instanceId), "secrets", "master.key");
}

export function resolveDefaultStorageDir(instanceId?: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(instanceId), "data", "storage");
}

export function resolveDefaultBackupDir(instanceId?: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(instanceId), "data", "backups");
}

export function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function describeLocalInstancePaths(instanceId?: string) {
  const resolvedInstanceId = resolvePaperclipInstanceId(instanceId);
  const instanceRoot = resolvePaperclipInstanceRoot(resolvedInstanceId);
  return {
    homeDir: resolvePaperclipHomeDir(),
    instanceId: resolvedInstanceId,
    instanceRoot,
    configPath: resolveDefaultConfigPath(resolvedInstanceId),
    embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(resolvedInstanceId),
    backupDir: resolveDefaultBackupDir(resolvedInstanceId),
    logDir: resolveDefaultLogsDir(resolvedInstanceId),
    secretsKeyFilePath: resolveDefaultSecretsKeyFilePath(resolvedInstanceId),
    storageDir: resolveDefaultStorageDir(resolvedInstanceId),
  };
}
