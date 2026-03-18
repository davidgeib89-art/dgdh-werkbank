import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execute } from "@paperclipai/adapter-gemini-local/server";
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
