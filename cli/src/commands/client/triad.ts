import { Command } from "commander";
import { createIssueSchema, type Issue, type Agent } from "@paperclipai/shared";
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
  prUrl?: string;
  branch?: string;
  commit?: string;
  summary?: string;
  reviewerVerdict?: string;
}

const DEFAULT_API_URL = "http://127.0.0.1:3100";

export function registerTriadCommands(program: Command): void {
  const triad = program.command("triad").description("Triad mission loop operations");

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
          // Validate that at least one of target-folder or target-file is provided
          if (!opts.targetFolder && !opts.targetFile) {
            throw new Error("Either --target-folder or --target-file must be provided.");
          }

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
        const apiUrl = opts.apiBase?.trim() ||
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

function buildTriadDescription(params: TriadDescriptionParams): string {
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

  lines.push("artifactKind: code_patch");
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
