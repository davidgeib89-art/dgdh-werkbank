import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Validates that DGDH Engine V1 defaults are correctly wired into the codebase.
 * These are contract tests — they read source files and verify the defaults match
 * the Engine V1 spec (company-hq/DGDH-GEMINI-ENGINE-V1-2026-03-19.md).
 */

const serverRoot = path.resolve(__dirname, "../../..");
const heartbeatSource = readFileSync(
  path.join(serverRoot, "server/src/services/heartbeat.ts"),
  "utf8",
);
const executeSource = readFileSync(
  path.join(
    serverRoot,
    "packages/adapters/gemini-local/src/server/execute.ts",
  ),
  "utf8",
);

describe("DGDH Engine V1 — session compaction defaults", () => {
  it("maxSessionRuns default is 20", () => {
    expect(heartbeatSource).toContain(
      'asNumber(compaction.maxSessionRuns, 20)',
    );
  });

  it("maxRawInputTokens default is 500_000", () => {
    expect(heartbeatSource).toContain(
      'asNumber(compaction.maxRawInputTokens, 500_000)',
    );
  });

  it("maxSessionAgeHours default is 48", () => {
    expect(heartbeatSource).toContain(
      'asNumber(compaction.maxSessionAgeHours, 48)',
    );
  });
});

describe("DGDH Engine V1 — prompt template", () => {
  it("default prompt is DGDH-fit, not generic Paperclip", () => {
    expect(executeSource).toContain("DGDH Werkbank");
    expect(executeSource).not.toContain(
      '"You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work."',
    );
  });
});

describe("DGDH Engine V1 — skill filtering", () => {
  it("ensureGeminiSkillsInjected accepts includeSkills parameter", () => {
    expect(executeSource).toContain(
      "ensureGeminiSkillsInjected(onLog, includeSkills",
    );
  });

  it("config.includeSkills is read from adapter config", () => {
    expect(executeSource).toContain("asStringArray(config.includeSkills)");
  });
});

describe("DGDH Engine V1 — prompt diet guards", () => {
  it("includePaperclipEnvNote defaults to false", () => {
    expect(executeSource).toContain(
      'asBoolean(config.includePaperclipEnvNote, false)',
    );
  });

  it("includeApiAccessNote defaults to false", () => {
    expect(executeSource).toContain(
      'asBoolean(config.includeApiAccessNote, false)',
    );
  });
});

describe("DGDH Approval Loop V1 — gate wiring", () => {
  it("awaiting_approval gate is present (gate 2)", () => {
    expect(heartbeatSource).toContain("routingNeedsApproval");
    expect(heartbeatSource).toContain('"awaiting_approval"');
  });

  it("hard-blocked gate is separate from awaiting_approval gate (gate 1)", () => {
    expect(heartbeatSource).toContain("routingHardBlocked");
    // Both gates have early returns — they're independent
    expect(heartbeatSource).toContain("routing_awaiting_approval");
    expect(heartbeatSource).toContain("routing_blocked");
  });

  it("approval record is auto-created on awaiting_approval", () => {
    expect(heartbeatSource).toContain('"routing_gate"');
    expect(heartbeatSource).toContain("approvalService(db).create");
  });
});
