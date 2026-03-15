import { describe, expect, it } from 'vitest';
import { formatCommandCatalog, formatCommandHelp } from '../../src/core/command-catalog';

describe('Agent Vault command catalog', () => {
  it('formats the top-level command catalog with grouped commands', () => {
    const output = formatCommandCatalog();

    expect(output).toContain('Agent Vault automation commands');
    expect(output).toContain('Discovery:');
    expect(output).toContain('- vault - Dispatch Agent Vault commands from a single entrypoint.');
    expect(output).toContain('- vault-doctor - Run a strict Agent Vault health report across note validation.');
    expect(output).toContain('- help - List Agent Vault automation commands or show detailed help for one command.');
    expect(output).toContain('Create Notes:');
    expect(output).toContain('- create-phase - Create a phase folder and phase note with safe defaults and optional previous-phase linkage.');
    expect(output).toContain('- create-decision - Create a decision note and optionally pre-link the related phase, session, and bug notes.');
    expect(output).toContain('- create-step - Create a step note inside an existing phase steps folder.');
    expect(output).toContain('Validate Notes:');
    expect(output).toContain('- validate-all - Run all integrity validators and return a failing exit code if any errors are found.');
  });

  it('formats detailed help for a single command', () => {
    const output = formatCommandHelp('create-step');

    expect(output).toContain('Usage: create-step <phase-number> <step-number> <title>');
    expect(output).toContain('Commands auto-discover `.agent-vault` from the current working directory.');
  });
});
