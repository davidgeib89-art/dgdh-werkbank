import { Command } from "commander";
import path from "node:path";
import { createIssueSchema, type Issue, type Agent, type IssueExecutionPacketArtifactKind } from "@paperclipai/shared";
import {
  addCommonClientOptions,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface TriadStartOptions extends BaseClientOptions {
  title: string;
  objective?: string;
  doneWhen?: string;
  targetFolder?: string;
  targetFile?: string;
  status?: string;
  projectId?: string;
  assignToCeo?: boolean;
}

interface TriadRescueOptions extends BaseClientOptions {
  issueId: string;
  apiUrl?: string;
  prUrl?: string;
  branch?: string;
  commit?: string;
  summary?: string;
  reviewerVerdict?: string;
}

const DEFAULT_API_URL = "http://127.0.0.1:3100";

interface TriadStatusOptions extends BaseClientOptions {
  apiUrl?: string;
  companyId?: string;
}

// Types for company-run-chain response (forward declaration)
interface CompanyRunChainChild {
  issueId: string;
  identifier: string | null;
  title: string | null;
  status: string;
  assigneeAgentId: string | null;
  assigneeAgentName: string | null;
  triad: {
    state: string;
    reviewerWakeStatus: "running" | "completed" | "queued" | "stalled" | null;
    closeoutBlocker: {
      blockerClass?: string;
      blockerState?: string;
      summary?: string;
      message?: string;
      knownBlocker?: boolean;
    } | null;
  };
}

interface CompanyRunChainResponse {
  parentIssueId: string;
  parentIdentifier: string | null;
  parentTitle: string | null;
  parentStatus: string;
  focusIssueId: string | null;
  parentBlocker: unknown;
  children: CompanyRunChainChild[];
}

export function registerTriadCommands(program: Command): void {
  const triad = program.command("triad").description("Triad mission loop operations");

  // Status subcommand
  triad
    .command("status")
    .description("Check triad status and diagnose stalls")
    .argument("<issue-id>", "Parent or child issue ID to check")
    .option("--api-url <url>", "API base URL")
    .option("-C, --company-id <id>", "Company ID")
    .action(async (issueId: string, opts: TriadStatusOptions) => {
      try {
        // Resolve API URL: flag > PAPERCLIP_API_URL env > default
        const apiUrl = opts.apiUrl?.trim() ||
          process.env.PAPERCLIP_API_URL?.trim() ||
          DEFAULT_API_URL;

        const ctx = resolveCommandContext({
          ...opts,
          apiBase: apiUrl,
        }, { requireCompany: false });

        if (!issueId) {
          throw new Error("<issue-id> is required.");
        }

        // Call the company-run-chain endpoint
        const response = await ctx.api.get<CompanyRunChainResponse>(
          `/api/issues/${issueId}/company-run-chain`,
        );

        if (!response) {
          throw new Error(`No data returned for issue ${issueId}`);
        }

        // Print status summary
        printStatusOutput(response);
        process.exit(0);
      } catch (err) {
        handleCommandError(err);
      }
    });

  addCommonClientOptions(
    triad
      .command("start")
      .description("Create a properly-formatted triad parent issue")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--title <title>", "Issue title")
      .requiredOption("--objective <text>", "Mission objective")
      .requiredOption("--done-when <text>", "Completion criteria")
      .option("--target-folder <path>", "Target folder path")
      .option("--target-file <path>", "Target file path")
      .option("--status <status>", "Issue status (default: todo)", "todo")
      .option("--project-id <id>", "Project ID")
      .option("--assign-to-ceo", "Auto-assign to first idle CEO agent", false)
      .action(async (opts: TriadStartOptions) => {
        try {
          validateTriadTargetScope(opts);

          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const companyId = ctx.companyId;
          if (!companyId) {
            throw new Error(
              "Company ID is required. Pass --company-id or set PAPERCLIP_COMPANY_ID.",
            );
          }

          // Build the triad description format
          const description = buildTriadDescription({
            objective: opts.objective || "",
            doneWhen: opts.doneWhen || "",
            targetFolder: opts.targetFolder,
            targetFile: opts.targetFile,
          });

          const payload = createIssueSchema.parse({
            title: opts.title,
            description,
            status: opts.status || "todo",
            projectId: opts.projectId,
          });

          const created = await ctx.api.post<Issue>(`/api/companies/${companyId}/issues`, payload);

          if (!created) {
            throw new Error("Failed to create issue: API returned null");
          }

          let finalIssue = created;

          // If --assign-to-ceo flag is set, find and assign to first idle CEO agent
          if (opts.assignToCeo) {
            const ceoAgentId = await findIdleCeoAgentId(ctx.api, companyId);
            if (ceoAgentId) {
              finalIssue = await ctx.api.patch<Issue>(`/api/issues/${created.id}`, {
                assigneeAgentId: ceoAgentId,
              }) ?? finalIssue;
            }
          }

          printOutput(finalIssue, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // Rescue subcommand
  triad
    .command("rescue")
    .description("Rescue a stalled triad child (operator rescue path)")
    .requiredOption("--issue-id <id>", "Issue ID to rescue")
    .option("--pr-url <url>", "Pull request URL (required for worker rescue)")
    .option("--branch <branch>", "Branch name (required for worker rescue)")
    .option("--commit <hash>", "Commit hash (required for worker rescue)")
    .option("--summary <text>", "Summary for the rescue", "Operator rescue closeout")
    .option("--reviewer-verdict <verdict>", "Reviewer verdict (accepted | changes_requested)")
    .option("--api-url <url>", "API base URL")
    .option("-C, --company-id <id>", "Company ID")
    .action(async (opts: TriadRescueOptions) => {
      try {
        // Resolve API URL: flag > PAPERCLIP_API_URL env > default
        const apiUrl = opts.apiUrl?.trim() ||
          process.env.PAPERCLIP_API_URL?.trim() ||
          DEFAULT_API_URL;

        const ctx = resolveCommandContext({
          ...opts,
          apiBase: apiUrl,
        }, { requireCompany: false });

        const issueId = opts.issueId;
        if (!issueId) {
          throw new Error("--issue-id is required.");
        }

        // Reviewer verdict path
        if (opts.reviewerVerdict) {
          if (!["accepted", "changes_requested"].includes(opts.reviewerVerdict)) {
            throw new Error("--reviewer-verdict must be one of: accepted, changes_requested");
          }

          const payload = {
            verdict: opts.reviewerVerdict,
            requiredFixes: [],
            evidence: "Operator rescue",
            doneWhenCheck: opts.summary || "Operator rescue closeout",
          };

          const result = await ctx.api.post(
            `/api/issues/${issueId}/reviewer-verdict`,
            payload,
          );

          if (!result) {
            throw new Error("API returned null response");
          }

          console.log(`✓ Reviewer verdict '${opts.reviewerVerdict}' recorded for issue ${issueId}`);
          process.exit(0);
        }

        // Worker rescue path
        if (!opts.prUrl || !opts.branch || !opts.commit) {
          throw new Error(
            "Worker rescue requires --pr-url, --branch, and --commit. " +
            "Or provide --reviewer-verdict for reviewer rescue."
          );
        }

        const payload = {
          prUrl: opts.prUrl,
          branch: opts.branch,
          commitHash: opts.commit,
          summary: opts.summary || "Operator rescue closeout",
        };

        const result = await ctx.api.post(`/api/issues/${issueId}/worker-rescue`, payload);

        if (!result) {
          throw new Error("API returned null response");
        }

        console.log(`✓ Worker rescue successful for issue ${issueId}`);
        process.exit(0);
      } catch (err) {
        handleCommandError(err);
      }
    });
}

interface TriadDescriptionParams {
  objective: string;
  doneWhen: string;
  targetFolder?: string;
  targetFile?: string;
}

function isBroadTargetFolder(targetFolder: string | undefined): boolean {
  if (!targetFolder) return true;
  const normalized = targetFolder.trim().toLowerCase();
  return normalized === "." || normalized === "/" || normalized === "root" || normalized === "repo";
}

function looksLikeFlagValue(value: string | undefined): boolean {
  if (!value) return false;
  return value.trim().startsWith("-");
}

function validateTriadTargetScope(opts: TriadStartOptions): void {
  if (!opts.targetFolder && !opts.targetFile) {
    throw new Error("Either --target-folder or --target-file must be provided.");
  }

  if (looksLikeFlagValue(opts.targetFolder)) {
    throw new Error(
      `Invalid --target-folder value "${opts.targetFolder}". ` +
      "It looks like another flag. Pass a real bounded folder path such as packages/shared or use --target-file.",
    );
  }

  if (looksLikeFlagValue(opts.targetFile)) {
    throw new Error(
      `Invalid --target-file value "${opts.targetFile}". ` +
      "It looks like another flag. Pass a real file path or use --target-folder.",
    );
  }

  if (!opts.targetFile && isBroadTargetFolder(opts.targetFolder)) {
    throw new Error(
      `Broad --target-folder "${opts.targetFolder ?? ""}" is not allowed for triad start. ` +
      "Pass a real bounded folder path or an explicit --target-file.",
    );
  }
}

// Extension sets for artifactKind inference (mirrors server-side logic)
const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]);
const CONFIG_EXTENSIONS = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".env",
  ".conf",
]);
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".css",
  ".scss",
  ".html",
  ".sql",
]);

