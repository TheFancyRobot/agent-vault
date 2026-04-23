import { describe, expect, it } from 'vitest';
import { formatCommandCatalog, formatCommandHelp } from '../../src/core/command-catalog';

describe('Agent Vault command catalog', () => {
  it('formats the top-level command catalog with grouped commands', () => {
    const output = formatCommandCatalog();

    expect(output).toContain('Agent Vault commands');
    expect(output).toContain('Discovery:');
    expect(output).toContain('- vault - Dispatch Agent Vault commands from a single entrypoint.');
    expect(output).toContain('- vault-doctor - Run a strict Agent Vault health report across note validation.');
    expect(output).toContain('- help - List Agent Vault automation commands or show detailed help for one command.');
    expect(output).toContain('- lookup-code-graph - Search the machine-readable code graph index without loading the full JSON blob into prompt context.');
    expect(output).toContain('Create Notes:');
    expect(output).toContain('- create-phase - Create a phase folder and phase note with safe defaults and optional previous-phase linkage.');
    expect(output).toContain('- create-decision - Create a decision note and optionally pre-link the related phase, session, and bug notes.');
    expect(output).toContain('- create-step - Create a step note inside an existing phase steps folder.');
    expect(output).toContain('- migrate-step-notes - Split legacy verbose step notes into thin step indexes and refresh compact code-graph artifacts.');
    expect(output).toContain('Validate Notes:');
    expect(output).toContain('- validate-all - Run all integrity validators and return a failing exit code if any errors are found.');
    expect(output).toContain('Advanced/manual context primitives:');
    expect(output).toContain('- save-context (alias: checkpoint)');
    expect(output).toContain('- switch-context (alias: transition)');
    expect(output).toContain('- resume-context (alias: resume-prepare)');
    expect(output).toContain('- prepare-context (alias: compact-research)');
    expect(output).toContain('Normal /vault:* workflow commands remain the primary UX.');
    expect(output).toContain('Use `vault_help` for one command and `vault_traverse` for graph context.');
  });

  it('formats detailed help for a single command', () => {
    const output = formatCommandHelp('create-step');

    expect(output).toContain('Usage: create-step <phase-number> <step-number> <title>');
    expect(output).toContain('Auto-discovers `.agent-vault` from cwd.');
  });

  it('formats detailed help for code-graph lookup', () => {
    const output = formatCommandHelp('lookup-code-graph');

    expect(output).toContain('Usage: lookup-code-graph <query> [--limit <number>] [--path <substring>] [--exports-only]');
    expect(output).toContain('Searches `.agent-vault/08_Automation/code-graph/index.json`.');
  });
});
