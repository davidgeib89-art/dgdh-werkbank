import { Command } from "commander";
import type { Project } from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface ProjectListOptions extends BaseClientOptions {
  companyId?: string;
}

export function registerProjectCommands(program: Command): void {
  const project = program.command("project").description("Project operations");

  addCommonClientOptions(
    project
      .command("list")
      .description("List projects for a company")
      .option("-C, --company-id <id>", "Company ID")
      .action(async (opts: ProjectListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = (await ctx.api.get<Project[]>(`/api/companies/${ctx.companyId}/projects`)) ?? [];

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
                status: row.status,
                urlKey: row.urlKey,
                leadAgentId: row.leadAgentId,
                archivedAt: row.archivedAt,
                targetDate: row.targetDate,
                createdAt: row.createdAt,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}
