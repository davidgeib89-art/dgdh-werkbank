import { Command } from "commander";
import { runtimeStatus } from "./status.js";

export function registerRuntimeCommands(program: Command): void {
  const runtime = program.command("runtime").description("Runtime status and diagnostics");

  runtime
    .command("status")
    .description("Check runtime health and triad readiness")
    .option("-c, --config <path>", "Path to Paperclip config file")
    .option("-d, --data-dir <path>", "Paperclip data directory root")
    .option("--api-url <url>", "Base URL for the Paperclip API (overrides env and config)")
    .action(async (opts) => {
      const result = await runtimeStatus({ apiUrl: opts.apiUrl });
      process.exit(result.exitCode);
    });
}
