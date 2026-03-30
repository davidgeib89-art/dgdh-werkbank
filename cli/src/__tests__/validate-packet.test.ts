import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import process from 'process';
import { registerIssueCommands } from '../commands/client/issue.js';
import * as common from '../commands/client/common.js';

// Mock the common module
vi.mock('../commands/client/common.js', async () => {
  const actual = await vi.importActual('../commands/client/common.js');
  return {
    ...(actual as any),
    resolveCommandContext: vi.fn(),
  };
});

// Mock implementations for dependencies
let mockPacketData: any = {};

// Mock the validate-packet module to control getPacketData
vi.mock('../commands/client/validate-packet.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../commands/client/validate-packet.js')>();
  return {
    ...actual,
    getPacketData: vi.fn(() => Promise.resolve(mockPacketData)),
  };
});

describe('paperclipai issue validate-packet', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPacketData = {};
    process.exitCode = undefined;
    (common.resolveCommandContext as any).mockReturnValue({
      api: mockApi,
      companyId: 'test-company',
      json: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  // Helper to run the validate-packet command
  async function runValidatePacket(args: string[], jsonOutput: boolean = false): Promise<{ stdout: string[]; stderr: string[]; exitCode: number | undefined }> {
    const program = new Command();
    registerIssueCommands(program);

    let stdoutLines: string[] = [];
    let stderrLines: string[] = [];

    const stdoutSpy = vi.spyOn(console, 'log').mockImplementation((msg) => {
      stdoutLines.push(String(msg));
    });
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation((msg) => {
      stderrLines.push(String(msg));
    });

    try {
      const finalArgs = ['node', 'test', 'issue', 'validate-packet', ...(jsonOutput ? ['--json'] : []), ...args];
      await program.parseAsync(finalArgs, { from: 'user' });
    } catch (error: any) {
      // Ignore errors from command execution
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }

    return { 
      stdout: stdoutLines, 
      stderr: stderrLines, 
      exitCode: process.exitCode === null ? undefined : (typeof process.exitCode === 'string' ? parseInt(process.exitCode, 10) : process.exitCode) as number | undefined
    };
  }

  it('should validate a ready packet and exit with 0', async () => {
    mockPacketData = {
      title: "Ready Packet",
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "No blockers",
    };

    const { stdout, exitCode } = await runValidatePacket([]);

    expect(exitCode).toBe(0);
    expect(stdout.join('\n')).toContain('Packet is ready for processing.');
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

    const { stdout, exitCode } = await runValidatePacket([], true);

    expect(exitCode).toBe(0);
    const output = stdout.join('\n');
    expect(output).toContain('"isReady": true');
    expect(output).toContain('"messages": []');
    expect(output).toContain('"title": "Ready Packet JSON"');
  });

  it('should validate a not-ready packet (missing title) and exit with 1', async () => {
    mockPacketData = {
      packetType: "free_api",
      executionIntent: "implement",
      status: "todo",
      doneWhen: "Command registered",
      Annahmen: "No blockers",
    };

    const { stdout, stderr, exitCode } = await runValidatePacket([]);

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('Packet validation failed:');
    expect(stderr.join('\n')).toContain('- Packet is missing a title.');
    expect(stdout.join('\n')).not.toContain('Packet is ready for processing.');
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

    const { stdout, stderr, exitCode } = await runValidatePacket([]);

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('Packet validation failed:');
    expect(stderr.join('\n')).toContain("Packet has '[NEEDS INPUT]' in assumptions, indicating it's not ready.");
    expect(stdout.join('\n')).not.toContain('Packet is ready for processing.');
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

    const { stdout, exitCode } = await runValidatePacket([], true);

    expect(exitCode).toBe(1);
    const output = stdout.join('\n');
    expect(output).toContain('"isReady": false');
    expect(output).toContain('"messages":');
    expect(output).toContain("Packet has '[NEEDS INPUT]' in assumptions, indicating it's not ready.");
    expect(output).toContain('"title": "Not Ready JSON"');
  });
});
