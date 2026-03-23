import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSpawnSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

import { createGitHubPR } from "../services/github-pr.js";

const ORIGINAL_ENV = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GH_TOKEN: process.env.GH_TOKEN,
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
  GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
  GITHUB_BASE_BRANCH: process.env.GITHUB_BASE_BRANCH,
  GITHUB_SERVER_URL: process.env.GITHUB_SERVER_URL,
};

beforeEach(() => {
  mockSpawnSync.mockReset();
  delete process.env.GH_TOKEN;
  process.env.GITHUB_TOKEN = "ghs_test_token";
  process.env.GITHUB_REPOSITORY = "davidgeib89-art/dgdh-werkbank";
  delete process.env.GITHUB_REPO_OWNER;
  delete process.env.GITHUB_REPO_NAME;
  delete process.env.GITHUB_BASE_BRANCH;
  delete process.env.GITHUB_SERVER_URL;
});

afterEach(() => {
  if (ORIGINAL_ENV.GITHUB_TOKEN === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = ORIGINAL_ENV.GITHUB_TOKEN;
  if (ORIGINAL_ENV.GH_TOKEN === undefined) delete process.env.GH_TOKEN;
  else process.env.GH_TOKEN = ORIGINAL_ENV.GH_TOKEN;
  if (ORIGINAL_ENV.GITHUB_REPOSITORY === undefined) delete process.env.GITHUB_REPOSITORY;
  else process.env.GITHUB_REPOSITORY = ORIGINAL_ENV.GITHUB_REPOSITORY;
  if (ORIGINAL_ENV.GITHUB_REPO_OWNER === undefined) delete process.env.GITHUB_REPO_OWNER;
  else process.env.GITHUB_REPO_OWNER = ORIGINAL_ENV.GITHUB_REPO_OWNER;
  if (ORIGINAL_ENV.GITHUB_REPO_NAME === undefined) delete process.env.GITHUB_REPO_NAME;
  else process.env.GITHUB_REPO_NAME = ORIGINAL_ENV.GITHUB_REPO_NAME;
  if (ORIGINAL_ENV.GITHUB_BASE_BRANCH === undefined) delete process.env.GITHUB_BASE_BRANCH;
  else process.env.GITHUB_BASE_BRANCH = ORIGINAL_ENV.GITHUB_BASE_BRANCH;
  if (ORIGINAL_ENV.GITHUB_SERVER_URL === undefined) delete process.env.GITHUB_SERVER_URL;
  else process.env.GITHUB_SERVER_URL = ORIGINAL_ENV.GITHUB_SERVER_URL;
  vi.restoreAllMocks();
});

describe("createGitHubPR", () => {
  it("creates a pull request via GitHub REST API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          html_url: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/999",
          number: 999,
        }),
        { status: 201 },
      ),
    );

    const result = await createGitHubPR({
      branch: "dgdh/issue-DGD-999-schema-fill",
      title: "[DGD-999] Schema Fill Worker",
      body: "Goal: x\nResult: y\nFiles Changed: a\nBlockers: none\nNext: review",
    });

    expect(result.prUrl).toBe("https://github.com/davidgeib89-art/dgdh-werkbank/pull/999");
    expect(result.prNumber).toBe(999);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/davidgeib89-art/dgdh-werkbank/pulls",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ghs_test_token",
        }),
      }),
    );
  });

  it("reuses existing open pull requests when GitHub returns 422", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "A pull request already exists for branch" }),
          { status: 422 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              html_url: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/1000",
              number: 1000,
            },
          ]),
          { status: 200 },
        ),
      );

    const result = await createGitHubPR({
      branch: "dgdh/issue-DGD-1000-existing",
      title: "[DGD-1000] Existing PR",
      body: "Goal: x\nResult: y\nFiles Changed: a\nBlockers: none\nNext: review",
    });

    expect(result.prNumber).toBe(1000);
    expect(result.prUrl).toContain("/pull/1000");
  });

  it("falls back to origin remote when repo env is missing", async () => {
    delete process.env.GITHUB_REPOSITORY;

    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: "https://github.com/davidgeib89-art/dgdh-werkbank.git\n",
      stderr: "",
      pid: 321,
      output: [],
      signal: null,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          html_url: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/1001",
          number: 1001,
        }),
        { status: 201 },
      ),
    );

    const result = await createGitHubPR({
      branch: "dgdh/issue-DGD-1001-remote-fallback",
      title: "[DGD-1001] Remote Fallback",
      body: "Goal: x\nResult: y\nFiles Changed: a\nBlockers: none\nNext: review",
    });

    expect(result.prNumber).toBe(1001);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/davidgeib89-art/dgdh-werkbank/pulls",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghs_test_token",
        }),
      }),
    );
  });

  it("fails when token is missing", async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    mockSpawnSync.mockReturnValue({
      status: 1,
      stdout: "",
      stderr: "",
      pid: 0,
      output: [],
      signal: null,
    });

    await expect(
      createGitHubPR({
        branch: "dgdh/issue-DGD-1001-no-token",
        title: "[DGD-1001] No Token",
        body: "Goal: x\nResult: y\nFiles Changed: a\nBlockers: none\nNext: review",
      }),
    ).rejects.toThrow("Missing GitHub token");
  });

  it("falls back to git credential store when env token is missing", async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;

    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: "protocol=https\nhost=github.com\nusername=test-user\npassword=gho_from_git_credential\n",
      stderr: "",
      pid: 123,
      output: [],
      signal: null,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          html_url: "https://github.com/davidgeib89-art/dgdh-werkbank/pull/1002",
          number: 1002,
        }),
        { status: 201 },
      ),
    );

    const result = await createGitHubPR({
      branch: "dgdh/issue-DGD-1002-credential-fallback",
      title: "[DGD-1002] Credential Fallback",
      body: "Goal: x\nResult: y\nFiles Changed: a\nBlockers: none\nNext: review",
    });

    expect(result.prNumber).toBe(1002);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/davidgeib89-art/dgdh-werkbank/pulls",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer gho_from_git_credential",
        }),
      }),
    );
  });
});
