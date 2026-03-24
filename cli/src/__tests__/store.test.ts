import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveConfigPath } from "../config/store.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CWD = process.cwd();

function makeTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("cli config path resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.chdir(ORIGINAL_CWD);
  });

  it("ignores stale ambient worktree PAPERCLIP_CONFIG outside a local paperclip context", () => {
    const cwd = makeTempDir("paperclip-cli-store-");
    process.chdir(cwd);
    process.env.PAPERCLIP_CONFIG = path.join(cwd, "wrong-home", "instances", "main", "config.json");
    process.env.PAPERCLIP_INSTANCE_ID = "main";
    process.env.PAPERCLIP_IN_WORKTREE = "true";

    expect(resolveConfigPath()).toBe(
      path.resolve(os.homedir(), ".paperclip", "instances", "default", "config.json"),
    );
  });

  it("prefers repo-local .paperclip/config.json over ambient env", () => {
    const cwd = makeTempDir("paperclip-cli-store-local-");
    const paperclipDir = path.join(cwd, ".paperclip");
    const configPath = path.join(paperclipDir, "config.json");
    fs.mkdirSync(paperclipDir, { recursive: true });
    fs.writeFileSync(configPath, "{}\n", "utf8");
    process.chdir(cwd);
    process.env.PAPERCLIP_CONFIG = path.join(cwd, "wrong-home", "config.json");

    expect(resolveConfigPath()).toBe(configPath);
  });
});