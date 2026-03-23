import { badRequest, unprocessable } from "../errors.js";
import { logger } from "../middleware/logger.js";

const DEFAULT_GITHUB_API_BASE_URL = "https://api.github.com";
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

function resolveGitHubToken(): string {
  const token = readEnvString("GITHUB_TOKEN") ?? readEnvString("GH_TOKEN");
  if (token) return token;
  throw badRequest("Missing GitHub token. Set GITHUB_TOKEN or GH_TOKEN.");
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

function resolveGitHubRepo(input: {
  owner?: string | null;
  repo?: string | null;
}): GitHubRepoRef {
  const envRepository = parseRepositorySlug(readEnvString("GITHUB_REPOSITORY"));
  const owner =
    input.owner?.trim() ||
    readEnvString("GITHUB_REPO_OWNER") ||
    readEnvString("GITHUB_OWNER") ||
    envRepository?.owner;
  const repo =
    input.repo?.trim() ||
    readEnvString("GITHUB_REPO_NAME") ||
    readEnvString("GITHUB_REPO") ||
    envRepository?.repo;

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

export function githubPrService() {
  return {
    createGitHubPR,
  };
}
