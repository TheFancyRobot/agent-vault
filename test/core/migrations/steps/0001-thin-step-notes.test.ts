import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { handleMigrateStepNotesCommand } from '../../../../src/core/note-generators';
import { copyTemplate, makeIo } from '../../../helpers';
import {
  applyThinStepNotesMigration,
  detectThinStepNotesMigration,
  thinStepNotesMigration,
} from '../../../../src/core/migrations/steps/0001-thin-step-notes';

const FIXED_NOW = new Date('2026-03-14T15:09:26Z');
const tempRoots: string[] = [];

const createTempVault = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'agent-vault-thin-step-notes-'));
  tempRoots.push(root);
  await mkdir(join(root, '02_Phases', 'Phase_01_Foundation', 'Steps'), { recursive: true });
  await copyTemplate(root, 'Step_Template.md');
  return root;
};

const writeLegacyStep = async (vaultRoot: string, phaseDirectory: string, stepFile: string, stepId: string): Promise<string> => {
  const phaseDirectoryPath = join(vaultRoot, '02_Phases', phaseDirectory);
  const stepsDirectory = join(phaseDirectoryPath, 'Steps');
  await mkdir(stepsDirectory, { recursive: true });
  const phaseNumber = phaseDirectory.match(/^Phase_(\d+)/)?.[1] ?? '01';
  const phasePath = join(phaseDirectoryPath, 'Phase.md');
  if (!existsSync(phasePath)) {
    await writeFile(phasePath, [
      '---',
      'note_type: phase',
      `phase_id: PHASE-${phaseNumber}`,
      'title: Foundation',
      '---',
      '',
      `# Phase ${phaseNumber} Foundation`,
    ].join('\n'), 'utf-8');
  }
  const stepPath = join(stepsDirectory, stepFile);
  await writeFile(stepPath, [
    '---',
    'note_type: step',
    'template_version: 2',
    'contract_version: 1',
    'title: Legacy step',
    `step_id: ${stepId}`,
    `phase: "[[02_Phases/${phaseDirectory}/Phase|Phase 01 Foundation]]"`,
    'status: completed',
    'owner: agent',
    'created: 2026-03-13',
    'updated: 2026-03-13',
    'depends_on: []',
    'related_sessions: []',
    'related_bugs: []',
    'tags:',
    '  - agent-vault',
    '  - step',
    '---',
    '',
    '# Step 02 - Legacy step',
    '',
    'Legacy intro paragraph.',
    '',
    '## Purpose',
    '',
    '- Outcome: Legacy step.',
    '',
    '## Why This Step Exists',
    '',
    '- Because it existed before the split.',
    '',
    '## Prerequisites',
    '',
    '- Install tools.',
    '',
    '## Relevant Code Paths',
    '',
    '- `src/legacy.ts`',
    '',
    '## Required Reading',
    '',
    '- [[01_Architecture/System_Overview|System Overview]]',
    '',
    '## Execution Prompt',
    '',
    '1. Do the legacy thing.',
    '',
    '## Readiness Checklist',
    '',
    '- Ready.',
    '',
    '## Agent-Managed Snapshot',
    '',
    '<!-- AGENT-START:step-agent-managed-snapshot -->',
    '- Status: completed',
    '- Current owner: agent',
    '- Last touched: 2026-03-13',
    '- Next action: none.',
    '<!-- AGENT-END:step-agent-managed-snapshot -->',
    '',
    '## Implementation Notes',
    '',
    '- Found a thing.',
    '',
    '## Human Notes',
    '',
    '- Keep this warning.',
    '',
    '## Session History',
    '',
    '<!-- AGENT-START:step-session-history -->',
    '- No sessions yet.',
    '<!-- AGENT-END:step-session-history -->',
    '',
    '## Outcome Summary',
    '',
    '- It worked.',
  ].join('\n'), 'utf-8');
  return stepPath;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('0001-thin-step-notes migration step', () => {
  it('registers the legacy step-note split as schema migration 0 -> 1', () => {
    expect(thinStepNotesMigration.id).toBe('0001-thin-step-notes');
    expect(thinStepNotesMigration.from_version).toBe(0);
    expect(thinStepNotesMigration.to_version).toBe(1);
    expect(thinStepNotesMigration.category).toBe('safe-confirm');
    expect(thinStepNotesMigration.apply).toBeDefined();
  });

  it('detects legacy step notes but skips already-split notes', async () => {
    const vaultRoot = await createTempVault();
    await writeLegacyStep(vaultRoot, 'Phase_01_Foundation', 'Step_02_legacy-step.md', 'STEP-01-02');
    await writeFile(join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Steps', 'Step_03_thin.md'), [
      '---',
      'note_type: step',
      'title: Thin step',
      'step_id: STEP-01-03',
      'phase: "[[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]]"',
      '---',
      '',
      '# Step 03 - Thin step',
      '',
      '## Companion Notes',
      '',
      '- Already migrated.',
      '',
      '## Implementation Notes',
      '',
      '- This heading alone must not force migration after split.',
    ].join('\n'), 'utf-8');

    await expect(detectThinStepNotesMigration({ vaultRoot })).resolves.toBe(true);
    const plan = await thinStepNotesMigration.plan({ vaultRoot });
    expect(plan.affectedPaths).toEqual(['02_Phases/Phase_01_Foundation/Steps/Step_02_legacy-step.md']);
  });

  it('applies the before-shape fixture into a thin index plus companion notes', async () => {
    const vaultRoot = await createTempVault();
    const stepPath = await writeLegacyStep(vaultRoot, 'Phase_01_Foundation', 'Step_02_legacy-step.md', 'STEP-01-02');

    const result = await applyThinStepNotesMigration({ vaultRoot }, { now: () => FIXED_NOW });

    expect(result.migratedCount).toBe(1);
    expect(result.affectedPaths).toEqual(['02_Phases/Phase_01_Foundation/Steps/Step_02_legacy-step.md']);
    const migrated = await readFile(stepPath, 'utf-8');
    const companionDir = join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Steps', 'Step_02_legacy-step');
    expect(migrated).toContain('## Companion Notes');
    expect(migrated).not.toContain('## Execution Prompt');
    expect(migrated).not.toContain('## Implementation Notes');
    expect(migrated).not.toContain('## Outcome Summary');
    expect(migrated).toContain('- Keep this warning.');
    expect(await readFile(join(companionDir, 'Execution_Brief.md'), 'utf-8')).toContain('## Execution Prompt');
    expect(await readFile(join(companionDir, 'Execution_Brief.md'), 'utf-8')).toContain('Legacy intro paragraph.');
    expect(await readFile(join(companionDir, 'Validation_Plan.md'), 'utf-8')).toContain('## Readiness Checklist');
    expect(await readFile(join(companionDir, 'Implementation_Notes.md'), 'utf-8')).toContain('- Found a thing.');
    expect(await readFile(join(companionDir, 'Outcome.md'), 'utf-8')).toContain('- It worked.');
  });

  it('preserves migrate-step-notes --phase and --step filters through the command wrapper', async () => {
    const vaultRoot = await createTempVault();
    const selected = await writeLegacyStep(vaultRoot, 'Phase_01_Foundation', 'Step_02_legacy-step.md', 'STEP-01-02');
    const skipped = await writeLegacyStep(vaultRoot, 'Phase_02_Other', 'Step_01_other-step.md', 'STEP-02-01');
    const harness = makeIo();

    const exitCode = await handleMigrateStepNotesCommand(
      ['--phase', 'Phase_01_Foundation', '--step', 'STEP-01-02'],
      { vaultRoot, io: harness.io, now: () => FIXED_NOW },
    );

    expect(exitCode).toBe(0);
    expect(await readFile(selected, 'utf-8')).toContain('## Companion Notes');
    expect(await readFile(skipped, 'utf-8')).toContain('## Execution Prompt');
    expect(harness.stdout.some((line) => line.includes('Migrated 1 legacy step note'))).toBe(true);
  });

  it('fails instead of counting a note as migrated when a companion already exists', async () => {
    const vaultRoot = await createTempVault();
    await writeLegacyStep(vaultRoot, 'Phase_01_Foundation', 'Step_02_legacy-step.md', 'STEP-01-02');
    const companionDir = join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Steps', 'Step_02_legacy-step');
    await mkdir(companionDir, { recursive: true });
    await writeFile(join(companionDir, 'Execution_Brief.md'), '# Existing\n', 'utf-8');

    await expect(applyThinStepNotesMigration({ vaultRoot }, { now: () => FIXED_NOW })).rejects.toThrow(/Refusing to overwrite existing note/);
    expect(existsSync(join(companionDir, 'Validation_Plan.md'))).toBe(false);
  });
});
