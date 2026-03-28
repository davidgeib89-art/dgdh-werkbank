import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFile(projectDir, relativePath) {
  try {
    return readFileSync(join(projectDir, relativePath), "utf8");
  } catch {
    return "";
  }
}

function firstLineWithPrefix(text, prefix) {
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

function firstRegexMatch(text, pattern) {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? "";
}

const projectDir = process.env.FACTORY_PROJECT_DIR || process.cwd();
const current = readFile(projectDir, "CURRENT.md");
const activeMission = readFile(projectDir, "company-hq/ACTIVE-MISSION.md");

const focus = firstLineWithPrefix(current, "focus:");
const activeIssue = firstLineWithPrefix(current, "active_issue:");
const nextMountain = firstRegexMatch(activeMission, /Next mountain:\s*(.+)/i);

const additionalContext = [
  "DGDH session re-anchor:",
  "- Grounding files: CURRENT.md, MEMORY.md, company-hq/ACTIVE-MISSION.md, SOUL.md.",
  "- Role voices: Nerah = mission and direction, Eidan = build and carry, Taren = review and truth.",
  focus ? `- Current focus: ${focus}` : "",
  activeIssue ? `- Active issue: ${activeIssue}` : "",
  nextMountain ? `- Next mountain: ${nextMountain}` : "",
  "- Long Droid missions are allowed on David-low days, but they only count after hard review for real value versus slop.",
  "- Prefer the largest still-reviewable coherent step. Reduce David supervision. Kill drift that saves no real David minutes.",
].filter(Boolean).join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext,
  },
}));
