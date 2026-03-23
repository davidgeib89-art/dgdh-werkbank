import * as childProcess from "node:child_process";
import { badRequest, unprocessable } from "../errors.js";
import { logger } from "../middleware/logger.js";

const DEFAULT_GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_GITHUB_WEB_BASE_URL = "https://github.com";
const DEFAULT_GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_GITHUB_ACCEPT_HEADER = "application/vnd.github+json";
const DEFAULT_GITHUB_BASE_BRANCH = "main";
const REQUIRED_BRANCH_PREFIX = "dgdh/issue-";

export interface CreateGitHubPRInput {
  owner?: string | null;
  repo?: string | null;
  branch: string;
  title: string;
  body: string;
  base?: string | null;
  draft?: boolean;
}

export interface CreateGitHubPROutput {
  prUrl: string;
  prNumber: number;
  owner: string;
  repo: string;
  branch: string;
  base: string;
}

export interface GitHubPullRequestDetails {
  prNumber: number;
  prUrl: string | null;
  branch: string | null;
  base: string | null;
  state: string | null;
  merged: boolean;
}

export type MergeGitHubPullRequestResult =
  | {
      outcome: "merged";
      sha: string | null;
      message: string | null;
    }
  | {
      outcome: "merge_conflict";
      statusCode: number;
      message: string;
    };

type GitHubRepoRef = {
  owner: string;
  repo: string;
};

function readEnvString(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveGitHubCredentialHost(): string {
  const raw =
    readEnvString("GITHUB_SERVER_URL") ??
    readEnvString("GITHUB_WEB_URL") ??
    DEFAULT_GITHUB_WEB_BASE_URL;
  try {
    return new URL(raw).hostname;
  } catch {
    return "github.com";
  }
}

function resolveGitHubTokenFromGitCredentialStore(): string | null {
  const host = resolveGitHubCredentialHost();
  const input = `protocol=https\nhost=${host}\n\n`;

  try {
    const result = childProcess.spawnSync("git", ["credential", "fill"], {
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
    });

    if (result.error || result.status !== 0) return null;

    for (const line of result.stdout.split(/\r?\n/)) {
      if (!line.startsWith("password=")) continue;
      const token = line.slice("password=".length).trim();
      if (token) return token;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveGitHubToken(): string {
  const token =
    readEnvString("GITHUB_TOKEN") ??
    readEnvString("GH_TOKEN") ??
    resolveGitHubTokenFromGitCredentialStore();
  if (token) return token;
  throw badRequest(
    "Missing GitHub token. Set GITHUB_TOKEN or GH_TOKEN, or configure git credentials for GitHub.",
  );
}

function parseRepositorySlug(raw: string | null): GitHubRepoRef | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [owner, repo] = parts;
  if (!owner || !repo) return null;
  return { owner, repo };
}

function parseRepositorySlugFromGitRemote(raw: string | null): GitHubRepoRef | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const httpsMatch = trimmed.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) return { owner: httpsMatch[1]!, repo: httpsMatch[2]! };

  const sshMatch = trimmed.match(/^[^@]+@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) return { owner: sshMatch[1]!, repo: sshMatch[2]! };

  const sshUrlMatch = trimmed.match(/^ssh:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshUrlMatch) return { owner: sshUrlMatch[1]!, repo: sshUrlMatch[2]! };

  return null;
}

function resolveGitHubRepoFromGitRemote(): GitHubRepoRef | null {
  try {
    const result = childProcess.spawnSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
    });

    if (result.error || result.status !== 0) return null;
    return parseRepositorySlugFromGitRemote(result.stdout);
  } catch {
    return null;
  }
}

function resolveGitHubRepo(input: {
  owner?: string | null;
  repo?: string | null;
}): GitHubRepoRef {
  const envRepository = parseRepositorySlug(readEnvString("GITHUB_REPOSITORY"));
  const needsGitRemoteFallback =
    !input.owner?.trim() &&
    !input.repo?.trim() &&
    !readEnvString("GITHUB_REPO_OWNER") &&
    !readEnvString("GITHUB_OWNER") &&
    !readEnvString("GITHUB_REPO_NAME") &&
    !readEnvString("GITHUB_REPO") &&
    !envRepository;
  const gitRemoteRepository = needsGitRemoteFallback ? resolveGitHubRepoFromGitRemote() : null;
  const owner =
    input.owner?.trim() ||
    readEnvString("GITHUB_REPO_OWNER") ||
    readEnvString("GITHUB_OWNER") ||
    envRepository?.owner ||
    gitRemoteRepository?.owner;
  const repo =
    input.repo?.trim() ||
    readEnvString("GITHUB_REPO_NAME") ||
    readEnvString("GITHUB_REPO") ||
    envRepository?.repo ||
    gitRemoteRepository?.repo;

  if (!owner || !repo) {
    throw badRequest(
      "Missing GitHub repo coordinates. Provide owner/repo or set GITHUB_REPOSITORY.",
    );
  }
  return { owner, repo };
}

