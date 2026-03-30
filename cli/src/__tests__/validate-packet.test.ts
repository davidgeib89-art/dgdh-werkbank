import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import process from 'process';
import { validatePacketCommand } from '../commands/client/validate-packet.js'; // Adjust path as necessary

// Mock implementations for dependencies
let mockPacketData: any = {};

// Mock the module to control getPacketData
vi.mock('../commands/client/validate-packet.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../commands/client/validate-packet.js')>();
  return {
    ...actual,
    getPacketData: vi.fn(() => Promise.resolve(mockPacketData)),
  };
});

// Helper to run a command and capture output/exit code
async function runCommand(args: string[], jsonOutput: boolean = false): Promise<{ stdout: string[]; stderr: string[]; exitCode: number | undefined }> {
  // Instead of cloning, create a new Command instance for isolation
  const program = new Command();
  // Removed .configureHelp as it's not needed and causing type errors.
  // Commander's parseAsync in a test environment typically doesn't output help unless
  // specific flags are given or no command is matched.
  program.addCommand(validatePacketCommand); 

  let stdoutLines: string[] = [];
  let stderrLines: string[] = [];
  let capturedExitCode: number | undefined = undefined;

  const stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdoutLines.push(chunk.toString());
    return true;
  });
  const stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderrLines.push(chunk.toString());
    return true;
  });
  
  // Mock the setter for process.exitCode
  // Ensure the mock implementation's parameter type matches what process.exitCode setter expects.
  // The setter expects `number | undefined`.
  processExitCodeSpy.mockImplementation((code: string | number | null | undefined) => {
    if (typeof code === 'number') {
      capturedExitCode = code;
    }
  });

  try {
    // Add --json flag if requested
    const finalArgs = jsonOutput ? ['--json', ...args] : args;
    await program.parseAsync(finalArgs, { from: 'user' });
    
    // Ensure exit code is captured if set by the action
    // Note: process.exitCode is a mutable global. After parseAsync, its value should be finalized.
    // We read it directly from process to ensure we capture the final state.
    if (process.exitCode !== undefined && process.exitCode !== null) {
      capturedExitCode = typeof process.exitCode === 'number' ? process.exitCode : parseInt(process.exitCode, 10);
    }

  } catch (error: any) {
    console.error("Error during command execution:", error.message);
  } finally {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
    processExitCodeSpy.mockRestore(); // Restore original mock behavior
  }

  return { stdout: stdoutLines, stderr: stderrLines, exitCode: capturedExitCode };
}

describe('paperclipai issue validate-packet', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockPacketData = {}; // Reset mock packet data
    process.exitCode = undefined; // Clear process.exitCode for a fresh state

    // Ensure mocks are active and restored correctly.
    // Mock the setter for process.exitCode within beforeEach for consistent state.
    // This mock implementation ensures that only valid numbers or undefined are captured.
    jest.spyOn(process, 'exitCode', 'set').mockImplementation((code: number | undefined) => {
      if (code !== null) { // Only assign if not null
        mockExitCode = code;
      }
    });
  });

  afterEach(() => {
    // Restore mocks after each test
    jest.restoreAllMocks();
  });

  it('should validate a ready packet and exit with 0', async () => {
    mockPacketData = {
      title: "Ready Packet",
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "No blockers",
    };

    const { stdout, exitCode } = await runCommand([]);

    expect(exitCode).toBe(0);
    expect(stdout.join('')).toContain('Packet is ready for processing.');
  });

  it('should validate a ready packet with --json flag and exit with 0', async () => {
    mockPacketData = {
      title: "Ready Packet JSON",
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "No blockers",
    };

    const { stdout, exitCode } = await runCommand([], true);

    expect(exitCode).toBe(0);
    expect(stdout.join('')).toContain('"isReady": true');
    expect(stdout.join('')).toContain('"messages": []');
    expect(stdout.join('')).toContain('"title": "Ready Packet JSON"');
  });

  it('should validate a not-ready packet (missing title) and exit with 1', async () => {
    mockPacketData = {
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "No blockers",
    };

    const { stdout, stderr, exitCode } = await runCommand([]);

    expect(exitCode).toBe(1);
    expect(stderr.join('')).toContain('Packet validation failed:');
    expect(stderr.join('')).toContain('- Packet is missing a title.');
    expect(stdout.join('')).not.toContain('Packet is ready for processing.');
  });

  it('should validate a not-ready packet (Annahmen with [NEEDS INPUT]) and exit with 1', async () => {
    mockPacketData = {
      title: "Needs Input Packet",
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "[NEEDS INPUT] - Waiting for user info",
    };

    const { stdout, stderr, exitCode } = await runCommand([]);

    expect(exitCode).toBe(1);
    expect(stderr.join('')).toContain('Packet validation failed:');
    expect(stderr.join('')).toContain("Packet has '[NEEDS INPUT]' in assumptions, indicating it's not ready.");
    expect(stdout.join('')).not.toContain('Packet is ready for processing.');
  });

  it('should validate a not-ready packet with --json flag and exit with 1', async () => {
    mockPacketData = {
      title: "Not Ready JSON",
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "[NEEDS INPUT] - Waiting for user info",
    };

    const { stdout, exitCode } = await runCommand([], true);

    expect(exitCode).toBe(1);
    expect(stdout.join('')).toContain('"isReady": false');
    expect(stdout.join('')).toContain('"messages":');
    expect(stdout.join('')).toContain("Packet has '[NEEDS INPUT]' in assumptions, indicating it's not ready.");
    expect(stdout.join('')).toContain('"title": "Not Ready JSON"');
  });

  // Add more tests for other validation scenarios if implemented
});
