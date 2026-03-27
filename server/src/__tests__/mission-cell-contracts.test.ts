import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMissionCellPromptBlock,
  resolveMissionCellRuntimeBridge,
} from "../services/mission-cell-contracts.js";

describe("resolveMissionCellRuntimeBridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces invalid mission cell contracts as explicit runtime warnings", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue([
      {
        name: "broken.json",
        isFile: () => true,
      } as fs.Dirent,
    ]);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        schemaVersion: "v1",
        missionCellId: "broken-cell",
        title: "Broken cell",
      }),
    );

    const bridge = resolveMissionCellRuntimeBridge("missionCell: broken-cell");

    expect(bridge.briefs).toEqual([]);
    expect(bridge.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Mission cell contract 'broken-cell'"),
        expect.stringContaining("no active valid contract file was found"),
      ]),
    );
  });

  it("includes startup continuity details in the mission cell prompt block", () => {
    const bridge = resolveMissionCellRuntimeBridge(
      "missionCell: first-live-mission-cell-proof-v1",
    );

    expect(bridge.briefs).toEqual([
      expect.objectContaining({
        missionCellId: "first-live-mission-cell-proof-v1",
        startupSequence: expect.arrayContaining([
          expect.stringContaining("Validate the mission cell contract"),
        ]),
        firstProbe: expect.arrayContaining([
          expect.stringContaining("Read prompt or wakeup context"),
        ]),
      }),
    ]);

    const promptBlock = buildMissionCellPromptBlock(bridge);
    expect(promptBlock).toContain(
      "contractFile: company-hq/mission-cells/first-live-mission-cell-proof-v1.json",
    );
    expect(promptBlock).toContain(
      "validate: pnpm paperclipai mission cell validate company-hq/mission-cells/first-live-mission-cell-proof-v1.json --json",
    );
    expect(promptBlock).toContain("startupSequence:");
    expect(promptBlock).toContain("firstProbe:");
  });

  it("keeps contract file paths repo-stable when the server cwd is nested", () => {
    vi.spyOn(process, "cwd").mockReturnValue(
      "c:/Users/holyd/DGDH/worktrees/dgdh-werkbank/server",
    );

    const bridge = resolveMissionCellRuntimeBridge(
      "missionCell: repeatable-live-mission-cell-proof-v1",
    );

    expect(bridge.briefs).toEqual([
      expect.objectContaining({
        missionCellId: "repeatable-live-mission-cell-proof-v1",
        filePath:
          "company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json",
      }),
    ]);

    const promptBlock = buildMissionCellPromptBlock(bridge);
    expect(promptBlock).toContain(
      "contractFile: company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json",
    );
    expect(promptBlock).toContain(
      "validate: pnpm paperclipai mission cell validate company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json --json",
    );
  });
});
