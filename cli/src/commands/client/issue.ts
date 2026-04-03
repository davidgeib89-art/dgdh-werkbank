import { Command } from "commander";
import {
  addIssueCommentSchema,
  checkoutIssueSchema,
  createIssueSchema,
  updateIssueSchema,
  type Issue,
  type IssueComment,
  type IssueExecutionPacketTruth,
  type CompanyRunChain,
  type CompanyRunChainChild,
  type CompanyRunChainParentBlocker,
  type CompanyRunChainReviewerWakeStatus,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";
import pc from "picocolors";

interface IssueBaseOptions extends BaseClientOptions {
  status?: string;
  assigneeAgentId?: string;
  projectId?: string;
  parentId?: string;
  match?: string;
}

interface IssueCreateOptions extends BaseClientOptions {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
}

interface IssueUpdateOptions extends BaseClientOptions {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
  comment?: string;
  hiddenAt?: string;
}

interface IssueCommentOptions extends BaseClientOptions {
  body: string;
  reopen?: boolean;
}

interface IssueCheckoutOptions extends BaseClientOptions {
  agentId: string;
  expectedStatuses?: string;
}

interface IssueAssignOptions extends BaseClientOptions {
  agentId: string;
}

interface IssueArchiveStaleOptions extends BaseClientOptions {
  companyId: string;
  olderThan: string;
  dryRun?: boolean;
}

interface IssueNextOptions extends BaseClientOptions {
  projectId?: string;
  limit?: string;
}

interface NextTaskItem {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
  assigneeAgentId: string | null;
}

interface NextTasksOutput {
  ready: NextTaskItem[];
  active: NextTaskItem[];
  blocked: NextTaskItem[];
}

export function registerIssueCommands(program: Command): void {
  const issue = program.command("issue").description("Issue operations");

  addCommonClientOptions(
    issue
      .command("list")
      .description("List issues for a company")
      .option("-C, --company-id <id>", "Company ID")
      .option("--status <csv>", "Comma-separated statuses")
      .option("--assignee-agent-id <id>", "Filter by assignee agent ID")
      .option("--project-id <id>", "Filter by project ID")
      .option("--parent-id <id>", "Filter by parent issue ID")
      .option("--match <text>", "Local text match on identifier/title/description")
      .action(async (opts: IssueBaseOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const params = new URLSearchParams();
          if (opts.status) params.set("status", opts.status);
          if (opts.assigneeAgentId) params.set("assigneeAgentId", opts.assigneeAgentId);
          if (opts.projectId) params.set("projectId", opts.projectId);
          if (opts.parentId) params.set("parentId", opts.parentId);

          const query = params.toString();
          const path = `/api/companies/${ctx.companyId}/issues${query ? `?${query}` : ""}`;
          const rows = (await ctx.api.get<Issue[]>(path)) ?? [];

          const filtered = filterIssueRows(rows, opts.match);
          if (ctx.json) {
            printOutput(filtered, { json: true });
            return;
          }

          if (filtered.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const item of filtered) {
            console.log(
              formatInlineRecord({
                identifier: item.identifier,
                id: item.id,
                status: item.status,
                priority: item.priority,
                assigneeAgentId: item.assigneeAgentId,
                title: item.title,
                projectId: item.projectId,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("get")
      .description("Get an issue by UUID or identifier (e.g. PC-12)")
      .argument("<idOrIdentifier>", "Issue ID or identifier")
      .action(async (idOrIdentifier: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Issue>(`/api/issues/${idOrIdentifier}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("create")
      .description("Create an issue")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .action(async (opts: IssueCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
          });

          const created = await ctx.api.post<Issue>(`/api/companies/${ctx.companyId}/issues`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("update")
      .description("Update an issue")
      .argument("<issueId>", "Issue ID")
      .option("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .option("--comment <text>", "Optional comment to add with update")
      .option("--hidden-at <iso8601|null>", "Set hiddenAt timestamp or literal 'null'")
      .action(async (issueId: string, opts: IssueUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
            comment: opts.comment,
            hiddenAt: parseHiddenAt(opts.hiddenAt),
          });

          const updated = await ctx.api.patch<Issue & { comment?: IssueComment | null }>(`/api/issues/${issueId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("assign")
      .description("Assign an issue to an agent")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--agent-id <id>", "Agent ID to assign")
      .action(async (issueId: string, opts: IssueAssignOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            assigneeAgentId: opts.agentId,
          });
          const updated = await ctx.api.patch<Issue>(`/api/issues/${issueId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("unassign")
      .description("Unassign an issue")
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            assigneeAgentId: null,
          });
          const updated = await ctx.api.patch<Issue>(`/api/issues/${issueId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("comment")
      .description("Add comment to issue")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--body <text>", "Comment body")
      .option("--reopen", "Reopen if issue is done/cancelled")
      .action(async (issueId: string, opts: IssueCommentOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = addIssueCommentSchema.parse({
            body: opts.body,
            reopen: opts.reopen,
          });
          const comment = await ctx.api.post<IssueComment>(`/api/issues/${issueId}/comments`, payload);
          printOutput(comment, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("checkout")
      .description("Checkout issue for an agent")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--agent-id <id>", "Agent ID")
      .option(
        "--expected-statuses <csv>",
        "Expected current statuses",
        "todo,backlog,blocked",
      )
      .action(async (issueId: string, opts: IssueCheckoutOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = checkoutIssueSchema.parse({
            agentId: opts.agentId,
            expectedStatuses: parseCsv(opts.expectedStatuses),
          });
          const updated = await ctx.api.post<Issue>(`/api/issues/${issueId}/checkout`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("release")
      .description("Release issue back to todo and clear assignee")
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const updated = await ctx.api.post<Issue>(`/api/issues/${issueId}/release`, {});
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("liveness")
      .description("Show liveness diagnosis for an issue (packet truth, chain truth, active run)")
      .argument("<issueId>", "Issue ID or identifier (e.g., PC-12)")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);

          // Fetch all three truth surfaces in parallel
          const [issueData, chainData, activeRunData] = await Promise.all([
            ctx.api.get<Issue>(`/api/issues/${issueId}`),
            ctx.api.get<CompanyRunChain>(`/api/issues/${issueId}/company-run-chain`),
            ctx.api.get<ActiveRunResponse | null>(`/api/issues/${issueId}/active-run`),
          ]);

          if (!issueData) {
            throw new Error(`Issue not found: ${issueId}`);
          }

          const output = buildLivenessOutput(issueData, chainData, activeRunData);

          if (ctx.json) {
            printOutput(output, { json: true });
            return;
          }

          printLivenessHumanReadable(output, issueId);
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("next")
      .description("Show issues grouped by Paperclip ready/active/blocked runtime status")
      .option("-C, --company-id <id>", "Company ID")
      .option("--project-id <id>", "Filter by project ID")
      .option("--limit <n>", "Max issues per category", "10")
      .action(async (opts: IssueNextOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const limit = parseInt(opts.limit || "10", 10);

          // Fetch issues by status categories
          const [readyIssues, activeIssues, blockedIssues] = await Promise.all([
            // Ready: todo status
            fetchIssuesByStatus(ctx.api, ctx.companyId!, "todo", opts.projectId, limit),
            // Active: in_progress and in_review
            Promise.all([
              fetchIssuesByStatus(ctx.api, ctx.companyId!, "in_progress", opts.projectId, limit),
              fetchIssuesByStatus(ctx.api, ctx.companyId!, "in_review", opts.projectId, limit),
            ]).then(([inProgress, inReview]) => [...inProgress, ...inReview]),
            // Blocked: blocked status
            fetchIssuesByStatus(ctx.api, ctx.companyId!, "blocked", opts.projectId, limit),
          ]);

          const output: NextTasksOutput = {
            ready: readyIssues,
            active: activeIssues,
            blocked: blockedIssues,
          };

          if (ctx.json) {
            printOutput(output, { json: true });
            return;
          }

          printNextTasksHumanReadable(output);
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}

// Types for active-run response
interface ActiveRunResponse {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  agentId: string | null;
  agentName: string | null;
}

// Output structure for liveness command
interface LivenessOutput {
  issueId: string;
  issueIdentifier: string | null;
  issueTitle: string;
  issueStatus: string;
  packetTruth: {
    status: string;
    ready: boolean;
    artifactKind: string | null;
    targetFile: string | null;
    targetFolder: string | null;
    reasonCodes: string[];
    triad: {
      ceoCutStatus: string;
      workerPacket: {
        source: string;
        goal: string | null;
        scope: string | null;
        doneWhen: string | null;
      };
      reviewerPacket: {
        source: string;
        focus: string | null;
        acceptWhen: string | null;
        changeWhen: string | null;
      };
    } | null;
  } | null;
  chainTruth: {
    parentIssueId: string;
    parentIdentifier: string | null;
    parentTitle: string;
    parentStatus: string;
    focusIssueId: string | null;
    parentBlocker: CompanyRunChainParentBlocker | null;
    children: ChainChildOutput[];
    classification: "not-started" | "running" | "stalled" | "completed";
  } | null;
  activeRun: {
    status: "running" | "not-active";
    runId: string | null;
    startedAt: string | null;
    agentId: string | null;
    agentName: string | null;
  } | null;
}

interface ChainChildOutput {
  issueId: string;
  identifier: string | null;
  title: string;
  status: string;
  assigneeAgentId: string | null;
  assigneeAgentName: string | null;
  triadState: string;
  reviewerWakeStatus: CompanyRunChainReviewerWakeStatus;
  isStalled: boolean;
  stallType: "reviewer-stalled" | "closeout-blocked" | null;
  closeoutBlocker: CompanyRunChainParentBlocker | null;
  rescueCommand: string | null;
}

function buildLivenessOutput(
  issue: Issue,
  chain: CompanyRunChain | null,
  activeRun: ActiveRunResponse | null,
): LivenessOutput {
  // Build packet truth section
  const packetTruth = issue.executionPacketTruth
    ? {
        status: issue.executionPacketTruth.status,
        ready: issue.executionPacketTruth.ready,
        artifactKind: issue.executionPacketTruth.artifactKind,
        targetFile: issue.executionPacketTruth.targetFile,
        targetFolder: issue.executionPacketTruth.targetFolder,
        reasonCodes: issue.executionPacketTruth.reasonCodes,
        triad: issue.executionPacketTruth.triad
          ? {
              ceoCutStatus: issue.executionPacketTruth.triad.ceoCutStatus,
              workerPacket: {
                source: issue.executionPacketTruth.triad.workerPacket.source,
                goal: issue.executionPacketTruth.triad.workerPacket.goal,
                scope: issue.executionPacketTruth.triad.workerPacket.scope,
                doneWhen: issue.executionPacketTruth.triad.workerPacket.doneWhen,
              },
              reviewerPacket: {
                source: issue.executionPacketTruth.triad.reviewerPacket.source,
                focus: issue.executionPacketTruth.triad.reviewerPacket.focus,
                acceptWhen: issue.executionPacketTruth.triad.reviewerPacket.acceptWhen,
                changeWhen: issue.executionPacketTruth.triad.reviewerPacket.changeWhen,
              },
            }
          : null,
      }
    : null;

  // Build chain truth section
  let chainTruth: LivenessOutput["chainTruth"] = null;
  if (chain) {
    const children: ChainChildOutput[] = chain.children.map((child) => {
      const isStalled =
        child.triad.reviewerWakeStatus === "stalled" || child.triad.closeoutBlocker !== null;
      let stallType: ChainChildOutput["stallType"] = null;
      if (isStalled) {
        if (child.triad.reviewerWakeStatus === "stalled") {
          stallType = "reviewer-stalled";
        } else if (child.triad.closeoutBlocker !== null) {
          stallType = "closeout-blocked";
        }
      }

      return {
        issueId: child.issueId,
        identifier: child.identifier,
        title: child.title,
        status: child.status,
        assigneeAgentId: child.assigneeAgentId,
        assigneeAgentName: child.assigneeAgentName,
        triadState: child.triad.state,
        reviewerWakeStatus: child.triad.reviewerWakeStatus,
        isStalled,
        stallType,
        closeoutBlocker: child.triad.closeoutBlocker,
        rescueCommand: isStalled
          ? `paperclipai triad rescue ${child.issueId}`
          : null,
      };
    });

    // Classify the overall chain state
    let classification: LivenessOutput["chainTruth"]["classification"] = "not-started";
    if (children.length === 0) {
      classification = activeRun ? "running" : "not-started";
    } else {
      const hasStalled = children.some((c) => c.isStalled);
      const hasRunning = children.some((c) => c.triadState === "in_execution");
      const allCompleted = children.every(
        (c) => c.triadState === "ready_to_promote" || c.triadState === "merged",
      );

      if (hasStalled) {
        classification = "stalled";
      } else if (allCompleted) {
        classification = "completed";
      } else if (hasRunning || activeRun) {
        classification = "running";
      }
    }

    chainTruth = {
      parentIssueId: chain.parentIssueId,
      parentIdentifier: chain.parentIdentifier,
      parentTitle: chain.parentTitle,
      parentStatus: chain.parentStatus,
      focusIssueId: chain.focusIssueId,
      parentBlocker: chain.parentBlocker,
      children,
      classification,
    };
  }

  // Build active-run section
  const activeRunOutput: LivenessOutput["activeRun"] = activeRun
    ? {
        status: activeRun.status === "running" ? "running" : "not-active",
        runId: activeRun.id,
        startedAt: activeRun.startedAt,
        agentId: activeRun.agentId,
        agentName: activeRun.agentName,
      }
    : { status: "not-active", runId: null, startedAt: null, agentId: null, agentName: null };

  return {
    issueId: issue.id,
    issueIdentifier: issue.identifier,
    issueTitle: issue.title,
    issueStatus: issue.status,
    packetTruth,
    chainTruth,
    activeRun: activeRunOutput,
  };
}

function printLivenessHumanReadable(output: LivenessOutput, issueIdOrRef: string): void {
  console.log(pc.bold(`Liveness: ${output.issueIdentifier ?? output.issueId} - ${output.issueTitle}`));
  console.log(`Status: ${output.issueStatus}`);
  console.log("");

  // Packet Truth Section
  console.log(pc.bold("═ PACKET TRUTH ════════════════════════════════════════════════════════════════"));
  if (output.packetTruth) {
    console.log(`Status: ${output.packetTruth.ready ? pc.green("ready") : pc.yellow(output.packetTruth.status)}`);
    console.log(`Artifact Kind: ${output.packetTruth.artifactKind ?? "-"}`);
    console.log(`Target File: ${output.packetTruth.targetFile ?? "-"}`);
    console.log(`Target Folder: ${output.packetTruth.targetFolder ?? "-"}`);

    // Always show reasonCodes (never suppress diagnostic state)
    if (output.packetTruth.reasonCodes.length > 0) {
      console.log(`Reason Codes: ${output.packetTruth.reasonCodes.join(", ")}`);
    }

    if (output.packetTruth.triad) {
      console.log("");
      console.log(pc.dim("Triad:"));
      console.log(`  CEO Cut: ${output.packetTruth.triad.ceoCutStatus}`);
      console.log(`  Worker Packet:`);
      console.log(`    Source: ${output.packetTruth.triad.workerPacket.source}`);
      console.log(`    Goal: ${output.packetTruth.triad.workerPacket.goal ?? "-"}`);
      console.log(`    Scope: ${output.packetTruth.triad.workerPacket.scope ?? "-"}`);
      console.log(`    Done When: ${output.packetTruth.triad.workerPacket.doneWhen ?? "-"}`);
      console.log(`  Reviewer Packet:`);
      console.log(`    Source: ${output.packetTruth.triad.reviewerPacket.source}`);
      console.log(`    Focus: ${output.packetTruth.triad.reviewerPacket.focus ?? "-"}`);
      console.log(`    Accept When: ${output.packetTruth.triad.reviewerPacket.acceptWhen ?? "-"}`);
      console.log(`    Change When: ${output.packetTruth.triad.reviewerPacket.changeWhen ?? "-"}`);
    }
  } else {
    console.log(pc.dim("(no packet truth available)"));
  }
  console.log("");

  // Chain Truth Section
  console.log(pc.bold("═ CHAIN TRUTH ═══════════════════════════════════════════════════════════════"));
  if (output.chainTruth) {
    console.log(`Parent: ${output.chainTruth.parentIdentifier ?? output.chainTruth.parentIssueId}`);
    console.log(`Classification: ${formatClassification(output.chainTruth.classification)}`);

    if (output.chainTruth.parentBlocker) {
      console.log(pc.yellow("⚠ Parent Blocker Present"));
      console.log(`  Class: ${output.chainTruth.parentBlocker.blockerClass ?? "-"}`);
      console.log(`  State: ${output.chainTruth.parentBlocker.blockerState ?? "-"}`);
      console.log(`  Summary: ${output.chainTruth.parentBlocker.summary ?? "-"}`);
    }

    if (output.chainTruth.children.length === 0) {
      console.log(pc.dim("(no children - not-started)"));
    } else {
      console.log("");
      console.log(pc.dim(`Children (${output.chainTruth.children.length}):`));
      for (const child of output.chainTruth.children) {
        const stallIndicator = child.isStalled ? pc.red(" [STALLED]") : "";
        console.log(`  ${child.identifier ?? child.issueId}: ${child.title}${stallIndicator}`);
        console.log(`    Status: ${child.status}, Triad: ${child.triadState}`);
        console.log(`    Assignee: ${child.assigneeAgentName ?? child.assigneeAgentId ?? "-"}`);

        // Never suppress reviewerWakeStatus (diagnostic state)
        if (child.reviewerWakeStatus) {
          console.log(`    Reviewer Wake: ${child.reviewerWakeStatus}`);
        }

        if (child.isStalled) {
          console.log(pc.red(`    Stall Type: ${child.stallType}`));
          if (child.closeoutBlocker) {
            console.log(pc.red(`    Closeout Blocker:`));
            console.log(pc.red(`      Class: ${child.closeoutBlocker.blockerClass ?? "-"}`));
            console.log(pc.red(`      State: ${child.closeoutBlocker.blockerState ?? "-"}`));
            console.log(pc.red(`      Summary: ${child.closeoutBlocker.summary ?? "-"}`));
          }
          if (child.rescueCommand) {
            console.log(pc.cyan(`    → Rescue: ${child.rescueCommand}`));
          }
        }
        console.log("");
      }
    }
  } else {
    console.log(pc.dim("(no chain data available)"));
  }
  console.log("");

  // Active Run Section
  console.log(pc.bold("═ ACTIVE RUN ════════════════════════════════════════════════════════════════"));
  if (output.activeRun) {
    if (output.activeRun.status === "running") {
      console.log(`Status: ${pc.green("running")}`);
      console.log(`Run ID: ${output.activeRun.runId ?? "-"}`);
      console.log(`Started: ${output.activeRun.startedAt ?? "-"}`);
      console.log(`Agent: ${output.activeRun.agentName ?? output.activeRun.agentId ?? "-"}`);
    } else {
      console.log(`Status: ${pc.dim("not-active")}`);
    }
  } else {
    console.log(pc.dim("(no active run)"));
  }
}

function formatClassification(
  classification: LivenessOutput["chainTruth"]["classification"],
): string {
  switch (classification) {
    case "not-started":
      return pc.dim("not-started");
    case "running":
      return pc.blue("running");
    case "stalled":
      return pc.red("STALLED");
    case "completed":
      return pc.green("completed");
    default:
      return classification;
  }
}

async function fetchIssuesByStatus(
  api: PaperclipApiClient,
  companyId: string,
  status: string,
  projectId: string | undefined,
  limit: number,
): Promise<NextTaskItem[]> {
  const params = new URLSearchParams();
  params.set("status", status);
  if (projectId) params.set("projectId", projectId);

  const query = params.toString();
  const path = `/api/companies/${companyId}/issues${query ? `?${query}` : ""}`;
  const issues = (await api.get<Issue[]>(path)) ?? [];

  return issues.slice(0, limit).map((issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assigneeAgentId: issue.assigneeAgentId,
  }));
}

function printNextTasksHumanReadable(output: NextTasksOutput): void {
  console.log(pc.bold("═══ NEXT TASKS ════════════════════════════════════════════════════════════════"));
  console.log("");

  // Ready section
  console.log(pc.bold(pc.green("► READY (todo)")));
  if (output.ready.length === 0) {
    console.log(pc.dim("  (none)"));
  } else {
    for (const issue of output.ready) {
      printTaskItem(issue, "ready");
    }
  }
  console.log("");

  // Active section
  console.log(pc.bold(pc.blue("► ACTIVE (in progress/review)")));
  if (output.active.length === 0) {
    console.log(pc.dim("  (none)"));
  } else {
    for (const issue of output.active) {
      printTaskItem(issue, "active");
    }
  }
  console.log("");

  // Blocked section
  console.log(pc.bold(pc.red("► BLOCKED")));
  if (output.blocked.length === 0) {
    console.log(pc.dim("  (none)"));
  } else {
    for (const issue of output.blocked) {
      printTaskItem(issue, "blocked");
    }
  }
  console.log("");

  // Summary
  const total = output.ready.length + output.active.length + output.blocked.length;
  console.log(pc.dim(`Total: ${total} (${output.ready.length} ready, ${output.active.length} active, ${output.blocked.length} blocked)`));
}

function printTaskItem(issue: NextTaskItem, category: "ready" | "active" | "blocked"): void {
  const id = issue.identifier ?? issue.id.slice(0, 8);
  const assignee = issue.assigneeAgentId ? ` @${issue.assigneeAgentId.slice(0, 8)}` : "";
  const priority = issue.priority !== "medium" ? ` (${issue.priority})` : "";

  let statusColor: (text: string) => string;
  switch (category) {
    case "ready":
      statusColor = pc.green;
      break;
    case "active":
      statusColor = pc.blue;
      break;
    case "blocked":
      statusColor = pc.red;
      break;
    default:
      statusColor = pc.white;
  }

  console.log(`  ${statusColor(id)}: ${issue.title}${priority}${pc.dim(assignee)}`);
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

function parseHiddenAt(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim().toLowerCase() === "null") return null;
  return value;
}

function filterIssueRows(rows: Issue[], match: string | undefined): Issue[] {
  if (!match?.trim()) return rows;
  const needle = match.trim().toLowerCase();
  return rows.filter((row) => {
    const text = [row.identifier, row.title, row.description]
      .filter((part): part is string => Boolean(part))
      .join("\n")
      .toLowerCase();
    return text.includes(needle);
  });
}
