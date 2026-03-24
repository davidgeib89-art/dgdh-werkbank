// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getRunContextHealth, type CompanyRunActiveIdentity } from "../lib/company-run-truth";

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

describe("getRunContextHealth", () => {
  it("reports full when visible identity and active run context align", () => {
    const health = getRunContextHealth({
      activeRun: makeRun(),
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    });

    expect(health.label).toBe("Full");
    expect(health.tone).toBe("full");
    expect(health.note).toContain("matches the visible issue");
  });

  it("reports degraded when run context is missing required identity", () => {
    const health = getRunContextHealth({
      activeRun: makeRun({
        contextSnapshot: {
          companyId: "company-1",
          issueId: "issue-1",
        },
      }),
      companyId: "company-1",
      projectId: "project-1",
      issueId: "issue-1",
      issueIdentifier: "DAV-101",
    });

    expect(health.label).toBe("Degraded");
    expect(health.tone).toBe("degraded");
    expect(health.note).toContain("run project");
    expect(health.note).toContain("run identifier");
  });

  it("reports degraded before a run when base project or issue identity is missing", () => {
    const health = getRunContextHealth({
      activeRun: null,
      companyId: "company-1",
      projectId: null,
      issueId: "issue-1",
      issueIdentifier: null,
    });

    expect(health.label).toBe("Degraded");
    expect(health.note).toContain("project");
    expect(health.note).toContain("issue identifier");
  });
});