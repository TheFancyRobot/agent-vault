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
    ['prompts/vault:execute.md', 6500],
    ['prompts/vault:resume.md', 5000],
    ['prompts/vault:orchestrate.md', 5000],
  ] as const;

  it.each(budgets)('%s stays within its size budget', async (path, maxChars) => {
    const content = await read(path);
    expect(content.length).toBeLessThanOrEqual(maxChars);
  });

  it('vault-execute still emphasizes narrow target-rooted loading', async () => {
    const [skill, command] = await Promise.all([
      read('pi-package/skills/vault-execute/SKILL.md'),
      read('prompts/vault:execute.md'),
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
      read('prompts/vault:resume.md'),
    ]);

    for (const content of [skill, command]) {
      expect(content).toContain('Follow-Up Work');
      expect(content).toContain('Completion Summary');
      expect(content).toContain('latest relevant');
      expect(content).toContain('target-rooted');
    }
  });

  it('vault-orchestrate still enforces fresh subagents and thin targeted worker loading', async () => {
    const [skill, command] = await Promise.all([
      read('pi-package/skills/vault-orchestrate/SKILL.md'),
      read('prompts/vault:orchestrate.md'),
    ]);

    for (const content of [skill, command]) {
      expect(content).toContain('fresh');
      expect(content).toContain('git add');
      expect(content).toContain('vault-execute');
      expect(content).toContain('vault_extract');
      expect(content).toContain('rg');
      expect(content).toContain('grep');
      expect(content).toContain('target-rooted');
    }
  });

  it('vault-plan stays in planning mode and requires durable write-back', async () => {
    const [skill, prompt] = await Promise.all([
      read('pi-package/skills/vault-plan/SKILL.md'),
      read('prompts/vault:plan.md'),
    ]);

    for (const content of [skill, prompt]) {
      expect(content).toContain('Do not implement product or source-code changes outside the vault');
      expect(content).toContain('Report the exact note paths');
      expect(content).toContain('vault_refresh');
      expect(content).toContain('vault_validate');
      expect(content).toContain('If no durable phase or step notes were written');
    }
  });
});
