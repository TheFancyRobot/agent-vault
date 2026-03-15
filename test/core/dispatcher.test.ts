import { describe, expect, it } from 'vitest';
import { handleVaultCommand } from '../../src/core/dispatcher';

const makeIo = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    },
  };
};

describe('Agent Vault dispatcher', () => {
  it('prints the command catalog when called without arguments', async () => {
    const harness = makeIo();

    const exitCode = await handleVaultCommand([], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Agent Vault automation commands');
    expect(harness.stdout.join('\n')).toContain('- vault - Dispatch Agent Vault commands from a single entrypoint.');
  });

  it('prints command-specific help through the dispatcher', async () => {
    const harness = makeIo();

    const exitCode = await handleVaultCommand(['help', 'create-decision'], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Usage: create-decision <title> [--decision-id <DEC-0001>] [--phase <related-phase>] [--session <related-session>] [--bug <related-bug>]');
  });

  it('reports unknown commands without dispatching', async () => {
    const harness = makeIo();

    const exitCode = await handleVaultCommand(['missing-command'], { io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stderr).toEqual(['Unknown Agent Vault command: missing-command']);
  });
});
