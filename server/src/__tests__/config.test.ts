import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";

const ORIGINAL_HEARTBEAT_RECOVERY_GRACE_MS =
  process.env.HEARTBEAT_RECOVERY_GRACE_MS;
const ORIGINAL_HEARTBEAT_STARTUP_RECOVERY_GRACE_MS =
  process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS;

afterEach(() => {
  if (ORIGINAL_HEARTBEAT_RECOVERY_GRACE_MS === undefined) {
    delete process.env.HEARTBEAT_RECOVERY_GRACE_MS;
  } else {
    process.env.HEARTBEAT_RECOVERY_GRACE_MS =
      ORIGINAL_HEARTBEAT_RECOVERY_GRACE_MS;
  }

  if (ORIGINAL_HEARTBEAT_STARTUP_RECOVERY_GRACE_MS === undefined) {
    delete process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS;
  } else {
    process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS =
      ORIGINAL_HEARTBEAT_STARTUP_RECOVERY_GRACE_MS;
  }
});

describe("loadConfig heartbeat recovery grace", () => {
  it("uses documented defaults when overrides are unset", () => {
    delete process.env.HEARTBEAT_RECOVERY_GRACE_MS;
    delete process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS;

    const config = loadConfig();

    expect(config.heartbeatRecoveryGraceMs).toBe(2 * 60 * 1000);
    expect(config.heartbeatStartupRecoveryGraceMs).toBe(3 * 60 * 1000);
  });

  it("clamps recovery grace and keeps startup grace at least as large", () => {
    process.env.HEARTBEAT_RECOVERY_GRACE_MS = "1";
    process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS = "5000";

    const config = loadConfig();

    expect(config.heartbeatRecoveryGraceMs).toBe(10_000);
    expect(config.heartbeatStartupRecoveryGraceMs).toBe(10_000);
  });

  it("respects larger explicit startup recovery grace values", () => {
    process.env.HEARTBEAT_RECOVERY_GRACE_MS = "120000";
    process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS = "240000";

    const config = loadConfig();

    expect(config.heartbeatRecoveryGraceMs).toBe(120_000);
    expect(config.heartbeatStartupRecoveryGraceMs).toBe(240_000);
  });
});
