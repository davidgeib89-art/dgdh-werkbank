import { afterEach, describe, expect, it } from "vitest";
import { collectDeploymentEnvRows } from "../commands/env.js";

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

describe("collectDeploymentEnvRows", () => {
  it("reports default heartbeat recovery grace values", () => {
    delete process.env.HEARTBEAT_RECOVERY_GRACE_MS;
    delete process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS;

    const rows = collectDeploymentEnvRows(null, "paperclip.config.json");
    const recoveryRow = rows.find(
      (row) => row.key === "HEARTBEAT_RECOVERY_GRACE_MS",
    );
    const startupRow = rows.find(
      (row) => row.key === "HEARTBEAT_STARTUP_RECOVERY_GRACE_MS",
    );

    expect(recoveryRow).toMatchObject({
      value: "600000",
      source: "default",
    });
    expect(startupRow).toMatchObject({
      value: "900000",
      source: "default",
    });
  });

  it("reports explicit heartbeat recovery grace env overrides", () => {
    process.env.HEARTBEAT_RECOVERY_GRACE_MS = "120000";
    process.env.HEARTBEAT_STARTUP_RECOVERY_GRACE_MS = "240000";

    const rows = collectDeploymentEnvRows(null, "paperclip.config.json");
    const recoveryRow = rows.find(
      (row) => row.key === "HEARTBEAT_RECOVERY_GRACE_MS",
    );
    const startupRow = rows.find(
      (row) => row.key === "HEARTBEAT_STARTUP_RECOVERY_GRACE_MS",
    );

    expect(recoveryRow).toMatchObject({
      value: "120000",
      source: "env",
    });
    expect(startupRow).toMatchObject({
      value: "240000",
      source: "env",
    });
  });
});
