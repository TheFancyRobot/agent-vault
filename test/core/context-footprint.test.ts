import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { formatContextFootprintReport, generateContextFootprintReport } from '../../src/core/context-footprint';

const tempRoots: string[] = [];

const createTempRoot = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-context-footprint-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('generateContextFootprintReport', () => {
  it('groups prompt and vault assets into useful categories', async () => {
    const root = await createTempRoot('categories');
    await mkdir(join(root, '.agent-vault', '02_Phases'), { recursive: true });
    await mkdir(join(root, 'pi-package', 'skills', 'vault-execute'), { recursive: true });
    await mkdir(join(root, 'claude-commands'), { recursive: true });

    await writeFile(join(root, 'AGENTS.md'), 'root instructions', 'utf-8');
    await writeFile(join(root, '.agent-vault', 'AGENTS.md'), 'vault operating contract', 'utf-8');
    await writeFile(join(root, '.agent-vault', '02_Phases', 'Phase.md'), 'phase details', 'utf-8');
    await writeFile(join(root, 'pi-package', 'skills', 'vault-execute', 'SKILL.md'), 'skill prompt', 'utf-8');
    await writeFile(join(root, 'claude-commands', 'vault-execute.md'), 'command prompt', 'utf-8');

    const report = await generateContextFootprintReport(root);

    expect(report.totalFiles).toBe(5);
    expect(report.categories.map((category) => category.category).sort()).toEqual([
      'root_instructions',
      'vault_contract',
      'vault_notes',
      'workflow_prompts',
    ]);
    expect(report.topFiles[0]?.chars).toBeGreaterThanOrEqual(report.topFiles[1]?.chars ?? 0);

    const rootInstructions = report.entries.find((entry) => entry.path === 'AGENTS.md');
    const vaultContract = report.entries.find((entry) => entry.path === '.agent-vault/AGENTS.md');
    const phaseNote = report.entries.find((entry) => entry.path === '.agent-vault/02_Phases/Phase.md');
    const skillPrompt = report.entries.find((entry) => entry.path === 'pi-package/skills/vault-execute/SKILL.md');
    const commandPrompt = report.entries.find((entry) => entry.path === 'claude-commands/vault-execute.md');

    expect(rootInstructions?.category).toBe('root_instructions');
    expect(vaultContract?.category).toBe('vault_contract');
    expect(phaseNote?.category).toBe('vault_notes');
    expect(skillPrompt?.category).toBe('workflow_prompts');
    expect(commandPrompt?.category).toBe('workflow_prompts');
  });

  it('formats a readable report with totals, categories, and top files', async () => {
    const root = await createTempRoot('format');
    await mkdir(join(root, '.agent-vault', '02_Phases'), { recursive: true });
    await mkdir(join(root, 'claude-commands'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), 'root instructions', 'utf-8');
    await writeFile(join(root, '.agent-vault', '02_Phases', 'Phase.md'), 'phase details are bigger than root instructions', 'utf-8');
    await writeFile(join(root, 'claude-commands', 'vault-execute.md'), 'command prompt', 'utf-8');

    const report = await generateContextFootprintReport(root);
    const output = formatContextFootprintReport(report);

    expect(output).toContain('Context footprint report');
    expect(output).toContain('Total files: 3');
    expect(output).toContain('workflow_prompts');
    expect(output).toContain('.agent-vault/02_Phases/Phase.md');
  });

  it('ignores irrelevant generated and dependency directories', async () => {
    const root = await createTempRoot('ignore');
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), 'important', 'utf-8');
    await writeFile(join(root, 'node_modules', 'pkg', 'AGENTS.md'), 'ignore me', 'utf-8');
    await writeFile(join(root, 'dist', 'vault-execute.md'), 'ignore me too', 'utf-8');

    const report = await generateContextFootprintReport(root);

    expect(report.totalFiles).toBe(1);
    expect(report.entries.map((entry) => entry.path)).toEqual(['AGENTS.md']);
    expect(report.totalEstimatedTokens).toBeGreaterThan(0);
  });
});
