import { describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const repoRoot = join(import.meta.dirname, '..');

const read = (path: string) => readFile(join(repoRoot, path), 'utf-8');

describe('workflow prompt budgets', () => {
  const budgets = [
    ['pi-package/skills/vault-execute/SKILL.md', 6500],
    ['pi-package/skills/vault-resume/SKILL.md', 5000],
    ['pi-package/skills/vault-orchestrate/SKILL.md', 5000],
    ['claude-commands/vault:execute.md', 6500],
    ['claude-commands/vault:resume.md', 5000],
    ['claude-commands/vault:orchestrate.md', 5000],
  ] as const;

  it.each(budgets)('%s stays within its size budget', async (path, maxChars) => {
    const content = await read(path);
    expect(content.length).toBeLessThanOrEqual(maxChars);
  });

  it('vault-execute still emphasizes narrow target-rooted loading', async () => {
    const [skill, command] = await Promise.all([
      read('pi-package/skills/vault-execute/SKILL.md'),
      read('claude-commands/vault:execute.md'),
    ]);

    for (const content of [skill, command]) {
      expect(content).toContain('target-rooted');
      expect(content).toContain('read only');
      expect(content).toContain('readiness');
    }
  });

  it('vault-resume still limits handoff loading to the latest relevant sections', async () => {
    const [skill, command] = await Promise.all([
      read('pi-package/skills/vault-resume/SKILL.md'),
      read('claude-commands/vault:resume.md'),
    ]);

    for (const content of [skill, command]) {
      expect(content).toContain('Follow-Up Work');
      expect(content).toContain('Completion Summary');
      expect(content).toContain('latest relevant');
      expect(content).toContain('target-rooted');
    }
  });

  it('vault-orchestrate still enforces fresh subagents and no git inside them', async () => {
    const [skill, command] = await Promise.all([
      read('pi-package/skills/vault-orchestrate/SKILL.md'),
      read('claude-commands/vault:orchestrate.md'),
    ]);

    for (const content of [skill, command]) {
      expect(content).toContain('fresh');
      expect(content).toContain('git add');
      expect(content).toContain('vault-execute');
    }
  });
});
