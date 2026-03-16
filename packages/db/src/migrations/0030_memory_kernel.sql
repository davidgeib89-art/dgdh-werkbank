-- Rollback:
--   DROP INDEX IF EXISTS "memory_items_company_created_idx";
--   DROP INDEX IF EXISTS "memory_items_company_used_idx";
--   DROP INDEX IF EXISTS "memory_items_company_project_scope_idx";
--   DROP INDEX IF EXISTS "memory_items_company_agent_scope_idx";
--   DROP INDEX IF EXISTS "memory_items_company_kind_idx";
--   DROP INDEX IF EXISTS "memory_items_company_scope_idx";
--   DROP TABLE IF EXISTS "memory_items";

CREATE TABLE "memory_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "scope" text NOT NULL,
  "kind" text NOT NULL,
  "agent_id" uuid,
  "project_id" uuid,
  "related_agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "summary" text NOT NULL,
  "detail" text NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "importance" integer DEFAULT 50 NOT NULL,
  "confidence" integer DEFAULT 50 NOT NULL,
  "source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_items_company_scope_idx" ON "memory_items" USING btree ("company_id","scope");
--> statement-breakpoint
CREATE INDEX "memory_items_company_kind_idx" ON "memory_items" USING btree ("company_id","kind");
--> statement-breakpoint
CREATE INDEX "memory_items_company_agent_scope_idx" ON "memory_items" USING btree ("company_id","agent_id","scope");
--> statement-breakpoint
CREATE INDEX "memory_items_company_project_scope_idx" ON "memory_items" USING btree ("company_id","project_id","scope");
--> statement-breakpoint
CREATE INDEX "memory_items_company_used_idx" ON "memory_items" USING btree ("company_id","last_used_at");
--> statement-breakpoint
CREATE INDEX "memory_items_company_created_idx" ON "memory_items" USING btree ("company_id","created_at");
