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

  return Object.keys(summary).length > 0 ? summary : null;
}
