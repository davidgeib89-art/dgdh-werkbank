import { describe, expect, it } from "vitest";
import { extractNeedsInputLines, hasNeedsInput } from "./issueNeedsInput";

describe("issueNeedsInput", () => {
  it("detects exact lines containing [NEEDS INPUT]", () => {
    const description = [
      "## Ziel",
      "- final logo file",
      "- [NEEDS INPUT] Kunde muss Logo-Datei liefern",
      "",
      "[NEEDS INPUT] Domainwunsch unklar",
    ].join("\n");

    expect(extractNeedsInputLines(description)).toEqual([
      { lineNumber: 3, text: "- [NEEDS INPUT] Kunde muss Logo-Datei liefern" },
      { lineNumber: 5, text: "[NEEDS INPUT] Domainwunsch unklar" },
    ]);
  });

  it("returns no items when the marker is missing", () => {
    expect(extractNeedsInputLines("Ready for worker handoff")).toEqual([]);
    expect(hasNeedsInput("Ready for worker handoff")).toBe(false);
  });
});
