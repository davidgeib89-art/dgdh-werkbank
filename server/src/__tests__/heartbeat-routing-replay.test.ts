import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  prepareHeartbeatGeminiRouting,
  type HeartbeatRoutingReplayFixture,
} from "../services/heartbeat-gemini-routing.ts";

function loadFixture(filename: string): HeartbeatRoutingReplayFixture {
  const fixturePath = path.resolve(
    __dirname,
    "./fixtures/heartbeat-routing",
    filename,
  );
  return JSON.parse(readFileSync(fixturePath, "utf8")) as HeartbeatRoutingReplayFixture;
}

const fixtures = [
  loadFixture("dav-88-ceo-ready.json"),
  loadFixture("dav-91-ceo-ready.json"),
  loadFixture("dav-89-worker-incomplete-ready.json"),
];

describe("heartbeat routing replay fixtures", () => {
  for (const fixture of fixtures) {
    it(`replays ${fixture.name}`, async () => {
      let routerCalls = 0;

      const plan = await prepareHeartbeatGeminiRouting(
        {
          agent: fixture.agent,
          resolvedConfig: fixture.resolvedConfig,
          runtimeConfig: fixture.runtimeConfig,
          runtimeState: fixture.runtimeState,
          issueRef: fixture.issueRef,
          context: fixture.context ?? {},
        },
        {
          produceRoutingProposal: async () => {
            routerCalls += 1;
            return {
              attempted: true,
              source: "heuristic_policy",
              proposal: null,
              parseStatus: "schema_invalid",
              latencyMs: 1,
              warning: "unexpected_router_call_in_replay_fixture",
              fallbackReason: "unexpected_router_call_in_replay_fixture",
              cacheHit: false,
              runtimeStatePatch: {},
              routerHealth: {
                successCount: 0,
                fallbackCount: 1,
                timeoutCount: 0,
                parseFailCount: 1,
                commandErrorCount: 0,
                cacheHitCount: 0,
                circuitOpenCount: 0,
                consecutiveFailures: 1,
                breakerOpenUntil: null,
                lastLatencyMs: 1,
                lastErrorReason: "unexpected_router_call_in_replay_fixture",
              },
            };
          },
        },
      );

      expect(plan.routingPreflight).not.toBeNull();
      expect(plan.routingPreflight?.laneDecision.roleHint).toBe(
        fixture.expected.roleHint,
      );
      expect(plan.routingPreflight?.selected.selectedBucket).toBe(
        fixture.expected.selectedBucket,
      );
      expect(plan.routingPreflight?.selected.effectiveModelLane).toBe(
        fixture.expected.effectiveModelLane,
      );
      expect(plan.routingProposalMeta?.parseStatus).toBe(
        fixture.expected.parseStatus,
      );
      expect(plan.routingProposalMeta?.fallbackReason).toBe(
        fixture.expected.fallbackReason,
      );
      expect(routerCalls).toBe(fixture.expected.readyPacketSkip ? 0 : 1);
      if (fixture.expected.allowedSkills) {
        expect(plan.resolvedConfigPatch.includeSkills).toEqual(
          fixture.expected.allowedSkills,
        );
      } else {
        expect(plan.resolvedConfigPatch.includeSkills).toBeUndefined();
      }
    });
  }
});
