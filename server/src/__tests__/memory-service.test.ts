import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { MemoryItem } from "@paperclipai/shared";
import { createInMemoryMemoryStore } from "../services/memory.js";

function buildMemory(overrides: Partial<MemoryItem> = {}): MemoryItem {
  const now = new Date("2026-03-16T10:00:00.000Z");
  return {
    id: overrides.id ?? randomUUID(),
    companyId: overrides.companyId ?? "company-1",
    scope: overrides.scope ?? "personal",
    kind: overrides.kind ?? "fact",
    agentId: overrides.agentId ?? "agent-1",
    projectId: overrides.projectId ?? null,
    relatedAgentIds: overrides.relatedAgentIds ?? [],
    summary: overrides.summary ?? "Memory summary",
    detail: overrides.detail ?? "Memory detail",
    tags: overrides.tags ?? ["memory"],
    importance: overrides.importance ?? 50,
    confidence: overrides.confidence ?? 50,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    lastUsedAt: overrides.lastUsedAt ?? null,
    sourceRefs: overrides.sourceRefs ?? [],
  };
}

describe("createInMemoryMemoryStore", () => {
  it("adds and retrieves scoped memories", async () => {
    const store = createInMemoryMemoryStore();
    await store.add(
      buildMemory({
        id: "m-1",
        scope: "personal",
        summary: "API key location",
        detail: "Store in vault",
        tags: ["security", "vault"],
      }),
    );
    await store.add(
      buildMemory({
        id: "m-2",
        scope: "company",
        summary: "Mission",
        detail: "Human-first symbiosis",
        tags: ["mission"],
      }),
    );

    const personal = await store.search({
      text: "vault",
      scope: ["personal"],
      agentId: "agent-1",
    });
    expect(personal).toHaveLength(1);
    expect(personal[0]?.id).toBe("m-1");
  });

  it("supports correction and reinforcement", async () => {
    const store = createInMemoryMemoryStore();
    await store.add(
      buildMemory({
        id: "m-3",
        importance: 40,
        confidence: 30,
      }),
    );

    await store.correct("m-3", {
      summary: "Updated summary",
      tags: ["updated", "memory"],
      confidence: 65,
    });

    const corrected = await store.search({ text: "updated", limit: 10 });
    expect(corrected[0]?.summary).toBe("Updated summary");
    expect(corrected[0]?.tags).toEqual(["updated", "memory"]);
    expect(corrected[0]?.confidence).toBe(65);

    await store.reinforce("m-3");
    const reinforced = await store.search({ text: "updated", limit: 1 });
    expect(reinforced[0]?.importance).toBe(45);
    expect(reinforced[0]?.confidence).toBe(67);
    expect(reinforced[0]?.lastUsedAt).not.toBeNull();
  });
});
