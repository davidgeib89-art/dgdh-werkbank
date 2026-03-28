import { Command } from "commander";
import type { Agent } from "@paperclipai/shared";
import {
  removeMaintainerOnlySkillSymlinks,
  resolvePaperclipSkillsDir,
} from "@paperclipai/adapter-utils/server-utils";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface AgentListOptions extends BaseClientOptions {
  companyId?: string;
}

interface AgentLocalCliOptions extends BaseClientOptions {
  companyId?: string;
  keyName?: string;
  installSkills?: boolean;
}

interface CreatedAgentKey {
  id: string;
  name: string;
  token: string;
  createdAt: string;
}

interface SkillsInstallSummary {
  tool: "codex" | "claude";
  target: string;
  linked: string[];
  removed: string[];
  skipped: string[];
  failed: Array<{ name: string; error: string }>;
}

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

function codexSkillsHome(): string {
  const fromEnv = process.env.CODEX_HOME?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : path.join(os.homedir(), ".codex");
  return path.join(base, "skills");
}

function claudeSkillsHome(): string {
  const fromEnv = process.env.CLAUDE_HOME?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : path.join(os.homedir(), ".claude");
  return path.join(base, "skills");
}

async function installSkillsForTarget(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  tool: "codex" | "claude",
): Promise<SkillsInstallSummary> {
  const summary: SkillsInstallSummary = {
    tool,
    target: targetSkillsDir,
    linked: [],
    removed: [],
    skipped: [],
    failed: [],
  };

  await fs.mkdir(targetSkillsDir, { recursive: true });
  const entries = await fs.readdir(sourceSkillsDir, { withFileTypes: true });
  summary.removed = await removeMaintainerOnlySkillSymlinks(
    targetSkillsDir,
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  );
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = path.join(sourceSkillsDir, entry.name);
    const target = path.join(targetSkillsDir, entry.name);
    const existing = await fs.lstat(target).catch(() => null);
    if (existing) {
      if (existing.isSymbolicLink()) {
        let linkedPath: string | null = null;
        try {
          linkedPath = await fs.readlink(target);
        } catch (err) {
          await fs.unlink(target);
          try {
            await fs.symlink(source, target);
            summary.linked.push(entry.name);
            continue;
          } catch (linkErr) {
            summary.failed.push({
              name: entry.name,
              error:
                err instanceof Error && linkErr instanceof Error
                  ? `${err.message}; then ${linkErr.message}`
                  : err instanceof Error
                    ? err.message
                    : `Failed to recover broken symlink: ${String(err)}`,
            });
            continue;
          }
        }

        const resolvedLinkedPath = path.isAbsolute(linkedPath)
          ? linkedPath
          : path.resolve(path.dirname(target), linkedPath);
        const linkedTargetExists = await fs
          .stat(resolvedLinkedPath)
          .then(() => true)
          .catch(() => false);

        if (!linkedTargetExists) {
          await fs.unlink(target);
        } else {
          summary.skipped.push(entry.name);
          continue;
        }
      } else {
        summary.skipped.push(entry.name);
        continue;
      }
    }

    try {
      await fs.symlink(source, target);
      summary.linked.push(entry.name);
    } catch (err) {
      summary.failed.push({
        name: entry.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

function buildAgentEnvExports(input: {
  apiBase: string;
  companyId: string;
  agentId: string;
  apiKey: string;
}): string {
  const escaped = (value: string) => value.replace(/'/g, "'\"'\"'");
  return [
    `export PAPERCLIP_API_URL='${escaped(input.apiBase)}'`,
    `export PAPERCLIP_COMPANY_ID='${escaped(input.companyId)}'`,
    `export PAPERCLIP_AGENT_ID='${escaped(input.agentId)}'`,
    `export PAPERCLIP_API_KEY='${escaped(input.apiKey)}'`,
  ].join("\n");
}

export function registerAgentCommands(program: Command): void {
  const agent = program.command("agent").description("Agent operations");

  addCommonClientOptions(
    agent
      .command("list")
      .description("List agents for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: AgentListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = (await ctx.api.get<Agent[]>(`/api/companies/${ctx.companyId}/agents`)) ?? [];

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const row of rows) {
            console.log(
              formatInlineRecord({
                id: row.id,
                name: row.name,
                role: row.role,
                status: row.status,
                reportsTo: row.reportsTo,
                budgetMonthlyCents: row.budgetMonthlyCents,
                spentMonthlyCents: row.spentMonthlyCents,
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
    agent
      .command("get")
      .description("Get one agent")
      .argument("<agentId>", "Agent ID")
      .action(async (agentId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Agent>(`/api/agents/${agentId}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    agent
      .command("local-cli")
      .description(
        "Create an agent API key, install local Paperclip skills for Codex/Claude, and print shell exports",
      )
      .argument("<agentRef>", "Agent ID or shortname/url-key")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .option("--key-name <name>", "API key label", "local-cli")
      .option(
        "--no-install-skills",
        "Skip installing Paperclip skills into ~/.codex/skills and ~/.claude/skills",
      )
      .action(async (agentRef: string, opts: AgentLocalCliOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const query = new URLSearchParams({ companyId: ctx.companyId ?? "" });
          const agentRow = await ctx.api.get<Agent>(
            `/api/agents/${encodeURIComponent(agentRef)}?${query.toString()}`,
          );
          if (!agentRow) {
            throw new Error(`Agent not found: ${agentRef}`);
          }

          const now = new Date().toISOString().replaceAll(":", "-");
          const keyName = opts.keyName?.trim() ? opts.keyName.trim() : `local-cli-${now}`;
          const key = await ctx.api.post<CreatedAgentKey>(`/api/agents/${agentRow.id}/keys`, { name: keyName });
          if (!key) {
            throw new Error("Failed to create API key");
          }

          const installSummaries: SkillsInstallSummary[] = [];
          if (opts.installSkills !== false) {
            const skillsDir = await resolvePaperclipSkillsDir(__moduleDir, [path.resolve(process.cwd(), "skills")]);
            if (!skillsDir) {
              throw new Error(
                "Could not locate local Paperclip skills directory. Expected ./skills in the repo checkout.",
              );
            }

            installSummaries.push(
              await installSkillsForTarget(skillsDir, codexSkillsHome(), "codex"),
              await installSkillsForTarget(skillsDir, claudeSkillsHome(), "claude"),
            );
          }

          const exportsText = buildAgentEnvExports({
            apiBase: ctx.api.apiBase,
            companyId: agentRow.companyId,
            agentId: agentRow.id,
            apiKey: key.token,
          });

          if (ctx.json) {
            printOutput(
              {
                agent: {
                  id: agentRow.id,
                  name: agentRow.name,
                  urlKey: agentRow.urlKey,
                  companyId: agentRow.companyId,
                },
                key: {
                  id: key.id,
                  name: key.name,
                  createdAt: key.createdAt,
                  token: key.token,
                },
                skills: installSummaries,
                exports: exportsText,
              },
              { json: true },
            );
            return;
          }

          console.log(`Agent: ${agentRow.name} (${agentRow.id})`);
          console.log(`API key created: ${key.name} (${key.id})`);
          if (installSummaries.length > 0) {
            for (const summary of installSummaries) {
              console.log(
                `${summary.tool}: linked=${summary.linked.length} removed=${summary.removed.length} skipped=${summary.skipped.length} failed=${summary.failed.length} target=${summary.target}`,
              );
              for (const failed of summary.failed) {
                console.log(`  failed ${failed.name}: ${failed.error}`);
              }
            }
          }
          console.log("");
          console.log("# Run this in your shell before launching codex/claude:");
          console.log(exportsText);
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // Agent status command - shows runtime state of all agents
  interface AgentStatusOptions extends BaseClientOptions {
    companyId?: string;
  }

  interface AgentHealthItem {
    agentId: string;
    agentName: string;
    role: string;
    adapterType: string;
    agentStatus: string;
    healthStatus: string;
    budgetStatus: string;
    usedTokens: number;
    softCapTokens: number;
    hardCapTokens: number;
    totalCostCents: number;
    lastRun: {
      id: string;
      status: string;
      stopReason: string | null;
      finishedAt: string | null;
      createdAt: string;
    } | null;
  }

  interface AgentHealthResponse {
    companyId: string;
    count: number;
    summary: {
      countsByHealthStatus: Record<string, number>;
      countsByBudgetStatus: Record<string, number>;
      highestSeverity: string;
      atRiskAgents: string[];
    };
    agents: AgentHealthItem[];
  }

  interface LiveRun {
    id: string;
    status: string;
    invocationSource: string;
    triggerDetail: string;
    startedAt: string;
    finishedAt: string | null;
    createdAt: string;
    agentId: string;
    agentName: string;
    adapterType: string;
    issueId: string | null;
  }

  interface AgentStatusOutput {
    id: string;
    name: string;
    role: string;
    status: string;
    currentRun?: {
      id: string;
      issueId: string | null;
      startedAt: string;
    };
    lastRun?: {
      id: string;
      status: string;
      finishedAt: string | null;
    };
  }

  addCommonClientOptions(
    agent
      .command("status")
      .description("Show runtime status of all agents for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: AgentStatusOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const companyId = ctx.companyId!;

          // Fetch agents list, health data, and live runs in parallel
          const [agents, healthData, liveRuns] = await Promise.all([
            ctx.api.get<Agent[]>(`/api/companies/${companyId}/agents`),
            ctx.api.get<AgentHealthResponse>(`/api/companies/${companyId}/agents/health`),
            ctx.api.get<LiveRun[]>(`/api/companies/${companyId}/live-runs`),
          ]);

          const agentList = agents ?? [];
          const health = healthData ?? { companyId, count: 0, summary: { countsByHealthStatus: {}, countsByBudgetStatus: {}, highestSeverity: "ok", atRiskAgents: [] }, agents: [] };
          const runningRuns = liveRuns ?? [];

          // Build a map of agent health data by agentId
          const healthByAgent = new Map(health.agents.map(h => [h.agentId, h]));

          // Build a map of running runs by agentId
          const runByAgent = new Map(runningRuns.map(r => [r.agentId, r]));

          // Check triad readiness (ceo + worker + qa roles)
          const presentRoles = new Set(agentList.map(a => a.role));
          const hasCeo = presentRoles.has("ceo");
          const hasWorker = presentRoles.has("engineer") || presentRoles.has("cto") || presentRoles.has("designer") || presentRoles.has("pm") || presentRoles.has("general");
          const hasReviewer = presentRoles.has("qa");
          const triadReady = hasCeo && hasWorker && hasReviewer;

          // Build output for each agent
          const output: AgentStatusOutput[] = agentList.map(agent => {
            const agentHealth = healthByAgent.get(agent.id);
            const currentRun = runByAgent.get(agent.id);

            const result: AgentStatusOutput = {
              id: agent.id,
              name: agent.name,
              role: agent.role,
              status: currentRun ? "running" : agent.status,
            };

            if (currentRun) {
              result.currentRun = {
                id: currentRun.id,
                issueId: currentRun.issueId,
                startedAt: currentRun.startedAt,
              };
            } else if (agentHealth?.lastRun) {
              result.lastRun = {
                id: agentHealth.lastRun.id,
                status: agentHealth.lastRun.status,
                finishedAt: agentHealth.lastRun.finishedAt,
              };
            }

            return result;
          });

          if (ctx.json) {
            printOutput({
              companyId,
              triadReady,
              triadStatus: {
                ceo: hasCeo,
                worker: hasWorker,
                reviewer: hasReviewer,
              },
              agents: output,
            }, { json: true });
            return;
          }

          // Human-readable output
          console.log(`Company: ${companyId}`);
          console.log(`Triad: ${triadReady ? "✓ Ready" : "✗ Incomplete"} (ceo=${hasCeo}, worker=${hasWorker}, reviewer=${hasReviewer})`);
          console.log(`Agents: ${output.length}`);
          console.log("");

          if (output.length === 0) {
            console.log("(no agents found)");
            return;
          }

          for (const agent of output) {
            const parts: Record<string, unknown> = {
              id: agent.id,
              name: agent.name,
              role: agent.role,
              status: agent.status,
            };

            if (agent.currentRun) {
              parts.currentRun = agent.currentRun.id;
              parts.issue = agent.currentRun.issueId ?? "-";
              parts.startedAt = agent.currentRun.startedAt;
            } else if (agent.lastRun) {
              parts.lastRun = agent.lastRun.id;
              parts.lastStatus = agent.lastRun.status;
              parts.finishedAt = agent.lastRun.finishedAt ?? "-";
            }

            console.log(formatInlineRecord(parts));
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}
