import { describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  execute,
  rewriteWindowsPowerShellCommand,
} from "@paperclipai/adapter-gemini-local/server";
import { writeFakeNodeCommand } from "./test-command-utils.js";

const itGeminiExecute = process.platform === "win32" ? it.skip : it;

async function writeFakeGeminiCommand(
  commandPath: string,
  options?: {
    assistantText?: string;
    resultText?: string;
    model?: string;
  },
): Promise<string> {
  const assistantText = options?.assistantText ?? "hello";
  const resultText = options?.resultText ?? "ok";
  const model = options?.model ?? "gemini-2.5-pro";
  const script = `#!/usr/bin/env node
const fs = require("node:fs");

const capturePath = process.env.PAPERCLIP_TEST_CAPTURE_PATH;
const payload = {
  argv: process.argv.slice(2),
  paperclipEnvKeys: Object.keys(process.env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort(),
};
if (capturePath) {
  fs.writeFileSync(capturePath, JSON.stringify(payload), "utf8");
}
console.log(JSON.stringify({
  type: "system",
  subtype: "init",
  session_id: "gemini-session-1",
  model: ${JSON.stringify(model)},
}));
console.log(JSON.stringify({
  type: "assistant",
  message: { content: [{ type: "output_text", text: ${JSON.stringify(assistantText)} }] },
}));
console.log(JSON.stringify({
  type: "result",
  subtype: "success",
  session_id: "gemini-session-1",
  result: ${JSON.stringify(resultText)},
}));
`;
  return writeFakeNodeCommand(commandPath, script);
}

async function writeFakeGeminiLoopCommand(
  commandPath: string,
  options: {
    command: string;
    failures: number;
    keepAliveAfterFailures?: boolean;
    exitAfterFailuresCode?: number;
  },
): Promise<string> {
  const script = `#!/usr/bin/env node
console.log(JSON.stringify({
  type: "system",
  subtype: "init",
  session_id: "gemini-session-loop",
  model: "gemini-3-flash-preview",
}));
for (let i = 1; i <= ${options.failures}; i += 1) {
  console.log(JSON.stringify({
    type: "tool_use",
    tool_id: "tool_" + i,
    tool_name: "shell",
    parameters: { command: ${JSON.stringify(options.command)} },
  }));
  console.log(JSON.stringify({
    type: "tool_result",
    tool_id: "tool_" + i,
    output: {
      success: {
        exitCode: 1,
        stdout: "",
        stderr: "boom " + i,
      },
    },
    status: "error",
    is_error: true,
  }));
}
${typeof options.exitAfterFailuresCode === "number" ? `process.exit(${options.exitAfterFailuresCode});` : options.keepAliveAfterFailures === true ? "setInterval(() => {}, 1000);" : `
console.log(JSON.stringify({
  type: "result",
  subtype: "success",
  session_id: "gemini-session-loop",
  result: "done",
}));`}
`;
  return writeFakeNodeCommand(commandPath, script);
}

async function writeFakeGitCommand(commandPath: string, capturePath: string) {
  const script = `#!/usr/bin/env node
const fs = require("node:fs");
fs.writeFileSync(${JSON.stringify(capturePath)}, JSON.stringify({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
}), "utf8");
process.exit(0);
`;
  return writeFakeNodeCommand(commandPath, script);
}

type CapturePayload = {
  argv: string[];
  paperclipEnvKeys: string[];
};