/**
 * Infer artifactKind from targetFile extension or targetFolder-only signal.
 * Mirrors server-side logic in server/src/services/issue-execution-packet.ts
 */
function inferArtifactKindFromTarget(
  targetFile: string | undefined,
  targetFolder: string | undefined,
): IssueExecutionPacketArtifactKind {
  // Folder-only (no targetFile) -> multi_file_change
  if (!targetFile) {
    return "multi_file_change";
  }

  const lowerPath = targetFile.toLowerCase();
  const ext = path.posix.extname(lowerPath);

  // Test files: *.test.*, *.spec.*, or paths containing __tests__/
  if (
    /(?:^|\/).+\.(?:test|spec)\.[a-z0-9]+$/.test(lowerPath) ||
    /(?:^|\/)(?:__tests__|tests?)\//.test(lowerPath)
  ) {
    return "test_update";
  }

  // Documentation files
  if (DOC_EXTENSIONS.has(ext) || /(readme|runbook|plan|spec)\./.test(lowerPath)) {
    return "doc_update";
  }

  // Config files
  if (CONFIG_EXTENSIONS.has(ext) || /(config|settings|policy)\./.test(lowerPath)) {
    return "config_change";
  }

  // Code files
  if (CODE_EXTENSIONS.has(ext)) {
    return "code_patch";
  }

  // Default fallback for unknown extensions
  return "code_patch";
}

