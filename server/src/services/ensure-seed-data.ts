import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, companies } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

interface SeedCompany {
  name: string;
  status: string;
  budgetMonthlyCents: number;
}

interface SeedAgent {
  name: string;
  role: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
}

interface SeedConfig {
  company: SeedCompany;
  agents: SeedAgent[];
}

const DGDH_COMPANY_NAME = "David Geib Digitales Handwerk";

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label}: expected object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${label}: expected non-empty string`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${label}: expected finite number`);
  }
  return value;
}

function isEmptyRecord(value: unknown): boolean {
  return (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value as Record<string, unknown>).length === 0
  );
}

function parseSeedConfig(raw: unknown): SeedConfig {
  const root = asObject(raw, "seed root");
  const companyRaw = asObject(root.company, "company");
  const agentsRaw = root.agents;
  if (!Array.isArray(agentsRaw)) {
    throw new Error("Invalid agents: expected array");
  }

  const company: SeedCompany = {
    name: asString(companyRaw.name, "company.name"),
    status: asString(companyRaw.status, "company.status"),
    budgetMonthlyCents: asNumber(
      companyRaw.budgetMonthlyCents,
      "company.budgetMonthlyCents",
    ),
  };

  if (company.name !== DGDH_COMPANY_NAME) {
    throw new Error(
      `Invalid company.name: expected "${DGDH_COMPANY_NAME}", got "${company.name}"`,
    );
  }

  const agents: SeedAgent[] = agentsRaw.map((item, index) => {
    const row = asObject(item, `agents[${index}]`);
    return {
      name: asString(row.name, `agents[${index}].name`),
      role: asString(row.role, `agents[${index}].role`),
      adapterType: asString(row.adapterType, `agents[${index}].adapterType`),
      adapterConfig: asObject(
        row.adapterConfig,
        `agents[${index}].adapterConfig`,
      ),
      runtimeConfig: asObject(
        row.runtimeConfig,
        `agents[${index}].runtimeConfig`,
      ),
    };
  });

  return { company, agents };
}

function resolveSeedConfigPath(): string {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(serviceDir, "../../config/seed/dgdh-firm.json");
}

function loadSeedConfig(): SeedConfig {
  const seedPath = resolveSeedConfigPath();
  try {
    const raw = fs.readFileSync(seedPath, "utf8");
    return parseSeedConfig(JSON.parse(raw) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load DGDH seed config (${seedPath}): ${message}`);
  }
}

export async function ensureSeedData(db: Db): Promise<void> {
  const seedConfig = loadSeedConfig();

  const existingCompany = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.name, DGDH_COMPANY_NAME))
    .then((rows) => rows[0] ?? null);
  if (existingCompany) {
    let backfilledAgents = 0;
    let createdAgents = 0;
    for (const seedAgent of seedConfig.agents) {
      const existingAgent = await db
        .select({ id: agents.id, runtimeConfig: agents.runtimeConfig })
        .from(agents)
        .where(
          and(
            eq(agents.companyId, existingCompany.id),
            eq(agents.name, seedAgent.name),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (!existingAgent) {
        await db.insert(agents).values({
          companyId: existingCompany.id,
          name: seedAgent.name,
          role: seedAgent.role,
          adapterType: seedAgent.adapterType,
          adapterConfig: seedAgent.adapterConfig,
          runtimeConfig: seedAgent.runtimeConfig,
        });
        createdAgents += 1;
        continue;
      }

      if (isEmptyRecord(existingAgent.runtimeConfig)) {
        await db
          .update(agents)
          .set({ runtimeConfig: seedAgent.runtimeConfig })
          .where(eq(agents.id, existingAgent.id));
        backfilledAgents += 1;
      }
    }

    if (createdAgents > 0 || backfilledAgents > 0) {
      logger.info(
        {
          companyName: seedConfig.company.name,
          createdAgents,
          backfilledAgents,
        },
        "DGDH seed agent runtime restored",
      );
    }
    return;
  }

  await db.transaction(async (tx) => {
    const insertedCompany = await tx
      .insert(companies)
      .values({
        name: seedConfig.company.name,
        status: seedConfig.company.status,
        budgetMonthlyCents: seedConfig.company.budgetMonthlyCents,
      })
      .returning({ id: companies.id })
      .then((rows) => rows[0] ?? null);
    if (!insertedCompany) {
      throw new Error("Failed to insert seeded DGDH company");
    }

    if (seedConfig.agents.length > 0) {
      await tx.insert(agents).values(
        seedConfig.agents.map((agent) => ({
          companyId: insertedCompany.id,
          name: agent.name,
          role: agent.role,
          adapterType: agent.adapterType,
          adapterConfig: agent.adapterConfig,
          runtimeConfig: agent.runtimeConfig,
        })),
      );
    }
  });

  logger.info(
    {
      companyName: seedConfig.company.name,
      agentCount: seedConfig.agents.length,
    },
    "DGDH seed data restored",
  );
}
