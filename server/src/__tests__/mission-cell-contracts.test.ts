import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMissionCellRuntimeBridge } from "../services/mission-cell-contracts.js";

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
});