function buildTriadDescription(params: TriadDescriptionParams): string {
  const artifactKind = inferArtifactKindFromTarget(params.targetFile, params.targetFolder);

  const lines: string[] = [
    "missionCell: triad-mission-loop-v1",
    "",
    `Objective: ${params.objective}`,
    `Scope: ${params.targetFolder || params.targetFile || ""}`,
  ];

  if (params.targetFolder) {
    lines.push(`targetFolder: ${params.targetFolder}`);
  }

  if (params.targetFile) {
    lines.push(`targetFile: ${params.targetFile}`);
  }

  lines.push(`artifactKind: ${artifactKind}`);
  lines.push(`doneWhen: ${params.doneWhen}`);
  lines.push("");
  lines.push("reviewerFocus: Verify all doneWhen criteria are met with concrete file or test evidence.");
  lines.push("reviewerAcceptWhen: All doneWhen items satisfied with substance, not superficial paraphrase.");
  lines.push("reviewerChangeWhen: Any doneWhen criterion missing, scope drift, out-of-scope file changes, or superficial/weak implementation.");
  lines.push("");
  lines.push("[NEEDS INPUT]: none");

  return lines.join("\n");
}

async function findIdleCeoAgentId(
  api: { get: (path: string) => Promise<Agent[] | null> },
  companyId: string,
): Promise<string | null> {
  try {
    const agents = await api.get(`/api/companies/${companyId}/agents`);

    if (!agents) {
      return null;
    }

    const idleCeoAgent = agents.find(
      (agent) =>
        agent.adapterConfig?.roleTemplateId === "ceo" && agent.status === "idle",
    );

    return idleCeoAgent?.id || null;
  } catch {
    return null;
  }
}

function printStatusOutput(response: CompanyRunChainResponse): void {
  const { children } = response;

  if (children.length === 0) {
    console.log("No child issues found in this chain.");
    return;
  }

  // Check each child for stalls
  let hasAnyStall = false;
  const stalledChildren: Array<{
    child: CompanyRunChainChild;
    stallType: "reviewer_wake" | "closeout" | "both";
  }> = [];

  for (const child of children) {
    const triad = child.triad;
    const hasReviewerWakeStall = triad.reviewerWakeStatus === "stalled";
    const hasCloseoutBlocker = triad.closeoutBlocker !== null;

    if (hasReviewerWakeStall && hasCloseoutBlocker) {
      hasAnyStall = true;
      stalledChildren.push({ child, stallType: "both" });
    } else if (hasReviewerWakeStall) {
      hasAnyStall = true;
      stalledChildren.push({ child, stallType: "reviewer_wake" });
    } else if (hasCloseoutBlocker) {
      hasAnyStall = true;
      stalledChildren.push({ child, stallType: "closeout" });
    }
  }

  // Print status for all children
  for (const child of children) {
    const triad = child.triad;
    console.log(`\nIssue: ${child.identifier || child.issueId} (${child.status})`);
    console.log(`  State: ${triad.state}`);
    if (child.assigneeAgentName) {
      console.log(`  Assignee: ${child.assigneeAgentName}`);
    }
    if (triad.reviewerWakeStatus) {
      console.log(`  Reviewer Wake: ${triad.reviewerWakeStatus}`);
    }
    if (triad.closeoutBlocker) {
      const blocker = triad.closeoutBlocker;
      console.log(`  Closeout Blocker: ${blocker.summary || blocker.blockerClass || "Unknown blocker"}`);
    }
  }

  // Print rescue guidance for stalled children
  if (hasAnyStall) {
    console.log("\n--- STALL DETECTED ---");
    for (const { child, stallType } of stalledChildren) {
      console.log(`\nIssue ${child.identifier || child.issueId}:`);

      if (stallType === "reviewer_wake" || stallType === "both") {
        console.log("  Reviewer wake is STALLED");
        console.log(`  Rescue: paperclipai triad rescue --issue-id ${child.issueId} --reviewer-verdict accepted`);
      }

      if (stallType === "closeout" || stallType === "both") {
        const blocker = child.triad.closeoutBlocker;
        console.log(`  Closeout Blocker: ${blocker?.summary || blocker?.blockerClass || "Unknown blocker"}`);
        console.log(`  Run rescue to address the blocker: paperclipai triad rescue --issue-id ${child.issueId} --reviewer-verdict accepted`);
      }
    }
  } else {
    console.log("\n✓ No stalls detected. Chain is healthy.");
  }
}
