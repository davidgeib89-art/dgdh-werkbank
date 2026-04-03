// @vitest-environment node

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CompanyRunChain, CloseoutTruth } from "@paperclipai/shared";
import { CompanyRunChainCard } from "./CompanyRunChainCard";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("../api/issues.js", () => ({
  issuesApi: {
    getCloseoutTruth: vi.fn(),
  },
}));

vi.mock("@/lib/router", async () => {
  const ReactModule = await import("react");
  return {
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) =>
      ReactModule.createElement("a", { href: to, ...props }, children),
  };
});

function makeChain(overrides?: Partial<CompanyRunChain>): CompanyRunChain {
  return {
    parentIssueId: "issue-1",
    parentIdentifier: "DAV-101",
    parentTitle: "Simple issue",
    parentStatus: "done",
    focusIssueId: "issue-1",
    parentBlocker: null,
    children: [],
    ...overrides,
  };
}

function makeCloseoutTruth(overrides?: Partial<CloseoutTruth>): CloseoutTruth {
  return {
    classification: "clean",
    reasons: ["All features complete"],
    gitStatus: {
      isClean: true,
      branch: "main",
      uncommittedChanges: false,
      untrackedFiles: false,
    },
    featureState: {
      total: 3,
      completed: 3,
      pending: 0,
      status: "complete",
    },
    validationState: {
      total: 5,
      passed: 5,
      failed: 0,
      blocked: 0,
      pending: 0,
      status: "complete",
    },
    ...overrides,
  };
}

function renderCard(closeoutTruth: CloseoutTruth | undefined) {
  mockUseQuery.mockReturnValue({ data: closeoutTruth });
  return renderToStaticMarkup(
    <CompanyRunChainCard
      chain={makeChain()}
      currentIssueId="issue-1"
      currentIssueIdentifier="DAV-101"
      currentIssueTitle="Simple issue"
      companyId="company-1"
      companyName="David Geib Digitales Handwerk"
      projectId="project-1"
      projectName="Paperclip"
      activeRun={null}
    />,
  );
}

describe("CompanyRunChainCard", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("stays visible for a simple issue with no children or blocker", () => {
    const html = renderCard(undefined);

    expect(html).toContain("Company run chain");
    expect(html).toContain("DAV-101 - Simple issue");
  });

  it("renders closeout truth for a clean issue-facing surface", () => {
    const html = renderCard(makeCloseoutTruth());

    expect(html).toContain("Closeout status");
    expect(html).toContain("clean");
    expect(html).toContain("All features complete");
  });

  it("shows pending validation and feature counts plus dirty git truth", () => {
    const html = renderCard(
      makeCloseoutTruth({
        classification: "blocked",
        reasons: ["2 validation assertion(s) failed", "Git working directory has uncommitted changes"],
        gitStatus: {
          isClean: false,
          branch: "feature/closeout",
          uncommittedChanges: true,
          untrackedFiles: false,
        },
        featureState: {
          total: 4,
          completed: 2,
          pending: 2,
          status: "incomplete",
        },
        validationState: {
          total: 5,
          passed: 3,
          failed: 2,
          blocked: 0,
          pending: 1,
          status: "incomplete",
        },
      }),
    );

    expect(html).toContain("blocked");
    expect(html).toContain("pending validation");
    expect(html).toContain("pending feature");
    expect(html).toContain("git changes");
    expect(html).toContain("2 validation assertion(s) failed");
  });
});
