import { Command } from 'commander';
import process from 'process'; // Import process to set exitCode

// Define a simple interface for packet validation
interface Packet {
  title?: string;
  packetType?: string;
  executionIntent?: string;
  reviewPolicy?: string;
  needsReview?: boolean;
  status?: string;
  Ziel?: string;
  Scope?: string;
  targetFile?: string;
  targetFolder?: string;
  artifactKind?: string;
  doneWhen?: string;
  Annahmen?: string; // Assuming Annahmen is a string field
}

// Placeholder for parsing packet data from arguments or stdin
// For now, we'll simulate receiving packet data.
// In a real CLI, this might involve reading from stdin or parsing command-line arguments.
async function getPacketData(): Promise<Packet> {
  // Simulate receiving a packet. This should be replaced with actual parsing logic.
  return {
    title: "Add paperclipai issue validate-packet command",
    packetType: "free_api",
    executionIntent: "implement",
    reviewPolicy: "required",
    needsReview: true,
    status: "todo",
    Ziel: "Implement a new command `validate-packet` in the `paperclipai` CLI for pre-launch validation.",
    Scope: "cli/src/commands/client/, cli/src/__tests__/, and cli/src/index.ts.",
    targetFile: "n/a",
    targetFolder: "cli/src/commands/client/",
    artifactKind: "multi_file_change",
    // Use template literal for multi-line string
    doneWhen: `- Command exists and is registered in cli/src/commands/client/
- Exits 0 for ready packet, 1 for not-ready packet
- Supports --json flag for machine-readable output
- TDD tests pass in cli/src/__tests__/
- Typecheck passes (pnpm -r typecheck)`,
    Annahmen: "no obvious blockers", // Simulate a "ready" Annahmen field
  };
}

async function validatePacket(options: { json?: boolean }): Promise<void> {
  const packet = await getPacketData();

  let isReady = true;
  let validationMessages: string[] = [];

  // Basic validation rules:
  if (!packet.title) {
    isReady = false;
    validationMessages.push("Packet is missing a title.");
  }
  if (!packet.packetType) {
    isReady = false;
    validationMessages.push("Packet is missing packetType.");
  }
  if (!packet.executionIntent) {
    isReady = false;
    validationMessages.push("Packet is missing executionIntent.");
  }
  if (!packet.status) {
    isReady = false;
    validationMessages.push("Packet is missing status.");
  }
  if (!packet.doneWhen) {
    isReady = false;
    validationMessages.push("Packet is missing doneWhen criteria.");
  }
  if (packet.Annahmen?.includes("[NEEDS INPUT]")) {
    isReady = false;
    validationMessages.push("Packet has '[NEEDS INPUT]' in assumptions, indicating it's not ready.");
  }
  // Add more validation rules as needed...

  const result = {
    isReady: isReady,
    messages: validationMessages,
    packet: packet, // Include packet details in JSON output for debugging
  };

  if (options.json) {
    // Commander.js actions don't automatically set process.exitCode.
    // We need to explicitly set it.
    process.exitCode = isReady ? 0 : 1;
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (isReady) {
      console.log('Packet is ready for processing.');
      process.exitCode = 0;
    } else {
      console.error('Packet validation failed:');
      validationMessages.forEach(msg => console.error(`- ${msg}`));
      process.exitCode = 1;
    }
  }
}

export const validatePacketCommand = new Command()
  .name('validate-packet')
  .description('Validates a Paperclip packet for pre-launch readiness.')
  .option('--json', 'Output results in JSON format.')
  .action(validatePacket);