describe("gemini execute", () => {
  itGeminiExecute(
    "passes prompt as final argument and injects paperclip env vars",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-execute-"),
      );
      const workspace = path.join(root, "workspace");
      const commandPath = path.join(root, "gemini");
      const capturePath = path.join(root, "capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiCommand(commandPath);
      const runtimeCommand =
        process.platform === "win32" ? process.execPath : executablePath;
      const runtimeExtraArgs =
        process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

      const previousHome = process.env.HOME;
      process.env.HOME = root;

      let invocationPrompt = "";
      try {
        const result = await execute({
          runId: "run-1",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Coder",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            model: "gemini-2.5-pro",
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {},
          authToken: "run-jwt-token",
          onLog: async () => {},
          onMeta: async (meta) => {
            invocationPrompt = meta.prompt ?? "";
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.errorMessage).toBeNull();

        const capture = JSON.parse(
          await fs.readFile(capturePath, "utf8"),
        ) as CapturePayload;
        expect(capture.argv).toContain("--output-format");
        expect(capture.argv).toContain("stream-json");
        expect(capture.argv).toContain("--approval-mode");
        expect(capture.argv).toContain("yolo");
        const joinedArgs = capture.argv.join(" ");
        expect(joinedArgs).toContain("Follow the paperclip heartbeat.");
        expect(joinedArgs).toContain("Paperclip runtime note:");
        expect(capture.paperclipEnvKeys).toEqual(
          expect.arrayContaining([
            "PAPERCLIP_AGENT_ID",
            "PAPERCLIP_API_KEY",
            "PAPERCLIP_API_URL",
            "PAPERCLIP_COMPANY_ID",
            "PAPERCLIP_RUN_ID",
          ]),
        );
        expect(invocationPrompt).toContain("Paperclip runtime note:");
        expect(invocationPrompt).toContain("PAPERCLIP_API_URL");
        expect(invocationPrompt).toContain("Paperclip API access note:");
        expect(invocationPrompt).toContain("run_shell_command");
        expect(result.question).toBeNull();
      } finally {
        if (previousHome === undefined) {
          delete process.env.HOME;
        } else {
          process.env.HOME = previousHome;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itGeminiExecute("always passes --approval-mode yolo", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "paperclip-gemini-yolo-"),
    );
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "gemini");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    const executablePath = await writeFakeGeminiCommand(commandPath);
    const runtimeCommand =
      process.platform === "win32" ? process.execPath : executablePath;
    const runtimeExtraArgs =
      process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      await execute({
        runId: "run-yolo",
        agent: {
          id: "a1",
          companyId: "c1",
          name: "G",
          adapterType: "gemini_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: runtimeCommand,
          cwd: workspace,
          ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
          env: { PAPERCLIP_TEST_CAPTURE_PATH: capturePath },
        },
        context: {},
        authToken: "t",
        onLog: async () => {},
      });

      const capture = JSON.parse(
        await fs.readFile(capturePath, "utf8"),
      ) as CapturePayload;
      expect(capture.argv).toContain("--approval-mode");
      expect(capture.argv).toContain("yolo");
      expect(capture.argv).not.toContain("--policy");
      expect(capture.argv).not.toContain("--allow-all");
      expect(capture.argv).not.toContain("--allow-read");
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  itGeminiExecute(
    "prepends issue task notes and single-file benchmark guard",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-issue-"),
      );
      const workspace = path.join(root, "workspace");
      const commandPath = path.join(root, "gemini");
      const capturePath = path.join(root, "capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiCommand(commandPath);
      const runtimeCommand =
        process.platform === "win32" ? process.execPath : executablePath;
      const runtimeExtraArgs =
        process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

      const previousHome = process.env.HOME;
      process.env.HOME = root;

      let invocationPrompt = "";
      try {
        await execute({
          runId: "run-issue",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Coder",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {
            paperclipTaskPrompt: [
              "Paperclip issue assignment:",
              "DAV-4 - Gemini Benchmark #01",
              "",
              "Read only the file:",
              "packages/adapters/gemini-local/src/server/models.ts",
            ].join("\n"),
            paperclipSingleFileTargetPath:
              "packages/adapters/gemini-local/src/server/models.ts",
            paperclipAbortOnMissingFile: true,
          },
          authToken: "run-jwt-token",
          onLog: async () => {},
          onMeta: async (meta) => {
            invocationPrompt = meta.prompt ?? "";
          },
        });

        expect(invocationPrompt).toContain("Paperclip issue assignment:");
        expect(invocationPrompt).toContain("DAV-4 - Gemini Benchmark #01");
        expect(invocationPrompt).toContain("Single-file benchmark guard:");
        expect(invocationPrompt).toContain(
          "If the file is missing or unreadable in the current workspace, stop immediately",
        );
        expect(invocationPrompt).toContain(
          "Do not list directories, search the repository, inspect imports in other files, run commands, or read any other file.",
        );
      } finally {
        if (previousHome === undefined) {
          delete process.env.HOME;
        } else {
          process.env.HOME = previousHome;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itGeminiExecute(
    "emits dry-run preflight telemetry without changing prompt or execution behavior",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-preflight-observe-"),
      );
      const workspace = path.join(root, "workspace");
      const commandPath = path.join(root, "gemini");
      const capturePath = path.join(root, "capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiCommand(commandPath);
      const runtimeCommand =
        process.platform === "win32" ? process.execPath : executablePath;
      const runtimeExtraArgs =
        process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

      const previousHome = process.env.HOME;
      process.env.HOME = root;

      let baselinePrompt = "";
      let dryRunPrompt = "";
      let dryRunTelemetry: unknown = null;
      let shadowTelemetry: unknown = null;
      try {
        const baselineResult = await execute({
          runId: "run-observe-baseline",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Coder",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {
            paperclipTaskPrompt: "Paperclip issue assignment:\nDAV-4",
          },
          authToken: "run-jwt-token",
          onLog: async () => {},
          onMeta: async (meta) => {
            baselinePrompt = meta.prompt ?? "";
          },
        });

        const dryRunResult = await execute({
          runId: "run-observe-dry-run",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Coder",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {
            executionMode: "dry_run",
            isTestRun: true,
            paperclipTaskPrompt: "Paperclip issue assignment:\nDAV-4",
          },
          authToken: "run-jwt-token",
          onLog: async () => {},
          onMeta: async (meta) => {
            dryRunPrompt = meta.prompt ?? "";
            dryRunTelemetry = meta.promptResolverDryRunPreflight ?? null;
            shadowTelemetry = meta.promptResolverShadow ?? null;
          },
        });

        expect(baselineResult.exitCode).toBe(0);
        expect(dryRunResult.exitCode).toBe(0);
        expect(baselineResult.errorMessage).toBeNull();
        expect(dryRunResult.errorMessage).toBeNull();
        expect(dryRunPrompt).toBe(baselinePrompt);
        expect(dryRunTelemetry).toMatchObject({
          resolverDecision: "ok",
          reasonCodes: [],
          auditMeta: {
            source: "gemini_local.execute",
            dryRunObserved: true,
          },
        });
        expect(shadowTelemetry).toMatchObject({
          resolverPath: {
            resolverDecision: "ok",
            reasonCodes: [],
          },
          comparison: {
            promptsEquivalent: true,
          },
          auditMeta: {
            source: "gemini_local.execute",
            mode: "shadow",
            readOnly: true,
          },
        });
      } finally {
        if (previousHome === undefined) {
          delete process.env.HOME;
        } else {
          process.env.HOME = previousHome;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itGeminiExecute(
    "injects project-aware API notes for child issue creation when issue context is present",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-ceo-api-"),
      );
      const workspace = path.join(root, "workspace");
      const commandPath = path.join(root, "gemini");
      const capturePath = path.join(root, "capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiCommand(commandPath);
      const runtimeCommand =
        process.platform === "win32" ? process.execPath : executablePath;
      const runtimeExtraArgs =
        process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

      const previousHome = process.env.HOME;
      process.env.HOME = root;

      let invocationPrompt = "";
      try {
        await execute({
          runId: "run-ceo-api",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini CEO",
            adapterType: "gemini_local",
            adapterConfig: {
              roleTemplateId: "ceo",
            },
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Plan bounded work packets.",
          },
          context: {
            issueId: "issue-123",
            taskId: "issue-123",
            projectId: "project-456",
          },
          authToken: "run-jwt-token",
          onLog: async () => {},
          onMeta: async (meta) => {
            invocationPrompt = meta.prompt ?? "";
          },
        });

        const capture = JSON.parse(
          await fs.readFile(capturePath, "utf8"),
        ) as CapturePayload;
        expect(capture.paperclipEnvKeys).toEqual(
          expect.arrayContaining([
            "PAPERCLIP_PROJECT_ID",
            "PAPERCLIP_TASK_ID",
          ]),
        );
        expect(invocationPrompt).toContain("Create child issue example:");
        expect(invocationPrompt).toContain(
          "Do not search for a Paperclip CLI for issue management.",
        );
        expect(invocationPrompt).toContain(
          "Execute the Paperclip API calls with run_shell_command.",
        );
        expect(invocationPrompt).toContain("PAPERCLIP_PROJECT_ID");
        expect(invocationPrompt).toContain(
          "/api/companies/$env:PAPERCLIP_COMPANY_ID/issues",
        );
      } finally {
        if (previousHome === undefined) {
          delete process.env.HOME;
        } else {
          process.env.HOME = previousHome;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itGeminiExecute(
    "prepends canonical role template notes when provided in context",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-role-template-"),
      );
      const workspace = path.join(root, "workspace");
      const commandPath = path.join(root, "gemini");
      const capturePath = path.join(root, "capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiCommand(commandPath);
      const runtimeCommand =
        process.platform === "win32" ? process.execPath : executablePath;
      const runtimeExtraArgs =
        process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

      const previousHome = process.env.HOME;
      process.env.HOME = root;

      let invocationPrompt = "";
      try {
        await execute({
          runId: "run-role-template",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Worker",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {
            paperclipRoleTemplatePrompt: [
              "Canonical role template: Worker (worker@v1)",
              "Role purpose: Execute one clearly scoped work packet and produce a concrete result.",
              "",
              "Stay inside scope. Do not redefine the mission.",
            ].join("\n"),
          },
          authToken: "run-jwt-token",
          onLog: async () => {},
          onMeta: async (meta) => {
            invocationPrompt = meta.prompt ?? "";
          },
        });

        expect(invocationPrompt).toContain(
          "Canonical role template: Worker (worker@v1)",
        );
        expect(invocationPrompt).toContain(
          "Stay inside scope. Do not redefine the mission.",
        );
      } finally {
        if (previousHome === undefined) {
          delete process.env.HOME;
        } else {
          process.env.HOME = previousHome;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  it("rewrites Windows PowerShell && chains for monitoring", () => {
    expect(
      rewriteWindowsPowerShellCommand("npm install && npm test", "win32"),
    ).toEqual({
      command: "npm install; npm test",
      rewritten: true,
    });
    expect(
      rewriteWindowsPowerShellCommand("npm install; npm test", "win32"),
    ).toEqual({
      command: "npm install; npm test",
      rewritten: false,
    });
    expect(
      rewriteWindowsPowerShellCommand("npm install && npm test", "linux"),
    ).toEqual({
      command: "npm install && npm test",
      rewritten: false,
    });
  });

  it("emits a loop warning after the same failing shell command 3 times", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "paperclip-gemini-loop-warning-"),
    );
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "gemini");
    await fs.mkdir(workspace, { recursive: true });
    const executablePath = await writeFakeGeminiLoopCommand(commandPath, {
      command: "npm install && npm test",
      failures: 3,
    });
    const platformSpy = vi.spyOn(os, "platform").mockReturnValue("win32");
    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];

    try {
      const result = await execute({
        runId: "run-loop-warning",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Gemini Worker",
          adapterType: "gemini_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: executablePath,
          cwd: workspace,
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorCode).toBeNull();
      const stderr = logs
        .filter((entry) => entry.stream === "stderr")
        .map((entry) => entry.chunk)
        .join("");
      const stdout = logs
        .filter((entry) => entry.stream === "stdout")
        .map((entry) => entry.chunk)
        .join("");
      expect(stderr).toContain("[paperclip] PowerShell &&");
      expect(stdout).toContain("Same command failed 3 times");
    } finally {
      platformSpy.mockRestore();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("stops the run after the same failing shell command 5 times", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "paperclip-gemini-loop-stop-"),
    );
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "gemini");
    await fs.mkdir(workspace, { recursive: true });
    const executablePath = await writeFakeGeminiLoopCommand(commandPath, {
      command: "npm install && npm test",
      failures: 5,
      exitAfterFailuresCode: 1,
    });
    const platformSpy = vi.spyOn(os, "platform").mockReturnValue("win32");

    try {
      const result = await execute({
        runId: "run-loop-stop",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Gemini Worker",
          adapterType: "gemini_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: executablePath,
          cwd: workspace,
          timeoutSec: 5,
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.errorCode).toBe("loop_detected");
      expect(result.errorMessage).toContain(
        "Loop detected: same command failed 5x. Stopping to prevent token waste.",
      );
    } finally {
      platformSpy.mockRestore();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  itGeminiExecute(
    "aborts looped worker runs by resetting the workspace",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-loop-cleanup-"),
      );
      const workspace = path.join(root, "workspace");
      const geminiCommandPath = path.join(root, "gemini");
      const gitCommandPath = path.join(root, "git");
      const gitCapturePath = path.join(root, "git-capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiLoopCommand(geminiCommandPath, {
        command: "npm install && npm test",
        failures: 5,
        exitAfterFailuresCode: 1,
      });
      const fakeGitPath = await writeFakeGitCommand(gitCommandPath, gitCapturePath);
      const platformSpy = vi.spyOn(os, "platform").mockReturnValue("win32");

      const previousPath = process.env.PATH;
      process.env.PATH = `${path.dirname(fakeGitPath)}${path.delimiter}${
        previousPath ?? ""
      }`;

      try {
        const result = await execute({
          runId: "run-loop-cleanup",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Worker",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: executablePath,
            cwd: workspace,
            timeoutSec: 5,
            env: {},
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {},
          authToken: "run-jwt-token",
          onLog: async () => {},
        });

        expect(result.errorCode).toBe("loop_detected");
        expect(result.errorMessage).toContain(
          "Workspace reset with git checkout -- .",
        );

        const capture = JSON.parse(
          await fs.readFile(gitCapturePath, "utf8"),
        ) as { argv: string[]; cwd: string };
        expect(capture.argv).toEqual(["checkout", "--", "."]);
        expect(capture.cwd).toBe(workspace);
      } finally {
        platformSpy.mockRestore();
        if (previousPath === undefined) {
          delete process.env.PATH;
        } else {
          process.env.PATH = previousPath;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itGeminiExecute(
    "fails strict floor on fenced final output",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "paperclip-gemini-strict-floor-"),
      );
      const workspace = path.join(root, "workspace");
      const commandPath = path.join(root, "gemini");
      const capturePath = path.join(root, "capture.json");
      await fs.mkdir(workspace, { recursive: true });
      const executablePath = await writeFakeGeminiCommand(commandPath, {
        assistantText: ["```json", "{", '  "answer": true', "}", "```"].join("\n"),
      });
      const runtimeCommand =
        process.platform === "win32" ? process.execPath : executablePath;
      const runtimeExtraArgs =
        process.platform === "win32" ? [`${commandPath}.cjs`] : undefined;

      const previousHome = process.env.HOME;
      process.env.HOME = root;

      try {
        const result = await execute({
          runId: "run-strict-floor",
          agent: {
            id: "agent-1",
            companyId: "company-1",
            name: "Gemini Coder",
            adapterType: "gemini_local",
            adapterConfig: {},
          },
          runtime: {
            sessionId: null,
            sessionParams: null,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: {
            command: runtimeCommand,
            cwd: workspace,
            ...(runtimeExtraArgs ? { extraArgs: runtimeExtraArgs } : {}),
            env: {
              PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            },
            promptTemplate: "Follow the paperclip heartbeat.",
          },
          context: {
            paperclipBenchmarkFamily: "T1-floor-v1",
            paperclipStrictFloorMode: true,
          },
          authToken: "run-jwt-token",
          onLog: async () => {},
        });

        expect(result.exitCode).toBe(0);
        expect(result.errorCode).toBe("non_json_output");
        expect(result.errorMessage).toContain("Strict floor output was not raw JSON");
      } finally {
        if (previousHome === undefined) {
          delete process.env.HOME;
        } else {
          process.env.HOME = previousHome;
        }
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );
});
