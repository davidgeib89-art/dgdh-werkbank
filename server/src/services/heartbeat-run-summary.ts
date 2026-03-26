function truncateSummaryText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function readNumericField(record: Record<string, unknown>, key: string) {
  return key in record ? record[key] ?? null : undefined;
}

export function summarizeHeartbeatRunResultJson(
  resultJson: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!resultJson || typeof resultJson !== "object" || Array.isArray(resultJson)) {
    return null;
  }

  const summary: Record<string, unknown> = {};
  const textFields = ["summary", "result", "message", "error"] as const;
  for (const key of textFields) {
    const value = truncateSummaryText(resultJson[key]);
    if (value !== null) {
      summary[key] = value;
    }
  }

  const numericFieldAliases = ["total_cost_usd", "cost_usd", "costUsd"] as const;
  for (const key of numericFieldAliases) {
    const value = readNumericField(resultJson, key);
    if (value !== undefined && value !== null) {
      summary[key] = value;
    }
  }

  // Label routing-blocked runs clearly in the summary
  if (resultJson["type"] === "routing_blocked") {
    summary.result = "blocked";
    const blockReason = resultJson["blockReason"];
    if (typeof blockReason === "string" && blockReason.length > 0) {
      summary.summary = `Routing blocked: ${blockReason}`;
    }
    const needsApproval = resultJson["needsApproval"];
    if (needsApproval === true) {
      summary.message = "Task requires operator approval before execution";
    }
  }

  // Label awaiting-approval runs — parked, not failed
  if (resultJson["type"] === "routing_awaiting_approval") {
    summary.result = "awaiting_approval";
    summary.summary = "Awaiting operator approval";
    summary.message = "Task requires operator approval before execution";
  }

  if (resultJson["type"] === "loop_detected") {
    summary.result = "blocked";
    const loopSummary = resultJson["summary"];
    if (typeof loopSummary === "string" && loopSummary.length > 0) {
      summary.summary = loopSummary.startsWith("Loop detected:")
        ? loopSummary
        : `Loop detected: ${loopSummary}`;
    }
    const loopMessage = resultJson["message"];
    if (typeof loopMessage === "string" && loopMessage.length > 0) {
      summary.message = loopMessage;
    }
  }

  if (resultJson["type"] === "post_tool_capacity_exhausted") {
    summary.result = "deferred";
    const deferredState =
      typeof resultJson["deferredState"] === "object" &&
      resultJson["deferredState"] !== null &&
      !Array.isArray(resultJson["deferredState"])
        ? (resultJson["deferredState"] as Record<string, unknown>)
        : null;
    const cooldownUntil = deferredState?.["cooldownUntil"];
    summary.blockerClass = "post_tool_capacity_exhausted";
    summary.blockerState =
      deferredState?.["state"] ?? resultJson["status"] ?? null;
    summary.knownBlocker = true;
    summary.nextResumePoint = deferredState?.["nextResumePoint"] ?? null;
    summary.summary = "Post-tool capacity cooldown";
    if (typeof cooldownUntil === "string" && cooldownUntil.length > 0) {
      summary.message = `Resume after cooldown: ${cooldownUntil}`;
    }
    if (deferredState) {
      summary.deferredState = {
        state: deferredState["state"] ?? null,
        issueId: deferredState["issueId"] ?? null,
        nextResumePoint: deferredState["nextResumePoint"] ?? null,
        cooldownUntil: deferredState["cooldownUntil"] ?? null,
      };
    }
    const resume =
      typeof resultJson["resume"] === "object" &&
      resultJson["resume"] !== null &&
      !Array.isArray(resultJson["resume"])
        ? (resultJson["resume"] as Record<string, unknown>)
        : null;
    if (resume) {
      summary.nextWakeStatus = resume["nextWakeStatus"] ?? null;
      summary.nextWakeNotBefore = resume["nextWakeNotBefore"] ?? null;
      summary.resume = {
        state: resume["state"] ?? null,
        sessionId: resume["sessionId"] ?? null,
        taskKey: resume["taskKey"] ?? null,
        nextWakeStatus: resume["nextWakeStatus"] ?? null,
        nextWakeNotBefore: resume["nextWakeNotBefore"] ?? null,
      };
    }
  }

  return Object.keys(summary).length > 0 ? summary : null;
}
