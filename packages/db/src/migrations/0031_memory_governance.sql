-- Sprint 3: Memory Governance — adds approval/ownership/archive columns to memory_items.
--
-- Rollback:
--   DROP INDEX IF EXISTS "memory_items_company_approval_idx";
--   ALTER TABLE "memory_items" DROP COLUMN IF EXISTS "approved_at";
--   ALTER TABLE "memory_items" DROP COLUMN IF EXISTS "approved_by";
--   ALTER TABLE "memory_items" DROP COLUMN IF EXISTS "archived_at";
--   ALTER TABLE "memory_items" DROP COLUMN IF EXISTS "owner_id";
--   ALTER TABLE "memory_items" DROP COLUMN IF EXISTS "approval_status";

ALTER TABLE "memory_items" ADD COLUMN "approval_status" text NOT NULL DEFAULT 'approved';
--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "owner_id" uuid;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "archived_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "approved_by" text;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD COLUMN "approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_owner_id_agents_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_items_company_approval_idx" ON "memory_items" USING btree ("company_id","approval_status");
