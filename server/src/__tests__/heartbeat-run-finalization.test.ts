import { describe, expect, it, vi } from "vitest";
import { finalizeHeartbeatAgentStatus } from "../services/heartbeat-run-finalization.ts";

describe("finalizeHeartbeatAgentStatus", () => {
  it("heals blocked runs back to idle and publishes the reconciled status", async () => {
    const publishAgentStatus = vi.fn();
    const updateAgentStatus = vi.fn(
      async (_agentId: string, nextStatus: string) => ({
        id: "agent-1",
        companyId: "company-1",
        status: nextStatus,
        lastHeartbeatAt: null,
      }),
    );

    await finalizeHeartbeatAgentStatus(
      {
        agentId: "agent-1",
        outcome: "blocked",
        errorCode: "risk_high_large_implementation",
      },
      {
        getAgent: async () => ({
          id: "agent-1",
          companyId: "company-1",
          status: "running",
          lastHeartbeatAt: null,
        }),
        countRunningRunsForAgent: async () => 0,
        updateAgentStatus,
        publishAgentStatus,
      },
    );

    expect(updateAgentStatus).toHaveBeenCalledWith("agent-1", "idle");
    expect(publishAgentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        companyId: "company-1",
        status: "idle",
        outcome: "blocked",
      }),
    );
  });

  it("keeps process_lost recoveries on idle when no other runs are active", async () => {
    const updateAgentStatus = vi.fn(
      async (_agentId: string, nextStatus: string) => ({
        id: "agent-2",
        companyId: "company-1",
        status: nextStatus,
        lastHeartbeatAt: null,
      }),
    );

    await finalizeHeartbeatAgentStatus(
      {
        agentId: "agent-2",
        outcome: "failed",
        errorCode: "process_lost",
      },
      {
        getAgent: async () => ({
          id: "agent-2",
          companyId: "company-1",
          status: "error",
          lastHeartbeatAt: null,
        }),
        countRunningRunsForAgent: async () => 0,
        updateAgentStatus,
        publishAgentStatus: vi.fn(),
      },
    );

    expect(updateAgentStatus).toHaveBeenCalledWith("agent-2", "idle");
  });

  it("does not override paused agents", async () => {
    const updateAgentStatus = vi.fn();
    const publishAgentStatus = vi.fn();

    await finalizeHeartbeatAgentStatus(
      {
        agentId: "agent-3",
        outcome: "failed",
        errorCode: "adapter_failed",
      },
      {
        getAgent: async () => ({
          id: "agent-3",
          companyId: "company-1",
          status: "paused",
          lastHeartbeatAt: null,
        }),
        countRunningRunsForAgent: async () => 0,
        updateAgentStatus,
        publishAgentStatus,
      },
    );

    expect(updateAgentStatus).not.toHaveBeenCalled();
    expect(publishAgentStatus).not.toHaveBeenCalled();
  });
});
