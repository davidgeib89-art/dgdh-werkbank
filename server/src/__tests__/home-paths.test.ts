import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  normalizePaperclipRuntimeEnvironment,
  resolvePaperclipHomeDir,
  resolvePaperclipInstanceId,
} from "../home-paths.js";
import { resolvePaperclipConfigPath } from "../paths.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CWD = process.cwd();

function makeTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("server paperclip identity resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.chdir(ORIGINAL_CWD);
  });

  it("ignores stale ambient worktree env outside a repo-local paperclip context", () => {
    const cwd = makeTempDir("paperclip-server-home-");
    process.chdir(cwd);
    process.env.PAPERCLIP_HOME = path.join(cwd, "wrong-home");
    process.env.PAPERCLIP_INSTANCE_ID = "main";
    process.env.PAPERCLIP_CONFIG = path.join(cwd, "wrong-home", "instances", "main", "config.json");
    process.env.PAPERCLIP_IN_WORKTREE = "true";

    expect(resolvePaperclipHomeDir()).toBe(path.resolve(os.homedir(), ".paperclip"));
    expect(resolvePaperclipInstanceId()).toBe("default");
    expect(resolvePaperclipConfigPath()).toBe(
      path.resolve(os.homedir(), ".paperclip", "instances", "default", "config.json"),
    );
  });

  it("prefers repo-local paperclip env and config when present", () => {
    const cwd = makeTempDir("paperclip-server-local-");
    const paperclipDir = path.join(cwd, ".paperclip");
    fs.mkdirSync(paperclipDir, { recursive: true });
    const configPath = path.join(paperclipDir, "config.json");
    const envPath = path.join(paperclipDir, ".env");
    fs.writeFileSync(configPath, "{}\n", "utf8");
    fs.writeFileSync(
      envPath,
      [
        'PAPERCLIP_HOME="~/paperclip-worktrees"',
        "PAPERCLIP_INSTANCE_ID=feature-main",
        "PAPERCLIP_IN_WORKTREE=true",
        "",
      ].join("\n"),
      "utf8",
    );
    process.chdir(cwd);
    process.env.PAPERCLIP_HOME = path.join(cwd, "wrong-home");
    process.env.PAPERCLIP_INSTANCE_ID = "wrong";
    process.env.PAPERCLIP_CONFIG = path.join(cwd, "wrong-home", "config.json");

    expect(resolvePaperclipHomeDir()).toBe(path.resolve(os.homedir(), "paperclip-worktrees"));
    expect(resolvePaperclipInstanceId()).toBe("feature-main");
    expect(resolvePaperclipConfigPath()).toBe(configPath);

    normalizePaperclipRuntimeEnvironment();
    expect(process.env.PAPERCLIP_HOME).toBe(path.resolve(os.homedir(), "paperclip-worktrees"));
    expect(process.env.PAPERCLIP_INSTANCE_ID).toBe("feature-main");
  });
});