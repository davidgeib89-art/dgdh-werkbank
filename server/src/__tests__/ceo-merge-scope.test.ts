import { describe, expect, it } from "vitest";
import { evaluateMergeScopeAgainstSummaryFiles } from "../services/ceo.js";

describe("evaluateMergeScopeAgainstSummaryFiles", () => {
  it("allows merge when worker summary files exactly match PR files", () => {
    const result = evaluateMergeScopeAgainstSummaryFiles({
      expectedFiles: [
        "server/src/routes/issues.ts",
        "server/src/__tests__/issue-merge-pr-route.test.ts",
      ],
      actualFiles: [
        "./server/src/routes/issues.ts",
        "server\\src\\__tests__\\issue-merge-pr-route.test.ts",
      ],
    });

    expect(result.matches).toBe(true);
    expect(result.unexpectedFiles).toEqual([]);
    expect(result.missingFiles).toEqual([]);
  });

  it("blocks merge when PR files diverge from worker summary files", () => {
    const result = evaluateMergeScopeAgainstSummaryFiles({
      expectedFiles: ["doc/archive/proof.md"],
      actualFiles: ["doc/archive/proof.md", "doc/experimental/hyperagents.pdf"],
    });

    expect(result.matches).toBe(false);
    expect(result.unexpectedFiles).toEqual(["doc/experimental/hyperagents.pdf"]);
    expect(result.missingFiles).toEqual([]);
  });
});