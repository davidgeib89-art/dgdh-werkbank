import { createDb } from "./src/client.js";
import { companies, agents, projects, issues, heartbeatRuns, agentRuntimeState, goals } from "./src/schema/index.js";

async function main() {
  const db = createDb("postgres://postgres@localhost:54329/paperclip");

  console.log("=== COMPANIES ===");
  const comps = await db.select().from(companies);
  console.log(JSON.stringify(comps, null, 2));

  console.log("\n=== AGENTS ===");
  const ags = await db.select().from(agents);
  console.log(JSON.stringify(ags, null, 2));

  console.log("\n=== PROJECTS ===");
  const projs = await db.select().from(projects);
  console.log(JSON.stringify(projs, null, 2));

  console.log("\n=== GOALS ===");
  const gls = await db.select().from(goals);
  console.log(JSON.stringify(gls, null, 2));

  console.log("\n=== ISSUES ===");
  const iss = await db.select().from(issues);
  console.log(JSON.stringify(iss, null, 2));

  console.log("\n=== HEARTBEAT RUNS ===");
  const hrs = await db.select().from(heartbeatRuns);
  console.log(JSON.stringify(hrs, null, 2));

  console.log("\n=== AGENT RUNTIME STATE ===");
  const ars = await db.select().from(agentRuntimeState);
  console.log(JSON.stringify(ars, null, 2));
}

main();
