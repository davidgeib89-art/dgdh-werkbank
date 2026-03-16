import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import type { MemoryKind, MemoryScope } from "@paperclipai/shared";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { projects } from "./projects.js";

export const memoryItems = pgTable(
  "memory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    scope: text("scope").$type<MemoryScope>().notNull(),
    kind: text("kind").$type<MemoryKind>().notNull(),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    relatedAgentIds: jsonb("related_agent_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    summary: text("summary").notNull(),
    detail: text("detail").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    importance: integer("importance").notNull().default(50),
    confidence: integer("confidence").notNull().default(50),
    sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    companyScopeIdx: index("memory_items_company_scope_idx").on(
      table.companyId,
      table.scope,
    ),
    companyKindIdx: index("memory_items_company_kind_idx").on(
      table.companyId,
      table.kind,
    ),
    companyAgentScopeIdx: index("memory_items_company_agent_scope_idx").on(
      table.companyId,
      table.agentId,
      table.scope,
    ),
    companyProjectScopeIdx: index("memory_items_company_project_scope_idx").on(
      table.companyId,
      table.projectId,
      table.scope,
    ),
    companyUsedIdx: index("memory_items_company_used_idx").on(
      table.companyId,
      table.lastUsedAt,
    ),
    companyCreatedIdx: index("memory_items_company_created_idx").on(
      table.companyId,
      table.createdAt,
    ),
  }),
);