function normalizeCreateInput(input: CreateGitHubPRInput) {
  const branch = input.branch.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  const base =
    input.base?.trim() ||
    readEnvString("GITHUB_BASE_BRANCH") ||
    DEFAULT_GITHUB_BASE_BRANCH;

  if (!branch) throw badRequest("branch is required");
  if (!branch.toLowerCase().startsWith(REQUIRED_BRANCH_PREFIX)) {
    throw badRequest(`branch must start with ${REQUIRED_BRANCH_PREFIX}`);
  }
  if (!title) throw badRequest("title is required");
  if (!body) throw badRequest("body is required");

  return { branch, title, body, base, draft: input.draft === true };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseGitHubErrorMessage(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  const message = record.message;
  if (typeof message === "string" && message.trim().length > 0) return message.trim();
  return null;
}

function parsePullRequestResponse(
  payload: unknown,
  fallback: { owner: string; repo: string; branch: string; base: string },
): CreateGitHubPROutput | null {
  const record = asRecord(payload);
  if (!record) return null;

  const htmlUrl = record.html_url;
  const number = record.number;
  if (typeof htmlUrl !== "string" || !Number.isFinite(number)) return null;

  return {
    prUrl: htmlUrl,
    prNumber: Number(number),
    owner: fallback.owner,
    repo: fallback.repo,
    branch: fallback.branch,
    base: fallback.base,
  };
}

async function findExistingOpenPr(input: {
  owner: string;
  repo: string;
  branch: string;
  base: string;
  token: string;
}): Promise<CreateGitHubPROutput | null> {
  const params = new URLSearchParams({
    state: "open",
    head: `${input.owner}:${input.branch}`,
    base: input.base,
  });

  const response = await fetch(
    `${DEFAULT_GITHUB_API_BASE_URL}/repos/${input.owner}/${input.repo}/pulls?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: DEFAULT_GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": DEFAULT_GITHUB_API_VERSION,
        "User-Agent": "paperclip-github-pr-service",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload) || payload.length === 0) return null;
  return parsePullRequestResponse(payload[0], input);
}

export async function createGitHubPR(
  input: CreateGitHubPRInput,
): Promise<CreateGitHubPROutput> {
  const token = resolveGitHubToken();
  const repoRef = resolveGitHubRepo(input);
  const normalized = normalizeCreateInput(input);

  const response = await fetch(
    `${DEFAULT_GITHUB_API_BASE_URL}/repos/${repoRef.owner}/${repoRef.repo}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: DEFAULT_GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": DEFAULT_GITHUB_API_VERSION,
        "Content-Type": "application/json",
        "User-Agent": "paperclip-github-pr-service",
      },
      body: JSON.stringify({
        title: normalized.title,
        body: normalized.body,
        head: normalized.branch,
        base: normalized.base,
        draft: normalized.draft,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = parsePullRequestResponse(payload, {
    owner: repoRef.owner,
    repo: repoRef.repo,
    branch: normalized.branch,
    base: normalized.base,
  });

  if (response.ok && parsed) return parsed;

  if (response.status === 422) {
    const existing = await findExistingOpenPr({
      owner: repoRef.owner,
      repo: repoRef.repo,
      branch: normalized.branch,
      base: normalized.base,
      token,
    });
    if (existing) {
      logger.warn(
        {
          event: "github_pr_existing_open",
          owner: existing.owner,
          repo: existing.repo,
          branch: existing.branch,
          prUrl: existing.prUrl,
        },
        "GitHub PR already existed for branch; using existing open PR",
      );
      return existing;
    }
  }

  const message = parseGitHubErrorMessage(payload) ?? response.statusText;
  throw unprocessable(`GitHub PR creation failed (${response.status}): ${message}`);
}

function parsePullRequestDetails(payload: unknown): GitHubPullRequestDetails | null {
  const record = asRecord(payload);
  if (!record) return null;

  const number = record.number;
  if (typeof number !== "number" || !Number.isFinite(number)) return null;

  const htmlUrl = typeof record.html_url === "string" ? record.html_url : null;
  const state = typeof record.state === "string" ? record.state : null;
  const merged = record.merged === true;
  const head = asRecord(record.head);
  const base = asRecord(record.base);
  const branch = typeof head?.ref === "string" ? head.ref : null;
  const baseBranch = typeof base?.ref === "string" ? base.ref : null;

  return {
    prNumber: Number(number),
    prUrl: htmlUrl,
    branch,
    base: baseBranch,
    state,
    merged,
  };
}

export async function getGitHubPullRequest(input: {
  owner?: string | null;
  repo?: string | null;
  prNumber: number;
}): Promise<GitHubPullRequestDetails> {
  if (!Number.isInteger(input.prNumber) || input.prNumber <= 0) {
    throw badRequest("prNumber must be a positive integer");
  }

  const token = resolveGitHubToken();
  const repoRef = resolveGitHubRepo(input);

  const response = await fetch(
    `${DEFAULT_GITHUB_API_BASE_URL}/repos/${repoRef.owner}/${repoRef.repo}/pulls/${input.prNumber}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: DEFAULT_GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": DEFAULT_GITHUB_API_VERSION,
        "User-Agent": "paperclip-github-pr-service",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = parsePullRequestDetails(payload);
  if (response.ok && parsed) return parsed;

  const message = parseGitHubErrorMessage(payload) ?? response.statusText;
  throw unprocessable(`GitHub pull request lookup failed (${response.status}): ${message}`);
}

export async function mergeGitHubPullRequest(input: {
  owner?: string | null;
  repo?: string | null;
  prNumber: number;
  commitTitle: string;
  mergeMethod?: "merge" | "squash" | "rebase";
}): Promise<MergeGitHubPullRequestResult> {
  if (!Number.isInteger(input.prNumber) || input.prNumber <= 0) {
    throw badRequest("prNumber must be a positive integer");
  }

  const token = resolveGitHubToken();
  const repoRef = resolveGitHubRepo(input);
  const commitTitle = input.commitTitle.trim();
  if (!commitTitle) throw badRequest("commitTitle is required");
  const mergeMethod = input.mergeMethod ?? "squash";

  const response = await fetch(
    `${DEFAULT_GITHUB_API_BASE_URL}/repos/${repoRef.owner}/${repoRef.repo}/pulls/${input.prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: DEFAULT_GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": DEFAULT_GITHUB_API_VERSION,
        "Content-Type": "application/json",
        "User-Agent": "paperclip-github-pr-service",
      },
      body: JSON.stringify({
        merge_method: mergeMethod,
        commit_title: commitTitle,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  const record = asRecord(payload);
  if (response.ok) {
    const sha = typeof record?.sha === "string" ? record.sha : null;
    const message = typeof record?.message === "string" ? record.message : null;
    return { outcome: "merged", sha, message };
  }

  const message = parseGitHubErrorMessage(payload) ?? response.statusText;
  if (response.status === 405 || response.status === 409) {
    return {
      outcome: "merge_conflict",
      statusCode: response.status,
      message,
    };
  }
  throw unprocessable(`GitHub PR merge failed (${response.status}): ${message}`);
}

export async function deleteGitHubBranch(input: {
  owner?: string | null;
  repo?: string | null;
  branch: string;
}): Promise<{ deleted: boolean }> {
  const branch = input.branch.trim();
  if (!branch) throw badRequest("branch is required");

  const token = resolveGitHubToken();
  const repoRef = resolveGitHubRepo(input);
  const encodedBranch = branch
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const response = await fetch(
    `${DEFAULT_GITHUB_API_BASE_URL}/repos/${repoRef.owner}/${repoRef.repo}/git/refs/heads/${encodedBranch}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: DEFAULT_GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": DEFAULT_GITHUB_API_VERSION,
        "User-Agent": "paperclip-github-pr-service",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (response.status === 204) return { deleted: true };
  if (response.status === 404) return { deleted: false };

  const payload = (await response.json().catch(() => null)) as unknown;
  const message = parseGitHubErrorMessage(payload) ?? response.statusText;
  throw unprocessable(`GitHub branch delete failed (${response.status}): ${message}`);
}

export async function createGitHubIssueComment(input: {
  owner?: string | null;
  repo?: string | null;
  issueNumber: number;
  body: string;
}): Promise<{ id: number; url: string | null }> {
  if (!Number.isInteger(input.issueNumber) || input.issueNumber <= 0) {
    throw badRequest("issueNumber must be a positive integer");
  }
  const body = input.body.trim();
  if (!body) throw badRequest("body is required");

  const token = resolveGitHubToken();
  const repoRef = resolveGitHubRepo(input);

  const response = await fetch(
    `${DEFAULT_GITHUB_API_BASE_URL}/repos/${repoRef.owner}/${repoRef.repo}/issues/${input.issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: DEFAULT_GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": DEFAULT_GITHUB_API_VERSION,
        "Content-Type": "application/json",
        "User-Agent": "paperclip-github-pr-service",
      },
      body: JSON.stringify({ body }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  const record = asRecord(payload);
  if (response.ok) {
    const id = typeof record?.id === "number" ? Number(record.id) : 0;
    const url = typeof record?.html_url === "string" ? record.html_url : null;
    return { id, url };
  }

  const message = parseGitHubErrorMessage(payload) ?? response.statusText;
  throw unprocessable(`GitHub issue comment failed (${response.status}): ${message}`);
}

export function githubPrService() {
  return {
    createGitHubPR,
    getGitHubPullRequest,
    mergeGitHubPullRequest,
    deleteGitHubBranch,
    createGitHubIssueComment,
  };
}
