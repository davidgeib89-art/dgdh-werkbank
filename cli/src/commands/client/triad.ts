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
