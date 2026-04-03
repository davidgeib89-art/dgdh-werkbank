// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getRunContextHealth, hasVisibleCompanyRunChainTruth, type CompanyRunActiveIdentity } from "./company-run-truth.js";

function makeRun(overrides?: Partial<CompanyRunActiveIdentity>): CompanyRunActiveIdentity {
  return {
    id: "run-12345678",
    status: "running",
    agentId: "agent-1",
    issueId: "issue-1",
    contextSnapshot: {
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    },
    ...overrides,
  };
}

describe("company run truth helpers", () => {
  it("reports full context when visible identity and active run align", () => {
    const health = getRunContextHealth({
      activeRun: makeRun(),
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    });

    expect(health.label).toBe("Full");
    expect(health.tone).toBe("full");
  });

  it("keeps the company run card visible even for a simple issue with no children or blocker", () => {
    expect(
      hasVisibleCompanyRunChainTruth({
        parentIssueId: "issue-1",
        parentIdentifier: "DAV-101",
        parentTitle: "Simple issue",
        parentStatus: "done",
        focusIssueId: "issue-1",
        parentBlocker: null,
        children: [],
      }),
    ).toBe(true);
  });
});
